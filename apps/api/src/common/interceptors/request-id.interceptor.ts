import { randomUUID } from 'crypto';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();

    const incoming = (req.headers['x-request-id'] as string) || randomUUID();
    req.id = incoming;
    res.setHeader('x-request-id', incoming);

    const started = process.hrtime.bigint();
    return next.handle().pipe(
      tap(() => {
        const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
        this.logger.log({
          msg: 'request.completed',
          requestId: incoming,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        });
      }),
    );
  }
}
