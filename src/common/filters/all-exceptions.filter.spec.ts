import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiResponseDto } from '@/common/dto/api-response.dto';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockReply: jest.Mock;
  let mockResponse: object;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    mockReply = jest.fn();
    mockResponse = {};
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    const httpAdapterHost = {
      httpAdapter: { reply: mockReply },
    };
    filter = new AllExceptionsFilter(
      httpAdapterHost as unknown as HttpAdapterHost,
    );
  });

  it('should reply with status and error body for HttpException with string response', () => {
    const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockReply).toHaveBeenCalledTimes(1);
    const [response, body, status] = mockReply.mock.calls[0];
    expect(response).toBe(mockResponse);
    expect(status).toBe(400);
    expect(body).toEqual(
      ApiResponseDto.error('Bad request', HttpStatus.BAD_REQUEST),
    );
    expect(body.success).toBe(false);
    expect(body.message).toBe('Bad request');
    expect(body.code).toBe(400);
  });

  it('should use first element of message array for HttpException with object response', () => {
    const exception = new HttpException(
      { message: ['First error', 'Second error'] },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, mockHost);

    const [, body, status] = mockReply.mock.calls[0];
    expect(status).toBe(422);
    expect(body.message).toBe('First error');
    expect(body.success).toBe(false);
  });

  it('should use message string for HttpException with object response (single message)', () => {
    const exception = new HttpException(
      { message: 'Single message' },
      HttpStatus.FORBIDDEN,
    );

    filter.catch(exception, mockHost);

    const [, body] = mockReply.mock.calls[0];
    expect(body.message).toBe('Single message');
  });

  it('should reply with 500 and message for generic Error', () => {
    const exception = new Error('Something broke');

    filter.catch(exception, mockHost);

    const [, body, status] = mockReply.mock.calls[0];
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Something broke');
    expect(body.code).toBe(500);
  });

  it('should reply with 500 and generic message for unknown exception', () => {
    filter.catch('not an error object', mockHost);

    const [, body, status] = mockReply.mock.calls[0];
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Internal server error');
    expect(body.code).toBe(500);
  });
});
