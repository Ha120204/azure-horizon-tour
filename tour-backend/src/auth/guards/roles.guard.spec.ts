import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { SUPER_ADMIN_AREA_KEY } from '../decorators/super-admin-area.decorator';

type ContextOptions = {
  role?: string;
  method?: string;
  grants?: string[];
};

function createContext({ role, method = 'GET', grants }: ContextOptions = {}): ExecutionContext {
  const user = role ? { role, superAdminViewGrants: grants } : undefined;
  return {
    getHandler: () => RolesGuard,
    getClass: () => RolesGuard,
    switchToHttp: () => ({
      getRequest: () => ({ method, ...(user ? { user } : {}) }),
    }),
  } as unknown as ExecutionContext;
}

function createReflector(roles?: string[], area?: string): Reflector {
  return {
    getAllAndOverride: jest.fn((key: string) =>
      key === SUPER_ADMIN_AREA_KEY ? area : roles,
    ),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows routes without role metadata', () => {
    expect(new RolesGuard(createReflector()).canActivate(createContext())).toBe(true);
  });

  it('allows a user with an accepted role', () => {
    const reflector = createReflector(['ADMIN', 'SUPER_ADMIN']);
    expect(new RolesGuard(reflector).canActivate(createContext({ role: 'ADMIN' }))).toBe(true);
  });

  it('denies a user with a role outside the accepted roles', () => {
    const reflector = createReflector(['ADMIN', 'SUPER_ADMIN']);
    expect(new RolesGuard(reflector).canActivate(createContext({ role: 'CUSTOMER' }))).toBe(false);
  });

  it('fails closed when an authenticated user is missing', () => {
    const reflector = createReflector(['ADMIN']);
    expect(new RolesGuard(reflector).canActivate(createContext())).toBe(false);
  });

  describe('SUPER_ADMIN on an operational area', () => {
    it('allows GET when the area is granted', () => {
      const reflector = createReflector(['ADMIN', 'SUPER_ADMIN'], 'bookings');
      const ctx = createContext({ role: 'SUPER_ADMIN', method: 'GET', grants: ['bookings'] });
      expect(new RolesGuard(reflector).canActivate(ctx)).toBe(true);
    });

    it('denies GET when the area is not granted', () => {
      const reflector = createReflector(['ADMIN', 'SUPER_ADMIN'], 'bookings');
      const ctx = createContext({ role: 'SUPER_ADMIN', method: 'GET', grants: [] });
      expect(new RolesGuard(reflector).canActivate(ctx)).toBe(false);
    });

    it('denies writes even when the area is granted (read-only)', () => {
      const reflector = createReflector(['ADMIN', 'SUPER_ADMIN'], 'bookings');
      const ctx = createContext({ role: 'SUPER_ADMIN', method: 'POST', grants: ['bookings'] });
      expect(new RolesGuard(reflector).canActivate(ctx)).toBe(false);
    });
  });

  it('keeps full access for SUPER_ADMIN on governance routes (no area)', () => {
    const reflector = createReflector(['SUPER_ADMIN']);
    const ctx = createContext({ role: 'SUPER_ADMIN', method: 'POST' });
    expect(new RolesGuard(reflector).canActivate(ctx)).toBe(true);
  });
});
