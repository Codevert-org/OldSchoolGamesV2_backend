import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

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

  async updateMe(id: number, updateData: any) {
    try {
      if (updateData.avatarUrl) {
        const formerAvatarUrl = (
          await this.prisma.user.findUnique({
            where: { id },
            select: { avatarUrl: true },
          })
        ).avatarUrl;
        if (formerAvatarUrl && formerAvatarUrl !== updateData.avatarUrl) {
          // Delete the old avatar file if needed
          fs.unlinkSync(`./assets/user_avatars/${formerAvatarUrl}`);
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          pseudo: true,
          avatarUrl: true,
        },
      });
      return updatedUser;
    } catch {
      throw new BadRequestException('Failed to update user');
    }
  }
}
