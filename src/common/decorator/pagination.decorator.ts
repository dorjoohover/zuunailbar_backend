import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginationDto, SearchDto } from './pagination.dto';

export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationDto => {
    const request = ctx.switchToHttp().getRequest();
    return new PaginationDto(request.query);
  },
);
export const Filter = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SearchDto => {
    const request = ctx.switchToHttp().getRequest();
    return new SearchDto(request.query);
  },
);
