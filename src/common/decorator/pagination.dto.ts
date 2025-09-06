import { DEFAULT_LIMIT, DEFAULT_SKIP, DEFAULT_SORT } from 'src/base/constants';

export class PaginationDto {
  skip: number = DEFAULT_SKIP;
  limit: number = DEFAULT_LIMIT;
  sort: boolean = DEFAULT_SORT;
  [filter: string]: any;
  constructor(query: any) {
    this.skip = parseInt(query.page) || DEFAULT_SKIP;
    this.limit = parseInt(query.limit) || DEFAULT_SKIP;
    this.sort = query.sort || DEFAULT_SORT;
    for (const key in query) {
      if (!['page', 'limit', 'sort'].includes(key)) {
        this[key] = query[key];
      }
    }
  }
}

export class SearchDto {
  id: string;
  skip: number = DEFAULT_SKIP;
  limit: number = DEFAULT_LIMIT;
  [filter: string]: any;
  constructor(query: any) {
    this.skip = parseInt(query.page) || DEFAULT_SKIP;
    this.limit = parseInt(query.limit) || DEFAULT_SKIP;
    this.id = query.id;
    for (const key in query) {
      if (!['page', 'limit'].includes(key)) {
        this[key] = query[key];
      }
    }
  }
}
