import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarMulterConfig } from '../commons/multer.config';
import { UpdateMeDTO } from './DTO/updateMe.dto';
import { Request } from 'express';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('me')
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request & { user: { id: number } }) {
    return this.userService.getOne(req.user.id);
  }

  @Put('me')
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', avatarMulterConfig))
  updateMe(
    @Req() req: Request & { user: { id: number } },
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: UpdateMeDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    body.avatarUrl = file ? file.filename : undefined;
    return this.userService.updateMe(req.user.id, body);
  }
}
