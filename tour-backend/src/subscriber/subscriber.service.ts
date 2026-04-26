import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriberService {
  constructor(private prisma: PrismaService) {}

  async subscribe(email: string) {
    const existing = await this.prisma.subscriber.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: true, message: 'already_exists', data: existing };
    }

    const newSubscriber = await this.prisma.subscriber.create({
      data: { email },
    });

    return { success: true, message: 'created', data: newSubscriber };
  }
}
