import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { P } from '../const/app.const';

// swagger api param
export function SAP(any?: string) {
  return applyDecorators(
    any
      ? ApiParam({
          name: any,
        })
      : ApiParam(P.ID),
  );
}
// swagger api query
export function SAQ(any?: string) {
  return applyDecorators(
    any
      ? ApiQuery({
          name: any,
        })
      : ApiQuery(P.ID),
  );
}
