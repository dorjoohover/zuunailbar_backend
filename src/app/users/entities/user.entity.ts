// user.model.ts
import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { PaginatedResponse } from 'src/common/paginated.response';

@ObjectType()
export class UserModel {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  username: string;
  @Field(() => String)
  name: string;
  @Field(() => String)
  password: string;
}
@ObjectType()
export class AuthModel {
  @Field(() => String)
  access_token: string;
  
}

@ObjectType()
export class PgUsers extends PaginatedResponse(UserModel) {}
