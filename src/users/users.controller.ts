import {
  Controller,
  Get,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { editAvatarFileName } from '../commons/utils/fileUpload';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('me')
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req) {
    return this.userService.getOne(req.user.id);
  }

  @Put('me')
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 8000000, // Compliant: 8MB
      },
      storage: diskStorage({
        destination: './assets/user_avatars',
        filename: editAvatarFileName,
      }),
    }),
  )
  updateMe(@Req() req, @UploadedFile() file) {
    const userId = req.user.id;
    const updateData = req.body;
    updateData.avatarUrl = file ? file.filename : undefined; // Assuming the body contains the fields to update
    return this.userService.updateMe(userId, updateData);
  }
}
