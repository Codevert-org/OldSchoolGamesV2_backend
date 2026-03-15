import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'node:fs';
import * as bcrypt from 'bcrypt';
import { UpdateMeDTO } from './DTO/updateMe.dto';
import { SALT_ROUNDS } from '../commons/utils/env';
import { GetStatsDto } from './DTO/getStats.dto';

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

  async getStats(userId: number, { period }: GetStatsDto) {
    const now = new Date();
    let startDate: Date;
    if (period === 'week') {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const matches = await this.prisma.gameMatch.findMany({
      where: {
        date: { gte: startDate },
        OR: [{ winnerId: userId }, { loserId: userId }, { draw: true }],
      },
    });

    const aggregate = (list: typeof matches) => {
      const wins = list.filter((m) => m.winnerId === userId).length;
      const losses = list.filter((m) => m.loserId === userId).length;
      const draws = list.filter((m) => m.draw).length;
      const total = wins + losses + draws;
      return { total, wins, losses, draws, ratio: total > 0 ? Math.round((wins / total) * 100) : 0 };
    };

    const games = ['morpion', 'puissance4', 'reversi'];
    const byGame = Object.fromEntries(
      games.map((g) => [g, aggregate(matches.filter((m) => m.game === g))]),
    );

    return { global: aggregate(matches), byGame };
  }
}
