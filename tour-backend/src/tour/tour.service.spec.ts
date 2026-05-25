import { Test, TestingModule } from '@nestjs/testing';
import { TourService } from './tour.service';
import { PrismaService } from '../prisma/prisma.service';
import { TourPermissionService } from './tour-permission.service';
import { TourWorkflowService } from './tour-workflow.service';
import { TourContentService } from './tour-content.service';
import { TourQueryService } from './tour-query.service';

describe('TourService', () => {
  let service: TourService;

  beforeEach(async () => {
    const mockValue = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TourService,
        { provide: PrismaService, useValue: mockValue },
        { provide: TourPermissionService, useValue: mockValue },
        { provide: TourWorkflowService, useValue: mockValue },
        { provide: TourContentService, useValue: mockValue },
        { provide: TourQueryService, useValue: mockValue },
      ],
    }).compile();

    service = module.get<TourService>(TourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
