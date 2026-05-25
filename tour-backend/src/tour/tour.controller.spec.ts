import { Test, TestingModule } from '@nestjs/testing';
import { TourController } from './tour.controller';
import { TourService } from './tour.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { TourPermissionService } from './tour-permission.service';

describe('TourController', () => {
  let controller: TourController;

  beforeEach(async () => {
    const mockValue = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TourController],
      providers: [
        { provide: TourService, useValue: mockValue },
        { provide: CloudinaryService, useValue: mockValue },
        { provide: TourPermissionService, useValue: mockValue },
      ],
    }).compile();

    controller = module.get<TourController>(TourController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
