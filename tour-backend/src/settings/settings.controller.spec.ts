import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SettingsController } from './settings.controller';

type SettingsHandler = keyof Pick<
  SettingsController,
  'getHealth' | 'getAll' | 'getPublic' | 'getFlat' | 'updateMany'
>;

const reflector = new Reflector();

function getHandlerMetadata<T>(handler: SettingsHandler, key: string): T | undefined {
  return reflector.get<T>(key, SettingsController.prototype[handler]);
}

describe('SettingsController authorization metadata', () => {
  it.each<SettingsHandler>(['getHealth', 'getAll', 'getFlat'])(
    'allows only ADMIN and SUPER_ADMIN to call %s',
    (handler) => {
      expect(getHandlerMetadata<string[]>(handler, 'roles')).toEqual([
        'ADMIN',
        'SUPER_ADMIN',
      ]);

      const guards = getHandlerMetadata<unknown[]>(handler, GUARDS_METADATA) ?? [];
      expect(guards).toContain(RolesGuard);
    },
  );

  it('keeps public website settings public', () => {
    expect(getHandlerMetadata('getPublic', 'roles')).toBeUndefined();
    expect(getHandlerMetadata('getPublic', GUARDS_METADATA)).toBeUndefined();
  });

  it('allows ADMIN and SUPER_ADMIN to call updateMany', () => {
    expect(getHandlerMetadata<string[]>('updateMany', 'roles')).toEqual([
      'ADMIN',
      'SUPER_ADMIN',
    ]);

    const guards = getHandlerMetadata<unknown[]>('updateMany', GUARDS_METADATA) ?? [];
    expect(guards).toContain(RolesGuard);
  });
});
