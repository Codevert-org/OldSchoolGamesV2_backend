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
      this.handleUserList(client, server);

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
    //* delete invitations from this user
    await this.prisma.invitation.deleteMany({
      where: { fromId: client['user']?.id },
    });
    // TODO Send canceled invitations to involved users

    // TODO search for game rooms of this user and handle game
  }

  async handleUserList(client: Socket, server: Server) {
    const sockets = (await server.fetchSockets())
      .filter((s) => s['user'] !== undefined)
      .map((s) => s['user']);
    //* add invite receivedd
    const invitations = await this.prisma.invitation.findMany({
      where: {
        toId: client['user'].id,
      },
    });
    for (const invitation of invitations) {
      const inviter = sockets.find((u) => u.id === invitation.fromId);
      if (inviter) {
        inviter.invite = 'from';
        inviter.invitationId = invitation.id;
      }
    }
    client.emit('userList', sockets);
  }
}
