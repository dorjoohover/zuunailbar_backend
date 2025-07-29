import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/guards/jwt/jwt-auth-guard';
import { LoginDto } from './auth/auth.dto';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Post('/login')
  async login(@Body() dto: LoginDto) {
    return await this.authService.adminLogin(dto);
  }
}
