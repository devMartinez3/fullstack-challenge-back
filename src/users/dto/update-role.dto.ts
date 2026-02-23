import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'El nuevo rol del usuario',
    enum: ['USER', 'ADMIN'],
    example: 'ADMIN',
  })
  @IsNotEmpty()
  @IsEnum(['USER', 'ADMIN'])
  role: 'USER' | 'ADMIN';

  @ApiProperty({
    description: 'El ID del administrador que solicita el cambio de rol',
    example: 1,
  })
  @IsNotEmpty()
  adminId: number;
}
