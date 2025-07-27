import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { CreateUserInput } from 'src/app/users/dto/create-user.input';
import { Admin } from './guard/roles.decorator';
import { AuthModel, UserModel } from 'src/app/users/entities/user.entity';
import { UsersService } from 'src/app/users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import { Public } from './guard/public.decorator';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}
  @Public()
  @Mutation(() => Boolean, { name: 'register', nullable: true })
  async register(@Args('input') input: CreateUserInput) {
    return this.authService.register(input);
  }
  @Public()
  @Mutation(() => AuthModel, { name: 'login' })
  async login(
    @Args('username') username: string,
    @Args('password') password: string,
  ) {
    const user = await this.authService.validateUser(username, password);
    if (!user) throw new UnauthorizedException('Wrong credentials');
    const res = this.authService.login(user);
    return res;
  }

  @Query(() => String)
  whoAmI(@Context() context) {
    return context.req.user.username;
  }

  // @Public()
  @Query(() => String, { name: 'asdf', nullable: true })
  findOne() {
    return 'asdf';
  }

  @Query(() => [UserModel])
  @Admin()
  getAllUsers() {
    return this.userService.findAll();
  }
}
