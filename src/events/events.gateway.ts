import { Injectable, Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserEventService } from './userEvents.service';
import { InvitationEventService } from './invitationEvents.service';

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
  ) {}
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('EventsGateway');

  afterInit() {
    this.logger.log('Events gateway started');
  }

  async handleConnection(client: Socket) {
    return this.userEventService.handleConnection(client, this.server);
  }

  handleDisconnect(client: Socket) {
    return this.userEventService.handleDisconnect(client);
  }

  @SubscribeMessage('invitation')
  async handleInvitation(
    client: Socket,
    data: {
      eventType: 'sent' | 'accepted' | 'canceled';
      fromId?: number;
      toId?: number;
      game: string;
    },
  ) {
    return this.invitationEventService.handleInvitation(
      client,
      data,
      this.server,
    );
  }
}
