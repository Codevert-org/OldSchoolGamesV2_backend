import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GetStatsDto } from './DTO/getStats.dto';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarMulterConfig } from '../commons/multer.config';
import { UpdateMeDTO } from './DTO/updateMe.dto';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('check-pseudo')
  @ApiOkResponse()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async checkPseudo(
    @Query('pseudo') pseudo: string,
  ): Promise<{ available: boolean }> {
    if (!pseudo || pseudo.length < 2) {
      return { available: false };
    }
    const available = await this.userService.isPseudoAvailable(pseudo);
    return { available };
  }

  @Get('me')
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request & { user: { id: number } }) {
    return this.userService.getOne(req.user.id);
  }

  @Get('me/stats')
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getStats(
    @Req() req: Request & { user: { id: number } },
    @Query() query: GetStatsDto,
  ) {
    return this.userService.getStats(req.user.id, query);
  }

  @Put('me')
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', avatarMulterConfig))
  updateMe(
    @Req() req: Request & { user: { id: number } },
    @Body() body: UpdateMeDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    body.avatarUrl = file ? file.filename : undefined;
    return this.userService.updateMe(req.user.id, body);
  }
}
