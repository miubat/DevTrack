import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
} from '@nestjs/common';

// BUG-AGL-06.1-01: SRS 5.3 error body. Validation errors (message is a list) get
// code VALIDATION_FAILED. Other 400 errors are left as they are.
@Catch(BadRequestException)
export class ValidationCodeFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const res = host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: unknown): void } }>();
    const raw = exception.getResponse();
    const body: Record<string, unknown> =
      typeof raw === 'string' ? { message: raw } : { ...raw };
    if (Array.isArray(body.message) && body.code === undefined) {
      res.status(400).json({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: body.message,
        error: 'Bad Request',
      });
      return;
    }
    res.status(400).json(body);
  }
}
