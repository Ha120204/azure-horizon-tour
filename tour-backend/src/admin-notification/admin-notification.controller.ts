import {
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminNotificationService } from './admin-notification.service';
import type {
  AdminNotificationQuery,
  AdminNotificationRole,
} from './admin-notification.service';

type AuthenticatedRequest = {
  user?: {
    id?: number | string;
    userId?: number | string;
    role?: string;
  };
};

function getRequiredUser(req: AuthenticatedRequest): { userId: number; role: AdminNotificationRole } {
  const userId = Number(req.user?.userId ?? req.user?.id);
  const role = req.user?.role;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new UnauthorizedException('Invalid authenticated user');
  }
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'STAFF') {
    throw new UnauthorizedException('Invalid admin role');
  }

  return { userId, role };
}

@Controller('admin/notifications')
export class AdminNotificationController {
  constructor(private readonly notificationService: AdminNotificationService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  list(@Req() req: AuthenticatedRequest, @Query() query: AdminNotificationQuery) {
    const user = getRequiredUser(req);
    return this.notificationService.listForUser(user.userId, user.role, query);
  }

  @Post('events-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  createEventsToken(@Req() req: AuthenticatedRequest) {
    const user = getRequiredUser(req);
    return this.notificationService.createEventsToken(user.userId, user.role);
  }

  @Sse('events')
  events(@Query('token') token?: string): Observable<MessageEvent> {
    const user = this.notificationService.verifyEventsToken(token);
    return this.notificationService.eventsForRole(user.role) as Observable<MessageEvent>;
  }

  @Patch('read-all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  markAllRead(@Req() req: AuthenticatedRequest) {
    const user = getRequiredUser(req);
    return this.notificationService.markAllRead(user.userId, user.role);
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  markRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = getRequiredUser(req);
    return this.notificationService.markRead(id, user.userId, user.role);
  }
}
