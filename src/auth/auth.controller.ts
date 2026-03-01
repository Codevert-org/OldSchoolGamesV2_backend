import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDTO } from './DTO/register.dto';
import { LoginDTO } from './DTO/login.dto';
import { AuthResponseDTO } from './DTO/auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarMulterConfig } from '../commons/multer.config';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOkResponse({ type: AuthResponseDTO })
  @UseInterceptors(FileInterceptor('avatar', avatarMulterConfig))
  register(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: RegisterDTO,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AuthResponseDTO> {
    body.avatarUrl = file ? file.filename : undefined;
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDTO })
  login(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: LoginDTO,
  ): Promise<AuthResponseDTO> {
    return this.authService.login(body.email, body.password);
  }
}
