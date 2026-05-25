import { BadRequestException } from '@nestjs/common';
import {
  calculateBookingHoldExpiresAt,
  IN_STORE_OPERATIONAL_CUTOFF_HOURS,
} from './booking-helpers';

describe('calculateBookingHoldExpiresAt', () => {
  const now = new Date('2026-05-23T10:00:00.000Z');

  it('keeps PayOS holds short', () => {
    const departureDate = new Date('2026-05-25T10:00:00.000Z');

    expect(
      calculateBookingHoldExpiresAt({ paymentMethod: 'PAYOS', departureDate, now }),
    ).toEqual(new Date('2026-05-23T10:15:00.000Z'));
  });

  it('caps in-store holds at 24 hours for far departures', () => {
    const departureDate = new Date('2026-05-30T10:00:00.000Z');

    expect(
      calculateBookingHoldExpiresAt({ paymentMethod: 'IN_STORE', departureDate, now }),
    ).toEqual(new Date('2026-05-24T10:00:00.000Z'));
  });

  it('caps in-store holds before the operational cutoff for near departures', () => {
    const departureDate = new Date('2026-05-24T12:00:00.000Z');
    const expected = new Date(
      departureDate.getTime() - IN_STORE_OPERATIONAL_CUTOFF_HOURS * 60 * 60 * 1000,
    );

    expect(
      calculateBookingHoldExpiresAt({ paymentMethod: 'IN_STORE', departureDate, now }),
    ).toEqual(expected);
  });

  it('rejects in-store payment when the operational cutoff has passed', () => {
    const departureDate = new Date('2026-05-23T15:00:00.000Z');

    expect(() =>
      calculateBookingHoldExpiresAt({ paymentMethod: 'IN_STORE', departureDate, now }),
    ).toThrow(BadRequestException);
  });
});
