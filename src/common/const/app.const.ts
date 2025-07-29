// pagination

import { DEFAULT_LIMIT, DEFAULT_SKIP, DEFAULT_SORT } from 'src/base/constants';

export class Q {
  static PAGE = {
    name: 'page',
    default: DEFAULT_SKIP,
  };
  static SKIP = {
    name: 'limit',
    default: DEFAULT_LIMIT,
  };
  static SORT = {
    name: 'sort',
    default: DEFAULT_SORT,
  };
}

export class P {
  static ID = {
    name: 'id',
  };
}
