import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDTO {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  avatarMessage?: string;

  @ApiProperty()
  user: {
    id: number;
    pseudo: string;
    avatarUrl: string | null;
  };
}
