import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status, json };
  const request = { method: 'GET', url: '/test' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('normalizes a string HttpException and stamps a timestamp', () => {
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException('Tour not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Tour not found',
        error: 'Not Found',
        timestamp: expect.any(String),
      }),
    );
  });

  it('preserves the array message from validation errors', () => {
    const { host, json } = createHost();

    filter.catch(
      new BadRequestException(['email must be an email', 'name should not be empty']),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['email must be an email', 'name should not be empty'],
        error: 'Bad Request',
      }),
    );
  });

  it('maps a Prisma unique-constraint error without leaking DB internals', () => {
    const { host, status, json } = createHost();
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['email'] },
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: "Giá trị 'email' đã tồn tại trong hệ thống.",
        error: 'Conflict',
      }),
    );
  });

  it('hides internal details for unknown errors', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('secret stack trace leak'), host);

    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0];
    expect(payload.statusCode).toBe(500);
    expect(payload.error).toBe('Internal Server Error');
    expect(payload.message).not.toContain('secret');
  });
});
