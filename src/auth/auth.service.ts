import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDTO } from './DTO/register.dto';
import * as bcrypt from 'bcrypt';
import { AuthResponseDTO } from './DTO/auth.dto';
import * as fs from 'node:fs';
import { EventsGateway } from '../events/events.gateway';
import { SALT_ROUNDS } from '../commons/utils/env';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  @Inject(forwardRef(() => EventsGateway))
  private readonly eventsGateway: EventsGateway;

  async register(body: RegisterDTO): Promise<AuthResponseDTO> {
    const { pseudo, email, password, passwordConfirm } = body;
    let avatarMessage: string;

    if (!password || !passwordConfirm) {
      throw new BadRequestException(
        'Le mot de passe et sa confirmation sont requis',
      );
    }
    if (password !== passwordConfirm) {
      throw new BadRequestException(
        'Le mot de passe et sa confirmation ne correspondent pas',
      );
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const pseudoInUse = await this.prisma.user.findFirst({
      where: { pseudo },
    });
    if (pseudoInUse) {
      throw new BadRequestException('pseudo already in use');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('invalid email or password');
    }
    const user = await this.prisma.user.create({
      data: { pseudo, email, password: hash },
    });

    if (body.avatarUrl) {
      try {
        const newAvatarUrl = `user_${user.id}_${Date.now()}${body.avatarUrl.substring(body.avatarUrl.lastIndexOf('.'))}`;
        fs.renameSync(
          `./assets/user_avatars/${body.avatarUrl}`,
          `./assets/user_avatars/${newAvatarUrl}`,
        );
        const updated = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            avatarUrl: newAvatarUrl,
          },
        });
        user.avatarUrl = updated.avatarUrl;
      } catch (e) {
        this.logger.error('Error renaming avatar file', e);
        avatarMessage = 'Avatar upload failed, user created without avatar';
      }
    }
    const responseUser = {
      id: user.id,
      pseudo: user.pseudo,
      avatarUrl: user.avatarUrl,
    };
    this.eventsGateway?.notifyUserRegistered(responseUser);
    return {
      accessToken: this.jwtService.sign({ userId: user.id }),
      avatarMessage: avatarMessage || undefined,
      user: responseUser,
    };
  }

  async login(email: string, password: string): Promise<AuthResponseDTO> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    const isValidPassword =
      user && (await bcrypt.compare(password, user.password));
    if (!isValidPassword) {
      throw new UnauthorizedException('invalid email or password');
    }
    const responseUser = {
      id: user.id,
      pseudo: user.pseudo,
      avatarUrl: user.avatarUrl,
    };
    return {
      accessToken: this.jwtService.sign({ userId: user.id }),
      user: responseUser,
    };
  }
}
