import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy các roles yêu cầu từ metadata (decorator @Roles)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không có role yêu cầu => pass
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    // Nếu không có user hoặc không có role
    if (!user || !user.role) {
      throw new ForbiddenException('User role is missing in token');
    }

    // So sánh role của user với role yêu cầu
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Forbidden resource');
    }

    return true;
  }
}
