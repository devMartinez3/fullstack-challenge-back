import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User, Prisma } from '@pris/generated/prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Body, Patch } from '@nestjs/common';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('import/:id')
  @ApiOperation({
    summary: 'Obtiene un usuario de ReqRes por ID y lo guarda en la BD local',
  })
  @ApiResponse({ status: 201, description: 'Usuario importado exitosamente' })
  @ApiResponse({ status: 409, description: 'El usuario ya existe localmente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado en ReqRes' })
  async importUser(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.usersService.importUserFromReqRes(id);
  }

  @Get('saved')
  @ApiOperation({
    summary: 'Lista todos los usuarios guardados en la BD local con paginación',
  })
  async getSavedUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getSavedUsers(page, limit);
  }

  @Get('saved/:id')
  @ApiOperation({
    summary: 'Obtiene el detalle de un usuario guardado localmente',
  })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getSavedUser(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Prisma.UserGetPayload<{ include: { posts: true } }>> {
    return this.usersService.getSavedUserById(id);
  }

  @Delete('saved/:id')
  @ApiOperation({
    summary: 'Elimina un usuario guardado y todos sus posts asociados',
  })
  @ApiResponse({ status: 200, description: 'Usuario eliminado correctamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos de administrador',
  })
  async deleteSavedUser(
    @Param('id', ParseIntPipe) id: number,
    @Query('adminId', ParseIntPipe) adminId: number,
  ): Promise<User> {
    return this.usersService.deleteSavedUser(id, adminId);
  }

  @Patch('saved/:id')
  @ApiOperation({
    summary: 'Actualizar detalles de un usuario guardado',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado correctamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya existe' })
  @ApiBody({ type: UpdateUserDto })
  async updateSavedUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.updateSavedUser(id, updateUserDto);
  }

  @Patch('saved/:id/role')
  @ApiOperation({
    summary: 'Actualizar únicamente el rol de un usuario guardado',
  })
  @ApiResponse({
    status: 200,
    description: 'Rol de usuario actualizado correctamente',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiBody({ type: UpdateRoleDto })
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<User> {
    return this.usersService.updateUserRole(
      id,
      updateRoleDto.role,
      updateRoleDto.adminId,
    );
  }
}
