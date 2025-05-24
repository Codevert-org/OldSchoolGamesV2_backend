import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDTO } from './DTO/register.dto';
import { AuthResponseDTO } from './DTO/auth.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOkResponse({ type: AuthResponseDTO })
  register(@Body() body: RegisterDTO): Promise<AuthResponseDTO> {
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
