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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: RegisterDTO): Promise<AuthResponseDTO> {
    const { pseudo, email, password } = body;
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
    return { accessToken: this.jwtService.sign({ userId: user.id }) };
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
