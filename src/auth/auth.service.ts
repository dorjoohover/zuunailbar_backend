import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUserService } from 'src/app/admin.user/admin.user.service';
import { LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { MobileFormat } from 'src/common/formatter';
import { UserService } from 'src/app/user/user.service';
import { CLIENT } from 'src/base/constants';
import { FirebaseService } from 'src/base/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private adminUsersService: AdminUserService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateAdminUser(mobile: string, pass: string): Promise<any> {
    const user = await this.adminUsersService.getAdminUser(mobile);
    const isMatch = await bcrypt.compare(pass, user.password);
    if (user && isMatch == true) {
      const { password, ...result } = user;
      return result;
    }
    return false;
  }

  async adminLogin(user: any) {
    const result = await this.validateAdminUser(user.mobile, user.password);
    if (!result) {
      throw new UnauthorizedException();
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

  async login(mobile: string) {
    // otp
    const result = await this.userService.findMobile(mobile);
    if (!result) {
      throw new UnauthorizedException();
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
    console.log(res);
    return res;
  }

  async checkMobile(mobile: string) {
    return await this.userService.findMobile(mobile);
  }

  async checkOtp(otp: string) {
    return +otp == 1234;
  }

  async reset(dto: ResetPasswordDto) {
    if (!this.checkOtp(dto.otp)) return;
    return await this.userService.resetPassword(dto.mobile, dto.password);
  }
}
