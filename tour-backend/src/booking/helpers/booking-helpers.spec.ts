import { BadRequestException } from '@nestjs/common';
import {
  calculateBookingHoldExpiresAt,
  IN_STORE_OPERATIONAL_CUTOFF_HOURS,
  releaseSeats,
  reserveSeatsAtomically,
  SeatsUnavailableException,
} from './booking-helpers';
import type { Prisma } from '@prisma/client';

function createSeatReservationTx({
  tourCount = 1,
  departureCount = 1,
}: {
  tourCount?: number;
  departureCount?: number;
}) {
  const tourUpdate = jest.fn().mockResolvedValue({});
  const tourUpdateMany = jest.fn().mockResolvedValue({ count: tourCount });
  const departureUpdateMany = jest.fn().mockResolvedValue({ count: departureCount });
  const tourFindUnique = jest.fn().mockResolvedValue({ availableSeats: 0 });
  const departureFindUnique = jest.fn().mockResolvedValue({ availableSeats: 0 });
  const tx = {
    tour: {
      update: tourUpdate,
      updateMany: tourUpdateMany,
      findUnique: tourFindUnique,
    },
    tourDeparture: {
      updateMany: departureUpdateMany,
      findUnique: departureFindUnique,
    },
  } as unknown as Pick<Prisma.TransactionClient, 'tour' | 'tourDeparture'>;

  return { tx, tourUpdate, tourUpdateMany, departureUpdateMany };
}

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

describe('releaseSeats', () => {
  it('restores only tour aggregate seats when booking has no departure', async () => {
    const { tx, tourUpdate, departureUpdateMany } = createSeatReservationTx({});

    await releaseSeats(tx, { tourId: 10, seats: 2 });

    expect(tourUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        availableSeats: { increment: 2 },
      },
    });
    expect(departureUpdateMany).not.toHaveBeenCalled();
  });

  it('restores both tour aggregate seats and selected departure seats', async () => {
    const { tx, tourUpdate, departureUpdateMany } = createSeatReservationTx({});

    await releaseSeats(tx, { tourId: 10, departureId: 20, seats: 2 });

    expect(tourUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        availableSeats: { increment: 2 },
      },
    });
    expect(departureUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 20,
        tourId: 10,
      },
      data: {
        availableSeats: { increment: 2 },
      },
    });
  });
});

describe('reserveSeatsAtomically', () => {
  it('decrements tour seats with an atomic availability condition', async () => {
    const { tx, tourUpdateMany, departureUpdateMany } = createSeatReservationTx({});

    await reserveSeatsAtomically(tx, { tourId: 10, seats: 2 });

    expect(departureUpdateMany).not.toHaveBeenCalled();
    expect(tourUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 10,
        deletedAt: null,
        availableSeats: { gte: 2 },
      },
      data: {
        availableSeats: { decrement: 2 },
      },
    });
  });

  it('decrements departure seats before tour aggregate seats', async () => {
    const { tx, tourUpdateMany, departureUpdateMany } = createSeatReservationTx({});

    await reserveSeatsAtomically(tx, { tourId: 10, departureId: 20, seats: 2 });

    expect(departureUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 20,
        tourId: 10,
        isActive: true,
        availableSeats: { gte: 2 },
      },
      data: {
        availableSeats: { decrement: 2 },
      },
    });
    expect(tourUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 10,
        deletedAt: null,
        availableSeats: { gte: 2 },
      },
      data: {
        availableSeats: { decrement: 2 },
      },
    });
    expect(departureUpdateMany.mock.invocationCallOrder[0])
      .toBeLessThan(tourUpdateMany.mock.invocationCallOrder[0]);
  });

  it('rejects when the selected departure no longer has enough seats', async () => {
    const { tx, tourUpdateMany, departureUpdateMany } = createSeatReservationTx({ departureCount: 0 });

    await expect(
      reserveSeatsAtomically(tx, { tourId: 10, departureId: 20, seats: 2 }),
    ).rejects.toThrow(SeatsUnavailableException);

    expect(departureUpdateMany).toHaveBeenCalled();
    expect(tourUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects when the tour aggregate no longer has enough seats', async () => {
    const { tx, tourUpdateMany } = createSeatReservationTx({ tourCount: 0 });

    await expect(
      reserveSeatsAtomically(tx, { tourId: 10, seats: 2 }),
    ).rejects.toThrow(SeatsUnavailableException);

    expect(tourUpdateMany).toHaveBeenCalled();
  });
});
