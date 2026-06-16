import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUserResponse } from '../dto/auth.dto';

export const CurrentUser = createParamDecorator<keyof AuthUserResponse | undefined>(
  (data: keyof AuthUserResponse | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
