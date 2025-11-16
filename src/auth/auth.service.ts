import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUserService } from 'src/app/admin.user/admin.user.service';
import { LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { MobileFormat } from 'src/common/formatter';
import { UserService } from 'src/app/user/user.service';
import { ADMIN, CLIENT } from 'src/base/constants';
import { FirebaseService } from 'src/base/firebase.service';
import { AuthError, BadRequest } from 'src/common/error';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private adminUsersService: AdminUserService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}
  private authError = new AuthError();
  private otps: Record<string, string> = {};

  async validateAdminUser(mobile: string, pass: string): Promise<any> {
    let user;
    try {
      user = await this.adminUsersService.getAdminUser(mobile);
    } catch (error) {
      user = null;
    }

    if (user == null) this.authError.unregister;

    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch != true) this.authError.wrongPassword;

    if (user && isMatch == true) {
      const { password, ...result } = user;
      return result;
    }
  }

  async adminLogin(user: any, role = ADMIN) {
    const result = await this.validateAdminUser(user.mobile, user.password);
    if (result.role > role) {
      this.authError.checkPermission;
    }
    return {
      accessToken: this.jwtService.sign({
        ...result,
      }),
      firstname: result.firstname,
      role: result.role,
      lastname: result.lastname,
      phone: result.phone,
      merchant_id: result.merchant_id,
      branch_id: result.branch_id,
    };
  }

  async login(dto: LoginDto) {
    const result = await this.validateAdminUser(dto.mobile, dto.password);

    return {
      accessToken: this.jwtService.sign({
        ...result,
      }),
      firstname: result.firstname,
      role: result.role,
      lastname: result.lastname,
      phone: result.phone,
      merchant_id: result.merchant_id,
      branch_id: result.branch_id,
    };
  }

  async register(dto: RegisterDto, merchant: string) {
    const { id, mobile } = await this.userService.register(dto, merchant);
    const res = {
      accessToken: this.jwtService.sign({
        firstname: null,
        role: CLIENT,
        lastname: null,
        phone: mobile,
        merchant_id: merchant,
        branch_id: null,
        id: id,
      }),
      firstname: null,
      role: CLIENT,
      lastname: null,
      phone: mobile,
      merchant_id: merchant,
      branch_id: null,
    };
    return res;
  }

  async checkMobile(mobile: string) {
    return await this.userService.findMobile(mobile);
  }

  generateOtp() {
    const random = Math.floor(1000 + Math.random() * 9000);
    return random.toString();
  }

  async sendOtp(mobile: string) {
    try {
      const otp = this.generateOtp();
      this.otps[mobile] = otp;
      console.log(otp);
      const res = await axios.get(
        `${process.env.TELCOCOM_URL}?toNumber=${mobile}&sms=Таны OTP код: ${otp}\n
                             Хүндэтгэсэн &tenantId=${process.env.TELCOCOM}`,
        {
          headers: {
            'telco-auth-token': process.env.TELCOCOM_TOKEN,
          },
        },
      );
      console.log(res);
      const { result, message, data } = res.data;
      console.log(message, data, result);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async checkOtp(otp: string, mobile: string) {
    return this.otps[mobile] && this.otps[mobile] == otp;
  }

  async reset(dto: ResetPasswordDto) {
    if (!this.checkOtp(dto.otp, dto.mobile)) return;
    return await this.userService.resetPassword(dto.mobile, dto.password);
  }
}
