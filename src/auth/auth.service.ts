import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/app/users/users.service';
import * as bcrypt from 'bcrypt';
import { CreateUserInput } from 'src/app/users/dto/create-user.input';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user._id,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: '1d',
        secret: this.configService.get<string>('JWT_SECRET'),
      }),
    };
  }

  async register(input: CreateUserInput) {
    const hashed = await bcrypt.hash(input.password, 10);
    this.usersService.create({ ...input, password: hashed });
    return true;
  }
}
