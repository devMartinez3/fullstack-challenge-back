import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indica si la petición fue exitosa' })
  success: boolean;

  @ApiProperty({ description: 'Mensaje descriptivo del resultado' })
  message: string;

  @ApiProperty({ description: 'Código de estado HTTP', example: 200 })
  code: number;

  @ApiProperty({
    description: 'Los datos retornados por la petición',
    required: false,
  })
  data?: T;

  constructor(success: boolean, message: string, code: number, data?: T) {
    this.success = success;
    this.message = message;
    this.code = code;
    this.data = data;
  }

  static success<T>(
    data: T,
    message = 'Success',
    code = 200,
  ): ApiResponseDto<T> {
    return new ApiResponseDto(true, message, code, data);
  }

  static error<T>(message = 'Error', code = 500, data?: T): ApiResponseDto<T> {
    return new ApiResponseDto(false, message, code, data);
  }
}
