import { ArgsType, Field, Int } from '@nestjs/graphql';
import { DEFAULT_LIMIT, DEFAULT_PAGE, DEFAULT_SORT } from './constants';

@ArgsType()
export class PgArgs {
  @Field(() => Int, { defaultValue: DEFAULT_PAGE })
  page: number;

  @Field(() => Int, { defaultValue: DEFAULT_LIMIT })
  limit: number;

  @Field(() => Boolean, { defaultValue: DEFAULT_SORT })
  sort: boolean;
}
