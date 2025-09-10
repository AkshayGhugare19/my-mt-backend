import { AvatarAdminDto } from '@modules/avatar/dto/avatar-admin.dto';
import { CreateAvatarResponseDto } from '@modules/avatar/dto/create-avatar-response.dto';
import { ReorderAvatarDto } from '@modules/avatar/dto/reorder-avatars.dto';
import { AdminAvatarService } from '@modules/avatar/service/avatar.service';
import {
  allOf,
  RequirePermissions,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ALLOWED_IMAGE_MIME_TYPES, fileFilter } from '@utils/file-filter';

@ApiTags('Avatars Admin')
@Controller('admin/avatars')
export class AdminAvatarController {
  constructor(private readonly adminAvatarService: AdminAvatarService) {}

  @Get()
  @RequirePermissions('admin', allOf(Permissions.READ_AVATARS))
  async getAllAvatars(): Promise<AvatarAdminDto[]> {
    const avatars = await this.adminAvatarService.getAllAvatars();
    return avatars.map(AvatarAdminDto.from);
  }

  @Post()
  @RequirePermissions('admin', allOf(Permissions.EDIT_AVATARS))
  @UseInterceptors(
    FilesInterceptor('avatar', 10, {
      fileFilter: fileFilter(ALLOWED_IMAGE_MIME_TYPES),
      limits: { fileSize: 1024 * 1024 * 3 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: [CreateAvatarResponseDto],
  })
  async uploadNewAvatars(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<CreateAvatarResponseDto[]> {
    const savedAvatars = await this.adminAvatarService.uploadNewAvatars(files);
    return savedAvatars.map(CreateAvatarResponseDto.from);
  }

  @Delete(':id')
  @RequirePermissions('admin', allOf(Permissions.EDIT_AVATARS))
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Avatar deleted successfully',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvatar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.adminAvatarService.deleteAvatar(id);
  }

  @Patch(':id/order')
  @ApiBody({ type: ReorderAvatarDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar order changed successfully',
  })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('admin', allOf(Permissions.EDIT_AVATARS))
  async changeOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReorderAvatarDto,
  ): Promise<AvatarAdminDto> {
    const updatedAvatar = await this.adminAvatarService.updateOrder(
      id,
      body.order,
    );
    return AvatarAdminDto.from(updatedAvatar);
  }
}
