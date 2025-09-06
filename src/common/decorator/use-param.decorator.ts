import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { P } from '../const/app.const';

// swagger api param
export function SAQ(queries?: string[]) {
  const decorators = [];
  if (queries?.length) {
    for (const param of queries) {
      decorators.push(ApiQuery({ name: param, required: false }));
    }
  } else {
    decorators.push(ApiQuery(P.ID));
  }

  return applyDecorators(...decorators);
}
// swagger api query
export function SAP(params?: string[]) {
  const decorators = [];
  if (params?.length) {
    for (const param of params) {
      decorators.push(ApiParam({ name: param, required: false }));
    }
  } else {
    decorators.push(ApiParam(P.ID));
  }

  return applyDecorators(...decorators);
}
