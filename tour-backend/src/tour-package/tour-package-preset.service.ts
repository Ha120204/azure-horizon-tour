import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PackagePresetTypeInput = 'INCLUDE' | 'EXCLUDE';

export type CreatePackagePresetDto = {
  type?: PackagePresetTypeInput;
  label?: string;
};

const normalizePresetLabel = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeDisplayLabel = (value: string) => value.trim().replace(/\s+/g, ' ');

@Injectable()
export class TourPackagePresetService {
  constructor(private readonly prisma: PrismaService) {}

  private parseType(type?: string): PackagePresetTypeInput {
    if (type === 'INCLUDE') return 'INCLUDE';
    if (type === 'EXCLUDE') return 'EXCLUDE';
    throw new BadRequestException('Preset type must be INCLUDE or EXCLUDE');
  }

  async findByType(typeInput?: string) {
    const type = this.parseType(typeInput);
    return await this.prisma.tourPackagePresetItem.findMany({
      where: { type, isActive: true },
      orderBy: { label: 'asc' },
    });
  }

  async create(dto: CreatePackagePresetDto, createdById?: number) {
    const type = this.parseType(dto.type);
    const label = normalizeDisplayLabel(dto.label || '');
    if (!label) {
      throw new BadRequestException('Preset label is required');
    }

    const normalizedLabel = normalizePresetLabel(label);
    if (!normalizedLabel) {
      throw new BadRequestException('Preset label is invalid');
    }

    const existing = await this.prisma.tourPackagePresetItem.findUnique({
      where: { type_normalizedLabel: { type, normalizedLabel } },
    });

    if (existing) {
      if (!existing.isActive || existing.label !== label) {
        return this.prisma.tourPackagePresetItem.update({
          where: { id: existing.id },
          data: { isActive: true, label },
        });
      }
      return existing;
    }

    return this.prisma.tourPackagePresetItem.create({
      data: {
        type,
        label,
        normalizedLabel,
        createdById,
      },
    });
  }
}
