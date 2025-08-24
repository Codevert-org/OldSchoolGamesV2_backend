import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/events',
})
export class EventsGateway {
  @Inject(forwardRef(() => UsersService))
  private readonly usersService: UsersService;
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('EventsGateway');

  // private messageTypes = ['movies', 'users', 'team'];
  // private messageContents = {
  //   movies: [
  //     'Un nouveau film correspondant à vos préférences a été ajouté : Happiness therapy.',
  //     'Un nouveau film accessible a été ajouté : Intouchable.',
  //     'Quelqu\'un a laissé un commentaire sur la vidéo "La ligne verte" où vous avez aussi commenté.',
  //   ],
  //   users: [
  //     'lokko vient de se connecter',
  //     'Whitedog44 vient de se déconnecter',
  //     'Un nouvel utilisateur a rejoint StreamAccess : JohnDoe',
  //   ],
  //   team: [
  //     'Le thème par défaut a été mis à jour',
  //     'Opération de maintenance prévue ce soir à 23h, le site sera temporairement indisponible',
  //   ],
  // };

  // sleep(ms: number) {
  //   return new Promise((resolve) => setTimeout(resolve, ms));
  // }

  // async randomMessage() {
  //   let delay = 0;
  //   let messageType;
  //   let messageContent;
  //   while (true) {
  //     delay = Math.floor(Math.random() * 20000);
  //     await this.sleep(delay);
  //     messageType = this.messageTypes[Math.floor(Math.random() * 3)];
  //     messageContent =
  //       this.messageContents[messageType][
  //         Math.floor(Math.random() * this.messageContents[messageType].length)
  //       ];
  //     this.server.emit(messageType, messageContent);
  //   }
  // }

  afterInit() {
    this.logger.log('Events gateway started');
    //this.randomMessage();
  }

  async handleConnection(client: Socket) {
    let token: string;
    if (client.handshake.headers['authorization'] !== undefined) {
      this.logger.log('token set from headers');
      token = client.handshake.headers.authorization.split(' ')[1];
    }
    if (client.handshake.auth['token'] !== undefined) {
      this.logger.log('token set from auth');
      token = client.handshake.auth['token'];
    }
    if (token === undefined) {
      this.logger.log('no token provided');
      client.emit('error', {
        error: 'Unauthorized',
        message: 'no token provided',
        code: 401,
      });
      client.disconnect();
      return;
    }
    try {
      new JwtService().verify(token, { secret: process.env.JWT_SECRET });
      const decodedToken = new JwtService().decode(token);
      const user = await this.usersService.getOne(decodedToken?.['userId']);
      // TODO cas du user inexistant
      // TODO cas d'une socket déjà connectée avec ce user
      client['user'] = user;
      this.logger.log(`User connected : ${user.pseudo}`);

      //? send list of connected users to client
      client.emit('welcome', `welcome ${user.pseudo}`);
      const sockets = (await this.server.fetchSockets())
        .filter((s) => s['user'] !== undefined && s['user'].id !== user.id)
        .map((s) => s['user']);
      client.emit('userList', sockets);

      // const userList = Array.from(client.nsp.server.sockets.sockets)
      //   .map((s) => (s[1]['user'] ? s[1]['user'] : undefined))
      //   .filter((u) => u !== undefined);
      // client.emit('welcome', { users: userList });

      // TODO control for status visibility in user settings
      client.broadcast.emit('users', { eventType: 'connected', user });
    } catch {
      client.emit('error', {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        code: 401,
      });
      client.disconnect();
    }
  }

  handleDisconnect(client) {
    const user = client.user !== undefined ? client.user : 'Unknown user';
    this.logger.log(`${user.pseudo} disconnected`);
    if (client.user !== undefined) {
      client.broadcast.emit('users', {
        eventType: 'diconnected',
        user: client.user.id,
      });
    }
  }

  @SubscribeMessage('message')
  handleEvent(client: Socket, data: unknown) {
    this.logger.log('message received', data);
    client.emit('message', 'aknowledged');
    //? return { event: 'message', data: 'aknowledged' };
  }
}
