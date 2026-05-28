import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { interval, merge, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

export type AdminNotificationRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
export type AdminNotificationSeverity = 'info' | 'warning' | 'urgent';

export type CreateAdminNotificationDto = {
  type: string;
  resourceType: string;
  resourceId?: string | number | null;
  title: string;
  body: string;
  href?: string | null;
  severity?: AdminNotificationSeverity;
  targetRoles?: AdminNotificationRole[];
  metadata?: Prisma.InputJsonValue;
};

export type AdminNotificationQuery = {
  page?: string;
  limit?: string;
  unreadOnly?: string;
};

const ALL_ADMIN_ROLES: AdminNotificationRole[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];
const MAX_PAGE_SIZE = 50;
const EVENTS_TOKEN_PURPOSE = 'admin-notification-events';
const EVENTS_TOKEN_TTL_SECONDS = 120;

type AdminNotificationEvent = {
  id: number;
  type: string;
  resourceType: string;
  resourceId: string | null;
  title: string;
  body: string;
  href: string | null;
  severity: string;
  targetRoles: AdminNotificationRole[];
  createdAt: string;
};

type CreatedAdminNotification = {
  id: number;
  type: string;
  resourceType: string;
  resourceId: string | null;
  title: string;
  body: string;
  href: string | null;
  severity: string;
  targetRoles: string[];
  createdAt: Date;
};

type EventsTokenPayload = {
  sub: number;
  role: string;
  purpose: string;
};

type SsePayload = {
  type?: string;
  id?: string;
  data: unknown;
};

function isAdminNotificationRole(role: string): role is AdminNotificationRole {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF';
}

@Injectable()
export class AdminNotificationService {
  private readonly logger = new Logger(AdminNotificationService.name);
  private readonly events$ = new Subject<AdminNotificationEvent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async create(dto: CreateAdminNotificationDto) {
    const targetRoles = dto.targetRoles?.length ? dto.targetRoles : ALL_ADMIN_ROLES;

    const notification = await this.prisma.adminNotification.create({
      data: {
        type: dto.type,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId == null ? null : String(dto.resourceId),
        title: dto.title,
        body: dto.body,
        href: dto.href ?? null,
        severity: dto.severity ?? 'info',
        targetRoles,
        metadata: dto.metadata ?? Prisma.JsonNull,
      },
    });

    this.emitNotification(notification);
    return notification;
  }

  async createSafe(dto: CreateAdminNotificationDto) {
    try {
      return await this.create(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification error';
      this.logger.warn(`Failed to create admin notification: ${message}`);
      return null;
    }
  }

  async listForUser(userId: number, role: AdminNotificationRole, query: AdminNotificationQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;
    const where: Prisma.AdminNotificationWhereInput = {
      targetRoles: { has: role },
      ...(query.unreadOnly === 'true' ? { reads: { none: { userId } } } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reads: {
            where: { userId },
            select: { readAt: true },
            take: 1,
          },
        },
      }),
      this.prisma.adminNotification.count({ where }),
      this.prisma.adminNotification.count({
        where: {
          targetRoles: { has: role },
          reads: { none: { userId } },
        },
      }),
    ]);

    return {
      data: {
        notifications: notifications.map(({ reads, ...notification }) => ({
          ...notification,
          readAt: reads[0]?.readAt ?? null,
        })),
        unreadCount,
      },
      meta: {
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async markRead(notificationId: number, userId: number, role: AdminNotificationRole) {
    const notification = await this.prisma.adminNotification.findFirst({
      where: { id: notificationId, targetRoles: { has: role } },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const read = await this.prisma.adminNotificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      update: { readAt: new Date() },
      create: {
        notificationId,
        userId,
      },
    });

    return { data: read };
  }

  async markAllRead(userId: number, role: AdminNotificationRole) {
    const unreadNotifications = await this.prisma.adminNotification.findMany({
      where: {
        targetRoles: { has: role },
        reads: { none: { userId } },
      },
      select: { id: true },
    });

    if (unreadNotifications.length === 0) {
      return { data: { count: 0 } };
    }

    const result = await this.prisma.adminNotificationRead.createMany({
      data: unreadNotifications.map((notification) => ({
        notificationId: notification.id,
        userId,
      })),
      skipDuplicates: true,
    });

    return { data: { count: result.count } };
  }

  createEventsToken(userId: number, role: AdminNotificationRole) {
    return {
      data: {
        token: this.jwtService.sign({
          sub: userId,
          role,
          purpose: EVENTS_TOKEN_PURPOSE,
        }),
        expiresInSeconds: EVENTS_TOKEN_TTL_SECONDS,
      },
    };
  }

  verifyEventsToken(token?: string): { userId: number; role: AdminNotificationRole } {
    if (!token) {
      throw new UnauthorizedException('Missing realtime token');
    }

    try {
      const payload = this.jwtService.verify<EventsTokenPayload>(token);
      const userId = Number(payload.sub);

      if (
        payload.purpose !== EVENTS_TOKEN_PURPOSE ||
        !Number.isInteger(userId) ||
        userId <= 0 ||
        !isAdminNotificationRole(payload.role)
      ) {
        throw new UnauthorizedException('Invalid realtime token');
      }

      return { userId, role: payload.role };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid realtime token');
    }
  }

  eventsForRole(role: AdminNotificationRole): Observable<SsePayload> {
    const notificationEvents$ = this.events$.pipe(
      filter((event) => event.targetRoles.includes(role)),
      map((event) => ({
        type: 'notification',
        id: String(event.id),
        data: event,
      })),
    );
    const heartbeat$ = interval(25000).pipe(
      map(() => ({
        type: 'heartbeat',
        data: { at: new Date().toISOString() },
      })),
    );

    return merge(notificationEvents$, heartbeat$);
  }

  private emitNotification(notification: CreatedAdminNotification) {
    const targetRoles = notification.targetRoles.filter(isAdminNotificationRole);
    if (targetRoles.length === 0) {
      return;
    }

    this.events$.next({
      id: notification.id,
      type: notification.type,
      resourceType: notification.resourceType,
      resourceId: notification.resourceId,
      title: notification.title,
      body: notification.body,
      href: notification.href,
      severity: notification.severity,
      targetRoles,
      createdAt: notification.createdAt.toISOString(),
    });
  }
}
