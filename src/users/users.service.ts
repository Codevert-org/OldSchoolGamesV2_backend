import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOne(id: number) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          pseudo: true,
          avatarUrl: true,
        },
      });
      return user;
    } catch {
      throw new BadRequestException('User not found');
    }
  }
}
