import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { ApiResponseDto } from '@/common/dto/api-response.dto';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockContext: ExecutionContext;
  let mockResponse: { statusCode: number };

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockResponse = { statusCode: 200 };
    mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;
  });

  it('should wrap plain data in ApiResponseDto.success', (done) => {
    const data = { id: 1, name: 'test' };
    const mockCallHandler: CallHandler = {
      handle: () => of(data),
    };

    interceptor
      .intercept(mockContext, mockCallHandler)
      .subscribe((result) => {
        expect(result).toBeInstanceOf(ApiResponseDto);
        expect(result.success).toBe(true);
        expect(result.message).toBe('Success');
        expect(result.code).toBe(200);
        expect(result.data).toEqual(data);
        done();
      });
  });

  it('should return ApiResponseDto unchanged when data is already ApiResponseDto', (done) => {
    const existing = ApiResponseDto.error('Custom error', 400);
    const mockCallHandler: CallHandler = {
      handle: () => of(existing),
    };

    interceptor
      .intercept(mockContext, mockCallHandler)
      .subscribe((result) => {
        expect(result).toBe(existing);
        expect(result.success).toBe(false);
        expect(result.message).toBe('Custom error');
        expect(result.code).toBe(400);
        done();
      });
  });
});
