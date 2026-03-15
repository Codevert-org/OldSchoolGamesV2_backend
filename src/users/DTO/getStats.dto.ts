import { IsIn } from 'class-validator';

export class GetStatsDto {
  @IsIn(['week', 'month', 'year'])
  period: 'week' | 'month' | 'year';
}
