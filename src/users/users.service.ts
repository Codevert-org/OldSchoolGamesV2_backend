import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'node:fs';
import * as bcrypt from 'bcrypt';
import { UpdateMeDTO } from './DTO/updateMe.dto';
import { SALT_ROUNDS } from '../commons/utils/env';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async isPseudoAvailable(pseudo: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { pseudo },
      select: { id: true },
    });
    return user === null;
  }

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

  async updateMe(id: number, updateData: UpdateMeDTO) {
    const prismaData: Record<string, any> = {};

    if (updateData.pseudo) {
      prismaData.pseudo = updateData.pseudo;
    }

    if (updateData.avatarUrl) {
      prismaData.avatarUrl = updateData.avatarUrl;
    }

    if (updateData.newPassword) {
      if (!updateData.oldPassword) {
        throw new BadRequestException(
          'Old password is required for password change',
        );
      }
      if (updateData.newPassword !== updateData.newPasswordConfirm) {
        throw new BadRequestException(
          'New password and its confirmation do not match',
        );
      }
      const currentHash = (
        await this.prisma.user.findUnique({
          where: { id },
          select: { password: true },
        })
      ).password;
      if (!bcrypt.compareSync(updateData.oldPassword, currentHash)) {
        throw new BadRequestException('Old password is incorrect');
      }
      prismaData.password = await bcrypt.hash(
        updateData.newPassword,
        SALT_ROUNDS,
      );
    }

    if (updateData.avatarUrl) {
      const formerAvatarUrl = (
        await this.prisma.user.findUnique({
          where: { id },
          select: { avatarUrl: true },
        })
      ).avatarUrl;
      if (
        formerAvatarUrl &&
        formerAvatarUrl !== updateData.avatarUrl &&
        fs.existsSync(`./assets/user_avatars/${formerAvatarUrl}`)
      ) {
        fs.unlinkSync(`./assets/user_avatars/${formerAvatarUrl}`);
      }
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: prismaData,
        select: {
          id: true,
          pseudo: true,
          avatarUrl: true,
        },
      });
    } catch {
      throw new BadRequestException('Failed to update user');
    }
  }
}
