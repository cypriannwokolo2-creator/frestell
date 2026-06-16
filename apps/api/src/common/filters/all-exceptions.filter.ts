import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { ApiError } from '@frestell/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();
    const requestId = req.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Partial<ApiError> = {
      statusCode: status,
      error: 'Internal Server Error',
      message: 'Unexpected error',
      code: 'INTERNAL',
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      const payload = typeof r === 'string' ? { message: r } : (r as Record<string, unknown>);
      body = {
        statusCode: status,
        error: (payload.error as string) ?? HttpStatus[status] ?? 'Error',
        message: (payload.message as string) ?? exception.message,
        code: (payload.code as string) ?? (payload.statusCode ? 'HTTP_ERROR' : 'INTERNAL'),
        details: payload.details,
        timestamp: new Date().toISOString(),
      };
    } else if (exception instanceof ZodError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      body = {
        statusCode: status,
        error: 'Unprocessable Entity',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: exception.flatten(),
        timestamp: new Date().toISOString(),
      };
    } else if (exception instanceof PrismaClientKnownRequestError) {
      status = this.prismaStatus(exception);
      body = {
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message: this.prismaMessage(exception),
        code: `PRISMA_${exception.code}`,
        details: { meta: exception.meta },
        timestamp: new Date().toISOString(),
      };
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      body.message = exception.message;
    } else {
      this.logger.error('Non-error thrown', String(exception));
    }

    if (requestId) body.requestId = requestId;
    if (res.headersSent) {
      this.logger.warn('Response already sent, skipping error response');
      return;
    }
    res.status(status).json(body);
  }

  private prismaStatus(e: PrismaClientKnownRequestError): HttpStatus {
    switch (e.code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }

  private prismaMessage(e: PrismaClientKnownRequestError): string {
    switch (e.code) {
      case 'P2002':
        return 'Unique constraint violation';
      case 'P2025':
        return 'Record not found';
      default:
        return 'Database request failed';
    }
  }
}
