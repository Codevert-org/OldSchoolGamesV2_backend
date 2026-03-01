import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  private readonly logger = new Logger('UserEventService');
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
      this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      const decodedToken = this.jwtService.decode(token);
      const user = await this.usersService.getOne(decodedToken?.['userId']);
      //? cas du user inexistant ?
      //? cas d'une socket déjà connectée avec ce user ?
      client['user'] = user;
      this.logger.log(`User connected : ${user.pseudo}`);

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
    if (client['user'] === undefined) {
      this.logger.log('Unknown user disconnected');
      return;
    }
    await this.prisma.invitation.deleteMany({
      where: {
        OR: [{ fromId: client['user'].id }, { toId: client['user'].id }],
      },
    });
    client.broadcast.emit('users', {
      eventType: 'disconnected',
      user: client['user'].id,
    });
    this.logger.log(`${client['user'].pseudo} disconnected`);
    // TODO search for game rooms of this user and handle game
  }

  async handleUserList(client: Socket, server: Server) {
    const sockets = (await server.fetchSockets())
      .filter((s) => s['user'] !== undefined)
      .map((s) => s['user']);
    const user = client['user'];
    if (!user) {
      return;
    }
    const invitations = await this.prisma.invitation.findMany({
      where: { toId: user.id },
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
