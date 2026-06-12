import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactService } from './contact.service';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';
import { SupportService } from '../support/support.service';
import { SendContactDto } from './dto/create-contact.dto';

type ContactTicketPayload = Parameters<SupportService['createFromContact']>[0];

describe('ContactService', () => {
  let service: ContactService;
  let mailService: { sendMail: jest.Mock };
  let supportService: {
    createFromContact: jest.Mock<
      Promise<{ id: number; accessCode: string }>,
      [ContactTicketPayload]
    >;
  };
  let settingsService: { getPublic: jest.Mock };

  const baseDto: SendContactDto = {
    name: 'Nguyen Van A',
    email: 'guest@example.com',
    phonePrefix: '+84',
    phone: '912345678',
    reference: '',
    subject: 'booking',
    message: 'Toi muon duoc tu van tour phu hop.',
  };

  beforeEach(() => {
    mailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    supportService = {
      createFromContact: jest.fn().mockResolvedValue({
        id: 101,
        accessCode: 'GUEST-ACCESS-101',
      }),
    };
    settingsService = {
      getPublic: jest.fn().mockResolvedValue({
        company_name: 'Azure Horizon',
        company_email: 'support@example.com',
        company_phone: '0386761856',
      }),
    };

    service = new ContactService(
      mailService as unknown as MailService,
      { get: jest.fn().mockReturnValue('admin@example.com') } as unknown as ConfigService,
      supportService as unknown as SupportService,
      settingsService as unknown as SettingsService,
    );
  });

  const send = (overrides: Partial<SendContactDto>, userId?: number) =>
    service.sendContactEmail({ ...baseDto, ...overrides }, userId);

  const lastTicketPayload = (): ContactTicketPayload => {
    const call = supportService.createFromContact.mock.calls.at(-1);
    if (!call) throw new Error('Expected a support ticket to be created');
    return call[0];
  };

  it('creates a guest booking consultation ticket with request details', async () => {
    const result = await send({
      subject: 'booking',
      tourInterest: 'Da Nang - Hoi An',
      preferredTravelDate: '2026-07-15',
      guestCount: '4',
      preferredContactMethod: 'zalo',
    });

    const payload = lastTicketPayload();
    expect(result).toEqual({
      message: 'Message sent successfully',
      ticketId: 101,
      accessCode: 'GUEST-ACCESS-101',
    });
    expect(payload).toEqual(expect.objectContaining({
      category: 'booking',
      bookingRef: undefined,
      userId: undefined,
    }));
    expect(payload.message).toContain('Thông tin bổ sung');
    expect(payload.message).toContain('Da Nang - Hoi An');
    expect(payload.message).toContain('2026-07-15');
    expect(payload.message).toContain('4');
    expect(payload.message).toContain('Zalo');
  });

  it('creates a payment support ticket with payment context', async () => {
    await send({
      subject: 'payment',
      reference: 'AH-98234-X',
      paymentMethod: 'bank_transfer',
      message: 'Toi da chuyen khoan nhung don hang chua cap nhat.',
    }, 42);

    const payload = lastTicketPayload();
    expect(payload).toEqual(expect.objectContaining({
      category: 'payment',
      bookingRef: 'AH-98234-X',
      userId: 42,
    }));
    expect(payload.message).toContain('Bank transfer');
  });

  it('creates a reschedule ticket with change request details', async () => {
    await send({
      subject: 'cancellation',
      reference: 'AH-CHANGE-1',
      requestedChangeDate: '2026-08-20',
      cancellationReason: 'Gia dinh doi lich bay',
      message: 'Toi can doi ngay khoi hanh.',
    });

    const payload = lastTicketPayload();
    expect(payload).toEqual(expect.objectContaining({
      category: 'reschedule',
      bookingRef: 'AH-CHANGE-1',
    }));
    expect(payload.message).toContain('2026-08-20');
    expect(payload.message).toContain('Gia dinh doi lich bay');
  });

  it('creates a complaint ticket with issue time details', async () => {
    await send({
      subject: 'complaint',
      reference: 'AH-COMPLAINT-1',
      issueOccurredAt: '2026-06-08T09:30',
      message: 'Huong dan vien den muon so voi lich hen.',
    });

    const payload = lastTicketPayload();
    expect(payload).toEqual(expect.objectContaining({
      category: 'complaint',
      bookingRef: 'AH-COMPLAINT-1',
    }));
    expect(payload.message).toContain('2026-06-08T09:30');
  });

  it('rejects payment, reschedule, and complaint requests without booking reference', async () => {
    await expect(send({ subject: 'payment', reference: '', paymentMethod: 'card' }))
      .rejects.toThrow(BadRequestException);
    await expect(send({ subject: 'cancellation', reference: '', cancellationReason: 'Doi lich' }))
      .rejects.toThrow(BadRequestException);
    await expect(send({ subject: 'complaint', reference: '', issueOccurredAt: '2026-06-08T09:30' }))
      .rejects.toThrow(BadRequestException);
    expect(supportService.createFromContact).not.toHaveBeenCalled();
  });
});
