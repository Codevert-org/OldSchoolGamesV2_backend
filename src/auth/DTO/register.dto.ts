import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDTO {
  @ApiProperty({
    description: 'User pseudo',
    example: 'JohnDoe',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  pseudo: string;

  @ApiProperty({
    description: 'user email',
    example: 'johndoe@codevert.org',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^a-zA-Z0-9\s])([^\s]){8,16}$/gm,
    {
      message:
        'Mot de passe non valide :\n 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial, 8 à 16 caractères',
    },
  )
  @ApiProperty({
    description:
      'User password. 1 upper case, 1 lower case, 1 number, 1 special character, 8-16 characters',
    example: 'Password123!',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirm: string;

  avatarUrl?: string;
}
