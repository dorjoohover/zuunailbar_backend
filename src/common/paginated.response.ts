import { ObjectType, Field, Int } from '@nestjs/graphql';
type ClassType<T = any> = new (...args: any[]) => T;
export function PaginatedResponse<T>(TItemClass: ClassType<T>) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => Int)
    count: number;

    @Field(() => Int)
    total: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    limit: number;

    @Field(() => [TItemClass])
    items: T[];
  }

  return PaginatedType;
}
