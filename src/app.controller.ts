import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/guards/jwt/jwt-auth-guard';
import { LoginDto, RegisterDto } from './auth/auth.dto';
import { AuthService } from './auth/auth.service';
import { ApiHeader } from '@nestjs/swagger';
import { BadRequest } from './common/error';
import { FirebaseService } from './base/firebase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private firebase: FirebaseService,
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
  @ApiHeader({
    name: 'merchant-id',
    description: 'Merchant ID',
    required: true,
  })
  @Public()
  @Post('/register')
  async register(@Body() dto: RegisterDto, @Req() req) {
    await this.firebase.sendPushNotification(dto.token, dto.title, dto.body);
    // let merchantId = req.headers['merchant-id'] as string;
    // BadRequest.merchantNotFound({ id: merchantId });
    // return await this.authService.register(dto.mobile, merchantId);
  }
}
