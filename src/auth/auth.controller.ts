import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDTO } from './DTO/register.dto';
import { AuthResponseDTO } from './DTO/auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { editAvatarFileName } from '../commons/utils/fileUpload';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOkResponse({ type: AuthResponseDTO })
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
  register(
    @Body() body: RegisterDTO,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AuthResponseDTO> {
    body.avatarUrl = file ? file.filename : undefined;
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDTO })
  login(
    @Body() body: { email: string; password: string },
  ): Promise<AuthResponseDTO> {
    return this.authService.login(body.email, body.password);
  }
}
