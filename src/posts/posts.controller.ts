import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post as PostModel, Prisma } from '@pris/generated/prisma/client';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Crea una nueva publicación' })
  @ApiResponse({ status: 201, description: 'Publicación creada exitosamente' })
  @ApiResponse({ status: 404, description: 'Autor (Usuario) no encontrado' })
  create(@Body() createPostDto: CreatePostDto): Promise<
    Prisma.PostGetPayload<{
      include: {
        author: {
          select: { id: true; firstName: true; lastName: true; email: true };
        };
      };
    }>
  > {
    return this.postsService.create(createPostDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtiene todas las publicaciones paginadas' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
  ): Promise<{
    data: Prisma.PostGetPayload<{
      include: {
        author: {
          select: { id: true; firstName: true; lastName: true; avatar: true };
        };
      };
    }>[];
    meta: {
      total: number;
      page: number;
      lastPage: number;
      limit: number;
    };
  }> {
    const authorUserId = userId ? parseInt(userId, 10) : undefined;
    return this.postsService.findAll(page, limit, authorUserId || undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de una publicación por ID' })
  @ApiResponse({ status: 200, description: 'Publicación encontrada' })
  @ApiResponse({ status: 404, description: 'Publicación no encontrada' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Prisma.PostGetPayload<{ include: { author: true } }>> {
    return this.postsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualiza parcialmente una publicación existente' })
  @ApiResponse({ status: 200, description: 'Publicación actualizada' })
  @ApiResponse({ status: 404, description: 'Publicación no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostModel> {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una publicación por ID' })
  @ApiResponse({
    status: 200,
    description: 'Publicación eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Publicación no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<PostModel> {
    return this.postsService.remove(id);
  }
}
