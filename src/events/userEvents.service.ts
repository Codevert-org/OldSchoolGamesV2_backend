import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserEventService {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger('UserEventService');
  @Inject(forwardRef(() => UsersService))
  private readonly usersService: UsersService;

  async handleConnection(client: Socket, server: Server) {
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
      //? cas du user inexistant ?
      //? cas d'une socket déjà connectée avec ce user ?
      client['user'] = user;
      this.logger.log(`User connected : ${user.pseudo}`);

      //? send list of connected users to client
      client.emit('welcome', `welcome ${user.pseudo}`);
      const sockets = (await server.fetchSockets())
        .filter((s) => s['user'] !== undefined && s['user'].id !== user.id)
        .map((s) => s['user']);
      client.emit('userList', sockets);

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

  async handleDisconnect(client: Socket) {
    await this.prisma.invitation.deleteMany({
      where: {
        OR: [{ fromId: client['user']?.id }, { toId: client['user']?.id }],
      },
    });
    const user = client['user'] !== undefined ? client['user'] : 'Unknown user';
    this.logger.log(`${user.pseudo} disconnected`);
    if (client['user'] !== undefined) {
      client.broadcast.emit('users', {
        eventType: 'disconnected',
        user: client['user'].id,
      });
    }
    // TODO search for game rooms of this user and handle game
  }
}
