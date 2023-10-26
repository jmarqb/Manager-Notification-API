import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Access unauthorized');
    }

    const token = authHeader.split(' ')[1];
    try {
      const decodedToken = this.jwtService.verify(token);

      if (decodedToken.id) {
        request.userId = decodedToken.id;
      }

      if (
        !decodedToken.role ||
        (!decodedToken.role.includes('admin') &&
          !decodedToken.role.includes('user'))
      ) {
        throw new ForbiddenException('Access forbidden');
      }

      return true;
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException('Access unauthorized');
    }
  }
}