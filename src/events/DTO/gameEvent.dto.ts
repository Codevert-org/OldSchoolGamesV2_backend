import { IsIn, IsOptional, IsString } from 'class-validator';

export class GameEventDto {
  @IsIn(['play', 'reload', 'leave', 'getGameData'])
  eventType: 'play' | 'reload' | 'leave' | 'getGameData';

  @IsString()
  roomName: string;

  @IsOptional()
  data?: any;
}
