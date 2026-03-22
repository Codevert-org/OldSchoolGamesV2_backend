import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: true },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const unexpected = errors
          .filter((e) => e.constraints?.whitelistValidation)
          .map((e) => e.property);
        const invalid = errors
          .filter((e) => !e.constraints?.whitelistValidation)
          .map((e) => e.property);
        const parts = ['Données incorrectes.'];
        if (unexpected.length > 0) {
          parts.push(`Propriétés inattendues : ${unexpected.join(', ')}`);
        }
        if (invalid.length > 0) {
          parts.push(`Données invalides : ${invalid.join(', ')}`);
        }
        return new HttpException(
          { message: parts.join('\n') },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'assets'), {
    prefix: '/assets/',
  });

  const config = new DocumentBuilder()
    .setTitle('OldSchoolGames API')
    .setDescription('The OldSchoolGames API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(3000);
}
bootstrap();
