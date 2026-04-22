import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class InvitationEventDto {
  @IsIn(['sent', 'accepted', 'canceled'])
  eventType: 'sent' | 'accepted' | 'canceled';

  @IsOptional()
  @IsNumber()
  fromId?: number;

  @IsOptional()
  @IsNumber()
  toId?: number;

  @IsOptional()
  @IsNumber()
  invitationId?: number;

  @IsOptional()
  @IsString()
  game?: string;
}
