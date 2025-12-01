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
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    private adminUsersService: AdminUserService,
    private userService: UserService,
    private jwtService: JwtService,
    private mailer: MailerService,
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

  async sentOtpMail(email: string) {
    try {
      const otp = this.generateOtp();
      this.otps[email] = otp;
      await this.mailer.sendMail({
        to: email,
        subject: 'И-мэйл хаяг баталгаажуулах – Zunailbar Salon',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP баталгаажуулалт</title>
  <style>
    body { font-family: 'Montserrat', sans-serif; margin:0; padding:0; background:#fff0f3; }
    .container { max-width:600px; margin:0 auto; padding:20px; }
    .card { background:#fff; border-radius:12px; overflow:hidden; border:1px solid #F43F5E; }
    .header { background: #FB7185; padding:20px 30px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #F43F5E; }
    .btn { display:inline-block; padding:10px 16px; border-radius:99px; font-weight:600; font-size:14px; text-decoration:none; color:#fff !important; background: linear-gradient(135deg, #FB7185 0%, #F43F5E 100%); }
    .btn:hover { background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%); }
    .body { padding:30px 30px; color:#881337; text-align:center; }
    .otp { font-size:36px; font-weight:bold; letter-spacing:8px; color:#E11D48; margin:20px 0; font-family:monospace; }
    .footer { background:#ffe4ec; padding:20px; font-size:12px; color:#881337; border-top:1px solid #F43F5E; text-align:center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <img src="https://zunailbar.mn/_next/image?url=%2Flogo%2Fzu-white.png&w=128&q=7" width="120" alt="Zunailbar Logo">
      </div>
      <div class="body">
        <p>Өдрийн мэнд,</p>
        <p>Та доорх <strong>баталгаажуулах кодыг</strong> оруулна уу:</p>
        <p style="color:transparent; user-select:none;">
  <span style="color:#FB7185;font-weight:bold; font-size:32px">${otp}</span>
</p>
        <p>Хүндэтгэсэн,<br/><b>Zunailbar Salon</b></p>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Zunailbar Salon — Бүх эрх хуулиар хамгаалагдсан.
      </div>
    </div>
  </div>
</body>
</html>
`,
      });
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async sendOtp(mobile: string) {
    try {
      const otp = this.generateOtp();
      this.otps[mobile] = otp;
      console.log(otp);
      const text = `Your OTP code is: ${otp}\n
                    Thank you.`;
      const url = `${process.env.TELCOCOM_URL}?tenantId=${process.env.TELCOCOM}&fromNumber=${process.env.FROM_NUMBER}&toNumber=${mobile}&sms=${text}`;
      const res = await axios.get(url, {
        headers: {
          'telco-auth-token': process.env.TELCOCOM_TOKEN,
        },
      });
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
