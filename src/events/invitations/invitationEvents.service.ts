import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { IInvitationEvent } from '../Interfaces/IInvitationEvent';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GameEventService } from '../Games/gamesEvents.service';

@Injectable()
export class InvitationEventService {
  constructor(private readonly prisma: PrismaService) {}
  @Inject(forwardRef(() => UsersService))
  private readonly usersService: UsersService;
  @Inject(forwardRef(() => GameEventService))
  private readonly gameEventService: GameEventService;

  async handleInvitation(
    client: Socket,
    data: IInvitationEvent,
    server: Server,
  ) {
    //* check invitation data validity
    const checkResult = await this.checkInvitationEvent(data, client);
    if (!checkResult) {
      return;
    }
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
    switch (data.eventType) {
      case 'sent':
        await this.createInvitation(client, data, server);
        break;
      case 'accepted':
        await this.acceptInvitation(client, data.invitationId, server);
        break;
      case 'canceled':
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
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    const senderSocket = (await server.fetchSockets()).find(
      (s) => s['user'].id === invitation.fromId,
    );
    if (!senderSocket) {
      client.emit('invitation', {
        eventType: 'error',
        message: "L'expéditeur de l'invitation n'est plus connecté",
        invitationId,
      });
      return;
    }
    const response = await this.prisma.invitation.delete({
      where: { id: invitationId },
    });
    if (!response) {
      client.emit('invitation', {
        eventType: 'error',
        message: "L'acceptation de l'invitation a échoué",
        invitationId,
      });
      return;
    }

    //* create room
    client.join(`${invitation.game}_${invitationId}`);
    senderSocket.join(`${invitation.game}_${invitationId}`);

    try {
      await this.gameEventService.handleGameCreation(
        server,
        invitation.game,
        invitationId,
      );
    } catch {
      const error = {
        eventType: 'error',
        message: 'La création de la partie a échoué',
        invitationId,
      };
      client.emit('invitation', error);
      senderSocket.emit('invitation', error);
      return;
    }

    //* emit game creation
    const accepted = {
      eventType: 'accepted',
      invitationId,
      game: invitation.game,
    };
    client.emit('invitation', accepted);
    senderSocket.emit('invitation', accepted);
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
        return await this.checkSentInvitation(client, data);
      case 'accepted':
        return this.checkAcceptedInvitation(client, data);
      case 'canceled':
        return this.checkCanceledInvitation(client, data);
      default:
        this.throwInvalidEvent(client);
        return false;
    }
  }

  private async checkSentInvitation(client: Socket, data: IInvitationEvent) {
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

    return true;
  }

  private async checkAcceptedInvitation(
    client: Socket,
    data: IInvitationEvent,
  ) {
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
    return true;
  }

  private async checkCanceledInvitation(
    client: Socket,
    data: IInvitationEvent,
  ): Promise<boolean> {
    if (!data.invitationId) {
      this.throwInvalidEvent(client);
      return false;
    }
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: data.invitationId },
    });
    if (!invitation) {
      this.throwInvalidEvent(client);
      return false;
    }
    if (
      invitation.fromId !== client['user'].id &&
      invitation.toId !== client['user'].id
    ) {
      this.throwInvalidEvent(client);
      return false;
    }
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

  private throwInvalidEvent(client: Socket) {
    client.emit('invitation', {
      eventType: 'error',
      error: 'Bad Request',
      message: "Événement d'invitation invalide",
      code: 400,
    });
  }

  private throwUserNotFound(client: Socket) {
    client.emit('invitation', {
      eventType: 'error',
      error: 'Bad Request',
      message: 'Utilisateur introuvable',
      code: 400,
    });
  }

  private throwInvitationAlreadySent(client: Socket, invitationId: number) {
    client.emit('invitation', {
      eventType: 'error',
      error: 'conflict',
      message: 'Une invitation a déjà été envoyée',
      invitationId,
    });
  }

  private throwInvitationAlreadyReceived(client: Socket, invitationId: number) {
    client.emit('invitation', {
      eventType: 'error',
      error: 'conflict',
      message: 'Une invitation a déjà été reçue',
      invitationId,
    });
  }
}
