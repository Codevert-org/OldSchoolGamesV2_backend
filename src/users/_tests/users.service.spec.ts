import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));
import * as bcrypt from 'bcrypt';
import * as fs from 'node:fs';

jest.mock('bcrypt', () => ({
  compareSync: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  gameMatch: {
    findMany: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('isPseudoAvailable', () => {
    it('should return true if pseudo is free', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await service.isPseudoAvailable('freeUser')).toBe(true);
    });

    it('should return false if pseudo is taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      expect(await service.isPseudoAvailable('takenUser')).toBe(false);
    });
  });

  describe('getOne', () => {
    it('should return user if found', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        pseudo: 'TestUser',
        avatarUrl: null,
      });
      const user = await service.getOne(1);
      expect(user.id).toBe(1);
      expect(user.pseudo).toBe('TestUser');
    });

    it('should throw BadRequestException if not found', async () => {
      mockPrisma.user.findUniqueOrThrow.mockRejectedValue(
        new Error('not found'),
      );
      await expect(service.getOne(999)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMe', () => {
    it('should update pseudo', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        pseudo: 'NewPseudo',
        avatarUrl: null,
      });
      const result = await service.updateMe(1, { pseudo: 'NewPseudo' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pseudo: 'NewPseudo' }),
        }),
      );
      expect(result.pseudo).toBe('NewPseudo');
    });

    it('should throw if newPassword provided without oldPassword', async () => {
      await expect(
        service.updateMe(1, {
          newPassword: 'N3wP@ss1',
          newPasswordConfirm: 'N3wP@ss1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if newPassword and confirmation do not match', async () => {
      await expect(
        service.updateMe(1, {
          newPassword: 'N3wP@ss1',
          newPasswordConfirm: 'D1fferent@',
          oldPassword: '0ldP@ss1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if oldPassword is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ password: 'hashed' });
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);
      await expect(
        service.updateMe(1, {
          newPassword: 'N3wP@ss1',
          newPasswordConfirm: 'N3wP@ss1',
          oldPassword: 'Wr0ngP@ss',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update password if oldPassword is correct', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ password: 'hashed' });
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashed');
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        pseudo: 'TestUser',
        avatarUrl: null,
      });

      await service.updateMe(1, {
        newPassword: 'N3wP@ss1',
        newPasswordConfirm: 'N3wP@ss1',
        oldPassword: '0ldP@ss1',
      });

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: 'newHashed' }),
        }),
      );
    });

    it('should delete old avatar file if it exists and differs from new one', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        avatarUrl: 'old_avatar.png',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        pseudo: 'TestUser',
        avatarUrl: 'new_avatar.png',
      });

      await service.updateMe(1, { avatarUrl: 'new_avatar.png' });

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        './assets/user_avatars/old_avatar.png',
      );
    });

    it('should not delete avatar if file does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        avatarUrl: 'old_avatar.png',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        pseudo: 'TestUser',
        avatarUrl: 'new_avatar.png',
      });

      await service.updateMe(1, { avatarUrl: 'new_avatar.png' });

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if prisma update fails', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('conflict'));
      await expect(
        service.updateMe(1, { pseudo: 'TakenPseudo' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    const userId = 1;
    const baseMatch = {
      winnerId: null,
      loserId: null,
      draw: false,
      game: 'morpion',
      date: new Date(),
    };

    it('should return correct win/loss/draw counts for week period', async () => {
      mockPrisma.gameMatch.findMany.mockResolvedValue([
        { ...baseMatch, winnerId: userId, game: 'morpion' },
        { ...baseMatch, loserId: userId, game: 'puissance4' },
        { ...baseMatch, draw: true, game: 'reversi' },
      ]);

      const result = await service.getStats(userId, { period: 'week' });

      expect(result.global.wins).toBe(1);
      expect(result.global.losses).toBe(1);
      expect(result.global.draws).toBe(1);
      expect(result.global.total).toBe(3);
    });

    it('should compute ratio correctly', async () => {
      mockPrisma.gameMatch.findMany.mockResolvedValue([
        { ...baseMatch, winnerId: userId },
        { ...baseMatch, winnerId: userId },
        { ...baseMatch, loserId: userId },
        { ...baseMatch, loserId: userId },
      ]);

      const result = await service.getStats(userId, { period: 'month' });

      expect(result.global.ratio).toBe(50);
    });

    it('should return 0 ratio if no matches', async () => {
      mockPrisma.gameMatch.findMany.mockResolvedValue([]);

      const result = await service.getStats(userId, { period: 'year' });

      expect(result.global.total).toBe(0);
      expect(result.global.ratio).toBe(0);
    });

    it('should aggregate stats by game', async () => {
      mockPrisma.gameMatch.findMany.mockResolvedValue([
        { ...baseMatch, winnerId: userId, game: 'morpion' },
        { ...baseMatch, winnerId: userId, game: 'morpion' },
        { ...baseMatch, loserId: userId, game: 'reversi' },
      ]);

      const result = await service.getStats(userId, { period: 'week' });

      expect(result.byGame['morpion'].wins).toBe(2);
      expect(result.byGame['reversi'].losses).toBe(1);
      expect(result.byGame['puissance4'].total).toBe(0);
    });

    it('should use correct startDate for week period (Monday)', async () => {
      mockPrisma.gameMatch.findMany.mockResolvedValue([]);
      await service.getStats(userId, { period: 'week' });

      const call = mockPrisma.gameMatch.findMany.mock.calls[0][0];
      const startDate: Date = call.where.date.gte;
      expect(startDate.getDay()).toBe(1);
    });

    it('should use correct startDate for month period (first day)', async () => {
      mockPrisma.gameMatch.findMany.mockResolvedValue([]);
      await service.getStats(userId, { period: 'month' });

      const call = mockPrisma.gameMatch.findMany.mock.calls[0][0];
      const startDate: Date = call.where.date.gte;
      expect(startDate.getDate()).toBe(1);
    });

    it('should use correct startDate for year period (Jan 1)', async () => {
      mockPrisma.gameMatch.findMany.mockResolvedValue([]);
      await service.getStats(userId, { period: 'year' });

      const call = mockPrisma.gameMatch.findMany.mock.calls[0][0];
      const startDate: Date = call.where.date.gte;
      expect(startDate.getMonth()).toBe(0);
      expect(startDate.getDate()).toBe(1);
    });
  });
});
