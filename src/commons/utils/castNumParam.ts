import { BadRequestException } from '@nestjs/common';

export function castNumParam(
  paramName: string,
  paramValue: string | number,
): number {
  if (isNaN(+paramValue)) {
    throw new BadRequestException(`Param ${paramName} must be a number`);
  }
  return +paramValue;
}
