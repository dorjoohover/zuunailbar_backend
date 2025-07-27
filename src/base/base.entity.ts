import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class MetaModel {
  @Field(() => Int)
  count: number;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => [String], { nullable: true })
  items?: string[];
}
