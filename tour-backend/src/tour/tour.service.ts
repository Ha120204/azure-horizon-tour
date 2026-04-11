import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TourService {
  constructor(private readonly prisma: PrismaService) { }

  create(createTourDto: CreateTourDto) {
    const { destinationId, ...rest } = createTourDto;
    return this.prisma.tour.create({
      data: {
        ...rest,
        destination: { connect: { id: destinationId } },
      },
    });
  }

  findAll() {
    return this.prisma.tour.findMany();
  }

  async findOne(id: number) {
    const tour = await this.prisma.tour.findUnique({
      where: { id },
    });
    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }
    return tour;
  }

  update(id: number, updateTourDto: UpdateTourDto) {
    const { destinationId, ...rest } = updateTourDto;
    return this.prisma.tour.update({
      where: { id },
      data: {
        ...rest,
        ...(destinationId !== undefined && {
          destination: { connect: { id: destinationId } },
        }),
      },
    });
  }

  remove(id: number) {
    return this.prisma.tour.delete({
      where: { id },
    });
  }
}
