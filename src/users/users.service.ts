import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

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
    // check for password update
    if (
      updateData.newPassword &&
      updateData.newPassword !== updateData.newPasswordConfirm
    ) {
      throw new BadRequestException(
        'New password and its confirmation do not match',
      );
    }
    if (updateData.newPassword && !updateData.oldPassword) {
      throw new BadRequestException(
        'Old password is required for password change',
      );
    }
    if (
      updateData.oldPassword &&
      updateData.newPassword &&
      updateData.newPassword === updateData.newPasswordConfirm
    ) {
      const actualcrypt = (
        await this.prisma.user.findUnique({
          where: { id },
          select: { password: true },
        })
      ).password;
      if (bcrypt.compareSync(updateData.oldPassword, actualcrypt) === false) {
        throw new BadRequestException('Old password is incorrect');
      }
      updateData.password = await bcrypt.hash(
        updateData.newPassword,
        parseInt(process.env.SALT_ROUNDS),
      );
      delete updateData.newPassword;
      delete updateData.newPasswordConfirm;
      delete updateData.oldPassword;
    }
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
