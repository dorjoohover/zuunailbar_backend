import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Public } from './auth/guards/jwt/jwt-auth-guard';
import {
  LoginDto,
  OtpDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth/auth.dto';
import { AuthService } from './auth/auth.service';
import { ApiHeader, ApiParam } from '@nestjs/swagger';
import { BadRequest } from './common/error';
import { FirebaseService } from './base/firebase.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileService } from './file.service';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';
import * as mime from 'mime-types';
import { Response } from 'express';
import { CLIENT } from './base/constants';

@Controller()
export class AppController {
  private readonly localPath = './uploads';
  constructor(
    private readonly authService: AuthService,
    private firebase: FirebaseService,
    private readonly fileService: FileService,
  ) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 8, { storage: memoryStorage() }))
  async multiFileUploadS3(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.fileService.processMultipleImages(files);
    return { files: urls };
  }

  @Public()
  @Post('/login')
  async login(@Body() dto: LoginDto) {
    return dto.password
      ? await this.authService.adminLogin(dto)
      : await this.authService.login(dto.mobile);
  }
  @ApiHeader({
    name: 'merchant-id',
    description: 'Merchant ID',
    required: true,
  })
  @Public()
  @Post('/register')
  async register(@Body() dto: RegisterDto, @Req() req) {
    // await this.firebase.sendPushNotification(dto.token, dto.title, dto.body);
    let merchantId = req.headers['merchant-id'] as string;
    BadRequest.merchantNotFound(merchantId, CLIENT);
    const res = await this.authService.checkOtp(dto.otp);
    if (res) return await this.authService.register(dto, merchantId);
    throw new BadRequest().OTP_INVALID;
  }
  @Public()
  @Get('/forget/:mobile')
  @ApiParam({ name: 'mobile' })
  async forget(@Param('mobile') mobile: string) {
    // await this.firebase.sendPushNotification(dto.token, dto.title, dto.body);
    // send otp
    try {
      await this.authService.checkMobile(mobile);
      return true;
    } catch (error) {
      return false;
    }
  }

  @Public()
  @Post('/otp')
  async otp(@Body() dto: ResetPasswordDto) {
    // await this.firebase.sendPushNotification(dto.token, dto.title, dto.body);
    try {
      await this.authService.reset(dto);
      return true;
    } catch (error) {
      return false;
    }
  }
  @Public()
  @Post('/send/otp')
  async sendOtp(@Body() dto: OtpDto) {
    // await this.firebase.sendPushNotification(dto.token, dto.title, dto.body);
    let user = null;
    try {
      user = await this.authService.checkMobile(dto.mobile);
    } catch (error) {}
    if (user) throw new BadRequest().registered;
    return true;
  }
  @Public()
  @Get('/file/:filename')
  @ApiParam({ name: 'filename' })
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(this.localPath, filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}
