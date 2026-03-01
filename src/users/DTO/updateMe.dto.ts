import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMeDTO {
  @IsOptional()
  @IsString()
  @MinLength(2)
  pseudo?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  oldPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPasswordConfirm?: string;
}
