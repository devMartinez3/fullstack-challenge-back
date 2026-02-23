import { IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    example: 'Mi primer post',
    description: 'El título de la publicación',
  })
  @IsString()
  @IsNotEmpty({ message: 'El título es requerido' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  title: string;

  @ApiProperty({
    example: 'Este es el contenido detallado de mi publicación.',
    description: 'El cuerpo de la publicación',
  })
  @IsString()
  @IsNotEmpty({ message: 'El contenido es requerido' })
  @MinLength(5, { message: 'El contenido debe tener al menos 5 caracteres' })
  content: string;

  @ApiProperty({
    example: 1,
    description: 'ID del autor (Referencia a la tabla Users de la BD local)',
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El ID del autor es requerido' })
  authorUserId: number;
}
