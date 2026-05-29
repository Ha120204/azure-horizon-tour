import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AdminNotificationService } from '../admin-notification/admin-notification.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: {
    verify: jest.Mock;
    sign: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = {
      verify: jest.fn(),
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: { sendPasswordResetEmail: jest.fn() } },
        { provide: AdminNotificationService, useValue: { createSafe: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects refresh tokens when authTokenVersion was revoked', async () => {
    jwtService.verify.mockReturnValue({ sub: 1, tokenVersion: 1 });
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'customer@example.com',
      role: 'CUSTOMER',
      authTokenVersion: 2,
      deletedAt: null,
    });

    await expect(service.refreshToken('refresh-token')).rejects.toThrow(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('issues a new access token using the current authTokenVersion', async () => {
    jwtService.verify.mockReturnValue({ sub: '1', tokenVersion: 2 });
    jwtService.sign.mockReturnValue('new-access-token');
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'customer@example.com',
      role: 'CUSTOMER',
      authTokenVersion: 2,
      deletedAt: null,
    });

    await expect(service.refreshToken('refresh-token')).resolves.toEqual({
      access_token: 'new-access-token',
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 1,
      email: 'customer@example.com',
      role: 'CUSTOMER',
      tokenVersion: 2,
    });
  });

  it('rejects reset password tokens with invalid subject payload', async () => {
    jwtService.verify.mockReturnValue({ sub: 'not-a-user-id' });

    await expect(service.resetPassword('reset-token', 'new-password')).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('increments authTokenVersion when resetting password', async () => {
    jwtService.verify.mockReturnValue({ sub: 7, email: 'customer@example.com' });
    prisma.user.findUnique.mockResolvedValue({ id: 7 });
    prisma.user.update.mockResolvedValue({ id: 7 });

    await expect(service.resetPassword('reset-token', 'new-password')).resolves.toEqual({
      message: 'Password has been reset successfully',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        password: expect.any(String),
        authTokenVersion: { increment: 1 },
        authRevokedAt: expect.any(Date),
      },
    });
  });
});
