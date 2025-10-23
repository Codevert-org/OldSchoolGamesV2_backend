import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { IInvitationEvent } from './Interfaces/IInvitationEvent';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvitationEventService {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('UserEventService');
  @Inject(forwardRef(() => UsersService))
  private readonly usersService: UsersService;

  async handleInvitation(
    client: Socket,
    data: IInvitationEvent,
    server: Server,
  ) {
    //* check invitation data validity
    const checkResult = await this.checkInvitationEvent(data, client);
    if (!checkResult) {
      this.logger.warn('invitation is not valid');
      return;
    }
    this.logger.log('invitation is valid');
    //* build invitation
    return this.buildInvitation(client, data, server);
  }

  /**
   * * invitation builder functions
   */

  async buildInvitation(
    client: Socket,
    data: IInvitationEvent,
    server: Server,
  ) {
    this.logger.log('handleSentInvitation');
    switch (data.eventType) {
      case 'sent':
        this.logger.log('create invitation');
        await this.createInvitation(client, data, server);
        break;
      case 'accepted':
        this.logger.log('accept invitation');
        await this.acceptInvitation(client, data.invitationId, server);
        break;
      case 'canceled':
        this.logger.log('cancel invitation');
        await this.deleteInvitation(client, data.invitationId, server);
        break;
      default:
        this.throwInvalidEvent(client);
        return;
    }
  }

  async createInvitation(
    client: Socket,
    data: IInvitationEvent,
    server: Server,
  ) {
    const response = await this.prisma.invitation.create({
      data: {
        fromId: client['user'].id,
        toId: data.toId,
        game: data.game,
      },
    });
    this.logger.log('invitation created ? :', response);
    if (!response) {
      client.emit('invitation', 'Invitation failed!');
    }
    client.emit('invitation', {
      eventType: 'created',
      toId: data.toId,
      invitationId: response.id,
    });
    //* notify recipient if online
    const recipientSocket = (await server.fetchSockets()).find(
      (s) => s['user'].id === data.toId,
    );
    if (recipientSocket) {
      recipientSocket.emit('invitation', {
        eventType: 'received',
        fromId: client['user'].id,
        invitationId: response.id,
        game: data.game,
      });
    }
  }

  async deleteInvitation(client: Socket, invitationId: number, server: Server) {
    const response = await this.prisma.invitation.delete({
      where: { id: invitationId },
    });
    this.logger.log('invitation deleted ? :', response);
    if (!response) {
      client.emit('invitation', {
        eventType: 'error',
        message: `Invitation ${invitationId} deletion failed!`,
      });
    }
    client.emit('invitation', {
      eventType: 'canceled',
      invitationId,
    });
    const otherUserId =
      response.toId === client['user'].id ? response.fromId : response.toId;
    const otherUserSocket = (await server.fetchSockets()).find(
      (s) => s['user'].id === otherUserId,
    );
    if (otherUserSocket) {
      otherUserSocket.emit('invitation', {
        eventType: 'canceled',
        invitationId,
      });
    }
  }

  async acceptInvitation(client: Socket, invitationId: number, server: Server) {
    //* delete invitation ( return if deletion failed )
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    //? check if invitation exists ?
    const senderSocket = (await server.fetchSockets()).find(
      (s) => s['user'].id === invitation.fromId,
    );
    const response = await this.prisma.invitation.delete({
      where: { id: invitationId },
    });
    this.logger.log('invitation deleted ? :', response);
    if (!response) {
      client.emit('invitation', {
        eventType: 'error',
        message: `Invitation ${invitationId} acceptation failed!`,
      });
      return;
    }

    //* create room
    client.join(`${invitationId}`);
    //? handle sender not found or not connected ?
    senderSocket.join(`${invitationId}`);

    //? check if users are still available ( not in game, not disconnected )

    //? create game instance and add to room

    // TODO create game instance
    //* emit game creation
    client.emit('invitation', {
      eventType: 'accepted',
      invitationId,
    });
    if (senderSocket) {
      senderSocket.emit('invitation', {
        eventType: 'accepted',
        invitationId,
      });
    }

    server.to(`${invitationId}`).emit('message', 'Game successfully created!');

    //? how to close game :
    // make all Socket instances in the room leave the room
    //server.socketsLeave(`${invitationId}`);
  }

  /**
   * * check functions
   */

  private async checkInvitationEvent(
    data: IInvitationEvent,
    client: Socket,
  ): Promise<boolean> {
    switch (data.eventType) {
      case 'sent':
        return await this.checkSentIinvtation(client, data);
      case 'accepted':
        return this.checkAcceptedIinvtation(client, data);
      case 'canceled':
        return this.checkCanceledIinvtation();
      default:
        this.throwInvalidEvent(client);
        return false;
    }
  }

  private async checkSentIinvtation(client: Socket, data: IInvitationEvent) {
    this.logger.log('checkSentIinvtation');
    const result = true;
    if (!data.toId || data.toId == client['user'].id) {
      this.throwInvalidEvent(client);
      return false;
    }
    if (!data.game) {
      this.throwInvalidEvent(client);
      return false;
    }
    const user = await this.checkUserExists(data.toId);
    if (!user) {
      this.logger.log('user not found');
      this.throwUserNotFound(client);
      return false;
    }

    //* invitation already sent
    const existingInvitationTo = await this.prisma.invitation.findFirst({
      where: { fromId: client['user'].id, toId: data.toId },
    });
    if (existingInvitationTo) {
      this.throwInvitationAlreadySent(client, existingInvitationTo.id);
      return false;
    }
    //* player already received invitation
    const existingInvitationFrom = await this.prisma.invitation.findFirst({
      where: { fromId: data.toId, toId: client['user'].id },
    });
    if (existingInvitationFrom) {
      this.throwInvitationAlreadyReceived(client, existingInvitationFrom.id);
      return false;
    }

    return result;
  }

  private async checkAcceptedIinvtation(
    client: Socket,
    data: IInvitationEvent,
  ) {
    this.logger.log('checkAcceptedIinvtation');
    const result = true;
    //* check data validity
    if (!data.invitationId) {
      this.throwInvalidEvent(client);
      return false;
    }
    //* check if invitation exists
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        OR: [
          { fromId: data.fromId, toId: client['user'].id },
          { id: data.invitationId },
        ],
      },
    });
    if (!invitation) {
      this.throwInvalidEvent(client);
      return false;
    }
    //* check if client is the toId of the invitation
    if (invitation.toId !== client['user'].id) {
      this.throwInvalidEvent(client);
      return false;
    }
    //* check if fromId and toId users exist
    const fromUserExists = await this.checkUserExists(invitation.fromId);
    const toUserExists = await this.checkUserExists(invitation.toId);
    if (!fromUserExists || !toUserExists) {
      this.throwUserNotFound(client);
      return false;
    }
    return result;
  }

  // TODO check cancelation validity
  private async checkCanceledIinvtation(): Promise<boolean> {
    this.logger.log('checkCanceledIinvtation');
    return true;
  }

  private async checkUserExists(userId: number): Promise<boolean> {
    try {
      await this.usersService.getOne(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * * Error events
   */

  //? refactor error handling ( throw functions )
  private throwInvalidEvent(client: Socket) {
    this.logger.log('invalid event type');
    client.emit('invitation', {
      eventType: 'error',
      error: 'Bad Request',
      message: 'Invalid invitation event type',
      code: 400,
    });
  }

  private throwUserNotFound(client: Socket) {
    this.logger.log('user not found');
    client.emit('invitation', {
      eventType: 'error',
      error: 'Bad Request',
      message: 'user not found',
      code: 400,
    });
  }

  private throwInvitationAlreadySent(client: Socket, invitationId: number) {
    this.logger.warn('invitation already sent');
    client.emit('invitation', {
      eventType: 'error',
      error: 'conflict',
      message: 'invitation already sent',
      invitationId,
    });
  }

  private throwInvitationAlreadyReceived(client: Socket, invitationId: number) {
    this.logger.warn('invitation already recieved');
    client.emit('invitation', {
      eventType: 'error',
      error: 'conflict',
      message: 'invitation already received',
      invitationId,
    });
  }
}
