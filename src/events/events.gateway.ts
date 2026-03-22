import { Injectable, Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserEventService } from './users/userEvents.service';
import { InvitationEventService } from './invitations/invitationEvents.service';
import { GameEventService } from './Games/gamesEvents.service';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { GameEventDto } from './DTO/gameEvent.dto';
import { InvitationEventDto } from './DTO/invitationEvent.dto';

function buildWsErrorMessage(errors: ValidationError[]): string {
  const unexpected = errors
    .filter((e) => e.constraints?.whitelistValidation)
    .map((e) => e.property);
  const invalid = errors
    .filter((e) => !e.constraints?.whitelistValidation)
    .map((e) => e.property);
  const parts = ['Données incorrectes.'];
  if (unexpected.length > 0) {
    parts.push(`Propriétés inattendues : ${unexpected.join(', ')}`);
  }
  if (invalid.length > 0) {
    parts.push(`Données invalides : ${invalid.join(', ')}`);
  }
  return parts.join('\n');
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/events',
})
export class EventsGateway {
  constructor(
    private readonly userEventService: UserEventService,
    private readonly invitationEventService: InvitationEventService,
    private readonly gameEventService: GameEventService,
  ) {}
  @WebSocketServer() server: Server;
  private readonly logger: Logger = new Logger('EventsGateway');

  afterInit() {
    this.logger.log('Events gateway started');
  }

  async handleConnection(client: Socket) {
    return this.userEventService.handleConnection(client, this.server);
  }

  handleDisconnect(client: Socket) {
    return this.userEventService.handleDisconnect(client, this.server);
  }

  notifyUserRegistered(user: {
    id: number;
    pseudo: string;
    avatarUrl: string;
  }) {
    this.server.emit('users', { eventType: 'registered', user });
  }

  @SubscribeMessage('userList')
  async handleUserList(client: Socket) {
    return this.userEventService.handleUserList(client, this.server);
  }

  @SubscribeMessage('invitation')
  async handleInvitation(client: Socket, data: unknown) {
    const dto = plainToInstance(InvitationEventDto, data);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      client.emit('error', { message: buildWsErrorMessage(errors) });
      return;
    }
    return this.invitationEventService.handleInvitation(
      client,
      dto,
      this.server,
    );
  }

  @SubscribeMessage('game')
  async handleGame(socket: Socket, data: unknown) {
    const dto = plainToInstance(GameEventDto, data);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      socket.emit('error', { message: buildWsErrorMessage(errors) });
      return;
    }
    return this.gameEventService.handleGameEvent(socket, this.server, dto);
  }
}
