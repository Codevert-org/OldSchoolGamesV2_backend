import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));
import { EventsGateway } from '../../events/events.gateway';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'node:fs';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  renameSync: jest.fn(),
}));

const VALID_CREDENTIALS = 'P@ssw0rd1';
const WRONG_CREDENTIALS = 'Wr0ngP@ss';
const DIFFERENT_CREDENTIALS = 'D1fferent@';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

const mockEventsGateway = {
  notifyUserRegistered: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const baseBody = {
      pseudo: 'TestUser',
      email: 'test@test.com',
      password: VALID_CREDENTIALS,
      passwordConfirm: VALID_CREDENTIALS,
    };

    it('should throw if password is missing', async () => {
      await expect(
        service.register({ ...baseBody, password: '', passwordConfirm: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if passwords do not match', async () => {
      await expect(
        service.register({
          ...baseBody,
          passwordConfirm: DIFFERENT_CREDENTIALS,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if pseudo is already taken', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 1,
        pseudo: 'TestUser',
      });
      await expect(service.register(baseBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if email is already taken', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, email: 'test@test.com' });
      await expect(service.register(baseBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create user and return accessToken', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        pseudo: 'TestUser',
        avatarUrl: null,
      });

      const result = await service.register(baseBody);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          pseudo: 'TestUser',
          email: 'test@test.com',
          password: 'hashed',
        },
      });
      expect(result.accessToken).toBe('mock-token');
      expect(result.user.pseudo).toBe('TestUser');
    });

    it('should rename avatar file and update user if avatarUrl provided', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 42,
        pseudo: 'TestUser',
        avatarUrl: null,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 42,
        pseudo: 'TestUser',
        avatarUrl: 'user_42_123.png',
      });
      (fs.renameSync as jest.Mock).mockImplementation(() => {});

      const result = await service.register({
        ...baseBody,
        avatarUrl: 'tmp_avatar.png',
      });

      expect(fs.renameSync).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(result.user.avatarUrl).toBe('user_42_123.png');
    });

    it('should return avatarMessage if avatar rename fails', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 42,
        pseudo: 'TestUser',
        avatarUrl: null,
      });
      (fs.renameSync as jest.Mock).mockImplementation(() => {
        throw new Error('rename failed');
      });

      const result = await service.register({
        ...baseBody,
        avatarUrl: 'tmp_avatar.png',
      });

      expect(result.avatarMessage).toBeDefined();
    });
  });

  describe('login', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login('unknown@test.com', VALID_CREDENTIALS),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        pseudo: 'TestUser',
        avatarUrl: null,
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login('test@test.com', WRONG_CREDENTIALS),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use same error message for not found and wrong password (bruteforce-safe)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      let messageNotFound: string | undefined;
      try {
        await service.login('unknown@test.com', VALID_CREDENTIALS);
      } catch (e) {
        messageNotFound = (e as UnauthorizedException).message;
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        pseudo: 'TestUser',
        avatarUrl: null,
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      let messageWrongPw: string | undefined;
      try {
        await service.login('test@test.com', WRONG_CREDENTIALS);
      } catch (e) {
        messageWrongPw = (e as UnauthorizedException).message;
      }

      expect(messageNotFound).toBe(messageWrongPw);
    });

    it('should return accessToken on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        pseudo: 'TestUser',
        avatarUrl: null,
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@test.com', VALID_CREDENTIALS);

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.id).toBe(1);
      expect(result.user.pseudo).toBe('TestUser');
    });
  });
});
