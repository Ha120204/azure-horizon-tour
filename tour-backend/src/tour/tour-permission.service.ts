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
      throw new NotFoundException(`Không tìm thấy tour #${tourId}`);
    }

    if (
      requesterRole === Role.ADMIN ||
      requesterRole === Role.SUPER_ADMIN
    ) {
      return tour;
    }

    if (requesterRole !== Role.STAFF) {
      throw new ForbiddenException('Bạn không có quyền thao tác tour này');
    }

    if (!requesterId || tour.createdById !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền thao tác tour này');
    }

    if (
      tour.status !== TourStatus.DRAFT &&
      tour.status !== TourStatus.REJECTED
    ) {
      throw new ForbiddenException(
        'Chỉ có thể thao tác tour ở trạng thái Bản nháp hoặc Bị từ chối',
      );
    }

    return tour;
  }
}
