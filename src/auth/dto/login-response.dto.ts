import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'eve.holt@reqres.in' })
  email: string;

  @ApiProperty({ example: 'Eve' })
  first_name: string;

  @ApiProperty({ example: 'Holt' })
  last_name: string;

  @ApiProperty({ example: 'https://reqres.in/img/faces/4-image.jpg' })
  avatar: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'QpwL5tke4Pnpja7X4' })
  token: string;

  @ApiProperty({ type: LoginUserDto })
  user: LoginUserDto;
}
