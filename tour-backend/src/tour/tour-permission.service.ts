import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TourStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TourPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanMutateTour(
    tourId: number,
    requesterId?: number,
    requesterRole?: string,
  ) {
    const tour = await this.prisma.tour.findFirst({
      where: { id: tourId, deletedAt: null },
      select: { id: true, createdById: true, status: true },
    });

    if (!tour) {
      throw new NotFoundException(`Tour with ID ${tourId} not found`);
    }

    if (
      requesterRole === Role.ADMIN ||
      requesterRole === Role.SUPER_ADMIN
    ) {
      return tour;
    }

    if (requesterRole !== Role.STAFF) {
      throw new ForbiddenException('Ban khong co quyen thao tac tour nay');
    }

    if (!requesterId || tour.createdById !== requesterId) {
      throw new ForbiddenException('Ban khong co quyen thao tac tour nay');
    }

    if (
      tour.status !== TourStatus.DRAFT &&
      tour.status !== TourStatus.REJECTED
    ) {
      throw new ForbiddenException(
        'Chi co the thao tac tour o trang thai Ban nhap hoac Bi tu choi',
      );
    }

    return tour;
  }
}
