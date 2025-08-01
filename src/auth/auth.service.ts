import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDTO } from './DTO/register.dto';
import * as bcrypt from 'bcrypt';
import { AuthResponseDTO } from './DTO/auth.dto';
import * as fs from 'fs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: RegisterDTO): Promise<AuthResponseDTO> {
    const { pseudo, email, password } = body;
    let avatarMessage: string;
    //console.log('avatarUrl', body.avatarUrl);
    const hash = await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS));
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
        fs.renameSync(
          `./assets/user_avatars/${body.avatarUrl}`,
          `./assets/user_avatars/user_${user.id}${body.avatarUrl.substring(body.avatarUrl.lastIndexOf('.'))}`,
        );
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            avatarUrl: `user_${user.id}${body.avatarUrl.substring(body.avatarUrl.lastIndexOf('.'))}`,
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error renaming avatar file:', e);
      }
    }
    return {
      accessToken: this.jwtService.sign({ userId: user.id }),
      avatarMessage: avatarMessage || undefined,
    };
  }

  async login(email: string, password: string): Promise<AuthResponseDTO> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    const isValidPassword = !user
      ? false
      : await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('invalid email or password');
    }
    return { accessToken: this.jwtService.sign({ userId: user.id }) };
  }
}
