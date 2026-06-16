import { Params } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { ENV } from '../../config/env';

export function loggerConfig(): Params {
  return {
    pinoHttp: {
      level: ENV.LOG_LEVEL,
      messageKey: 'msg',
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const incoming = (req.headers['x-request-id'] as string) || randomUUID();
        res.setHeader('x-request-id', incoming);
        return incoming;
      },
      customProps: (req) => ({
        requestId: (req as IncomingMessage & { id?: string }).id,
        context: 'http',
      }),
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      transport: ENV.LOG_PRETTY
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard', singleLine: false },
          }
        : undefined,
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.secret', '*.token'],
        censor: '[REDACTED]',
      },
    },
  };
}
