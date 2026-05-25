import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from './tour-permission.service';

@Injectable()
export class TourContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tourPermission: TourPermissionService,
  ) {}

  // ── Gallery ────────────────────────────────────────────────────────────────

  async addGalleryImages(
    tourId: number,
    urls: string[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(tourId, requesterId, requesterRole);
    const existing = await this.prisma.tourImage.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'desc' },
      take: 1,
    });
    const baseOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
    const data = urls.map((url, i) => ({ tourId, url, sortOrder: baseOrder + i }));
    await this.prisma.tourImage.createMany({ data });
    return this.prisma.tourImage.findMany({ where: { tourId }, orderBy: { sortOrder: 'asc' } });
  }

  async removeGalleryImage(tourId: number, imageId: number, requesterId?: number, requesterRole?: string) {
    await this.tourPermission.assertCanMutateTour(tourId, requesterId, requesterRole);
    await this.prisma.tourImage.delete({ where: { id: imageId, tourId } });
    return { message: 'Image removed' };
  }

  // ── Highlights ────────────────────────────────────────────────────────────

  async upsertHighlights(
    tourId: number,
    highlights: { content: string; contentEn?: string; icon?: string; sortOrder?: number }[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(tourId, requesterId, requesterRole);
    await this.prisma.tourHighlight.deleteMany({ where: { tourId } });
    if (highlights.length > 0) {
      await this.prisma.tourHighlight.createMany({
        data: highlights.map((h, i) => ({
          tourId,
          content: h.content,
          contentEn: h.contentEn?.trim() || null,
          icon: h.icon ?? 'auto_awesome',
          sortOrder: h.sortOrder ?? i,
        })),
      });
    }
    return this.prisma.tourHighlight.findMany({ where: { tourId }, orderBy: { sortOrder: 'asc' } });
  }

  // ── FAQs ──────────────────────────────────────────────────────────────────

  async upsertFaqs(
    tourId: number,
    faqs: { question: string; questionEn?: string; answer: string; answerEn?: string; sortOrder?: number }[],
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(tourId, requesterId, requesterRole);
    await this.prisma.tourFAQ.deleteMany({ where: { tourId } });
    if (faqs.length > 0) {
      await this.prisma.tourFAQ.createMany({
        data: faqs.map((f, i) => ({
          tourId,
          question: f.question,
          questionEn: f.questionEn?.trim() || null,
          answer: f.answer,
          answerEn: f.answerEn?.trim() || null,
          sortOrder: f.sortOrder ?? i,
        })),
      });
    }
    return this.prisma.tourFAQ.findMany({ where: { tourId }, orderBy: { sortOrder: 'asc' } });
  }

  // ── Itinerary ─────────────────────────────────────────────────────────────

  async updateItineraryDay(
    tourId: number,
    dayId: number,
    data: {
      title?: string; titleEn?: string; description?: string; descriptionEn?: string;
      mealsBreakfast?: boolean; mealsLunch?: boolean; mealsDinner?: boolean;
      accommodation?: string; accommodationEn?: string; transport?: string; transportEn?: string;
      activities?: string[]; activitiesEn?: string[]; imageUrl?: string;
      timeline?: any[]; timelineEn?: any[];
    },
    requesterId?: number,
    requesterRole?: string,
  ) {
    await this.tourPermission.assertCanMutateTour(tourId, requesterId, requesterRole);
    const day = await this.prisma.tourItinerary.findFirst({ where: { id: dayId, tourId } });
    if (!day) throw new NotFoundException(`Itinerary day ${dayId} not found for tour ${tourId}`);
    return this.prisma.tourItinerary.update({ where: { id: dayId }, data });
  }
}
