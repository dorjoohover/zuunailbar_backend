import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { PgUsers, UserModel } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { PgArgs } from 'src/common/pagination.input';
import { MetaModel } from 'src/base/base.entity';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => UserModel)
  createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.usersService.create(createUserInput);
  }

  @Query(() => PgUsers, { name: 'users' })
  findAll(@Args() pg: PgArgs) {
    return this.usersService.find(pg);
  }

  @Query(() => UserModel, { name: 'user', nullable: true })
  findOne(@Args('name', { type: () => String }) name: string) {
    return this.usersService.findOne(name);
  }

  @Mutation(() => UserModel)
  updateUser(@Args('updateUserInput') updateUserInput: UpdateUserInput) {
    return this.usersService.update(updateUserInput.id, updateUserInput);
  }

  @Mutation(() => UserModel)
  removeUser(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.remove(id);
  }
}
