import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function createContext(role?: string): ExecutionContext {
  return {
    getHandler: () => RolesGuard,
    getClass: () => RolesGuard,
    switchToHttp: () => ({
      getRequest: () => (role ? { user: { role } } : {}),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows routes without role metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(createContext())).toBe(true);
  });

  it('allows a user with an accepted role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'SUPER_ADMIN']),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(createContext('ADMIN'))).toBe(true);
  });

  it('denies a user with a role outside the accepted roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'SUPER_ADMIN']),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(createContext('CUSTOMER'))).toBe(false);
  });

  it('fails closed when an authenticated user is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(createContext())).toBe(false);
  });
});
