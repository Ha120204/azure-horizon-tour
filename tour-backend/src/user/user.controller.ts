import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from './user.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { Role } from '@prisma/client';

type AuthenticatedAdminRequest = {
  user: {
    userId: number;
    id?: number;
    role: Role;
  };
};

@Controller('user')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * POST /user — Tạo user mới
   * Chỉ ADMIN và SUPER_ADMIN
   */
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @AuditLog('CREATE', 'User')
  createUser(@Body() dto: CreateUserDto, @Request() req: AuthenticatedAdminRequest) {
    return this.userService.createUser({ ...dto, role: dto.role as Role }, req.user.role);
  }


  /**
   * GET /user — Danh sách users (phân trang, search, filter)
   * ADMIN, SUPER_ADMIN đọc + sửa. STAFF chỉ đọc.
   */
  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.findAll({
      search,
      role,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  /**
   * GET /user/stats — Thống kê KPI
   * ADMIN, SUPER_ADMIN đọc + sửa. STAFF chỉ đọc.
   */
  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  getStats() {
    return this.userService.getStats();
  }

  /**
   * GET /user/:id — Chi tiết user
   * ADMIN, SUPER_ADMIN đọc + sửa. STAFF chỉ đọc.
   */
  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  /**
   * PATCH /user/:id — Cập nhật thông tin cơ bản
   * Chỉ ADMIN và SUPER_ADMIN
   */
  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @AuditLog('UPDATE', 'User')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Request() req: AuthenticatedAdminRequest,
  ) {
    return this.userService.updateUser(id, dto, req.user.role);
  }

  /**
   * PATCH /user/:id/role — Đổi role
   * Chỉ SUPER_ADMIN
   */
  @Patch(':id/role')
  @Roles('SUPER_ADMIN')
  @AuditLog('ROLE_CHANGE', 'User')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @Request() req: AuthenticatedAdminRequest,
  ) {
    return this.userService.updateRole(id, dto.role as unknown as Role, req.user.userId);
  }

  /**
   * PATCH /user/:id/toggle-status — Activate/Deactivate
   * Chỉ ADMIN và SUPER_ADMIN
   */
  @Patch(':id/toggle-status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @AuditLog('UPDATE', 'User')
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedAdminRequest,
  ) {
    return this.userService.toggleStatus(id, req.user.userId, req.user.role);
  }

  /**
   * PATCH /user/:id/revoke-sessions — Thu hồi phiên đăng nhập
   * Chỉ SUPER_ADMIN
   */
  @Patch(':id/revoke-sessions')
  @Roles('SUPER_ADMIN')
  @AuditLog('REVOKE_SESSION', 'User')
  revokeSessions(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedAdminRequest,
  ) {
    return this.userService.revokeSessions(id, req.user.userId);
  }
}
