import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { HttpRequest, HttpResponse } from '../../types/express.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const request = ctx.getRequest<HttpRequest>();

    let statusCode: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string) || exception.message;
        error = (resp['error'] as string) || exception.name;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    });
  }
}
