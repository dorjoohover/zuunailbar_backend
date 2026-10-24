import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUserService } from 'src/app/admin.user/admin.user.service';
import {
  LoginDto,
  RegisterDto,
  ResetCurrentPasswordDto,
  ResetPasswordDto,
} from './auth.dto';
import { UserService } from 'src/app/user/user.service';
import { ADMIN, CLIENT } from 'src/base/constants';
import { AuthError, BadRequest } from 'src/common/error';
import { MobileFormat, MobileParser } from 'src/common/formatter';
import axios from 'axios';
import { ResendService } from './resend.service';
import { MessageLogDao } from './message.log.dao';
import { WeSendService } from './wesend.service';

type CancelWarningPayload = {
  order_date?: string;
  time?: string;
};
@Injectable()
export class AuthService {
  constructor(
    private adminUsersService: AdminUserService,
    private userService: UserService,
    private jwtService: JwtService,
    private readonly mailer: ResendService,
    private readonly messageLog: MessageLogDao,
    private readonly wesendService: WeSendService,
  ) {}
  private authError = new AuthError();
  private otps: Record<string, string> = {};

  private getOtpKeys(identifier?: string | null) {
    if (!identifier) return [];

    const value = identifier.trim();
    if (!value) return [];

    const keys = new Set<string>([value]);

    if (value.includes('@')) {
      keys.add(value.toLowerCase());
    } else {
      keys.add(MobileFormat(value));
    }

    return [...keys];
  }

  private saveOtp(identifier: string, otp: string) {
    this.getOtpKeys(identifier).forEach((key) => {
      this.otps[key] = otp;
    });
  }

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

  async validateClientUser(identifier: string, pass: string): Promise<any> {
    let user;
    try {
      user = await this.userService.findMobile(identifier);
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
    const result = await this.validateClientUser(dto.mobile, dto.password);

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
      firstname: dto.firstname,
      role: CLIENT,
      lastname: dto.lastname,
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
      this.saveOtp(email, otp);
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
        <img src="https://api.zunailbar.mn/api/v1/file/1773920646644_zu-white.png" width="120" alt="Zunailbar Logo">
      </div>
      <div class="body">
        <p>Өдрийн мэнд,</p>
        <p>Таны баталгаажуулах код: <strong style="color:#FB7185; font-size:32px;">${otp}</strong></p>

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
      return false;
    }
  }

  private async sendSms(mobile: string, text: string): Promise<boolean> {

    const data = await this.wesendService.sendSMS(
      MobileParser(mobile),
      `${text}`,
    );


    return data;
  }

  async getSmsLogs(query: { skip?: number; limit?: number } = {}) {
    return this.messageLog.list(query);
  }

  async getSmsBalance() {
    const [balance, pricing] = await Promise.all([
      this.wesendService.getBalance(),
      this.wesendService.getPrice(),
    ]);
    return { balance, pricing };
  }

  async sendOtp(mobile: string): Promise<boolean> {
    const otp = this.generateOtp();
    this.saveOtp(mobile, otp);

    const text = [`Tanii neg udaagiin kod: ${otp}`, 'Bayarlalaa.'].join('\n');

    return this.sendSms(mobile, text);
  }

  async sendCancelWarning(
    mobile: string,
    payload: CancelWarningPayload,
  ): Promise<boolean> {
    const datePart = payload.order_date ? ` ${payload.order_date}` : '';
    const timePart = payload.time ? ` ${payload.time}` : '';

    const text = `Tanii ${datePart} ${timePart} zahialga uridchilgaa tulbur tulj batalgaajuulaagui tul tsutslagdlaa. Bayarlalaa`;
    return this.sendSms(mobile, text);
  }

  async sendServiceReminder(mobile: string, services: string): Promise<boolean> {
    // үйлчилгээний нэр кирилл тул SMS unicode (60 тэмдэгт/хэсэг) — богино байлгах
    const text = `Sain baina uu! Tany humsnii budag 28 honog bolloo. Humsnii budgaa shinechleh tsag boljee! https://zunailbar.mn/order`;
    return this.sendSms(mobile, text);
  }

  async sendCustomerCancelSms(
    mobile: string,
    payload: CancelWarningPayload,
  ): Promise<boolean> {
    const datePart = payload.order_date ? ` ${payload.order_date}` : '';
    const timePart = payload.time ? ` ${payload.time}` : '';
    const text = `Ta ${datePart} ${timePart} tsagiin zahialgaa online tsag zahialgiin systemiin minii tsag zahialga tsesnees tsutsallaa. Hervee sanamsargui tsutsalsan bol yaraltai 86080708 dugaart holbogdono uu`;
    return this.sendSms(mobile, text);
  }
  async checkOtp(otp: string, mobile: string) {
    const keys = new Set(this.getOtpKeys(mobile));
    let user = null;

    try {
      user = await this.checkMobile(mobile);
    } catch (error) {
      user = null;
    }

    this.getOtpKeys(user?.mobile).forEach((key) => keys.add(key));
    this.getOtpKeys(user?.mail).forEach((key) => keys.add(key));

    return [...keys].some((key) => this.otps[key] === otp);
  }

  async reset(dto: ResetPasswordDto) {
    if (!(await this.checkOtp(dto.otp, dto.mobile))) {
      throw new BadRequest().OTP_INVALID;
    }

    // Нууц үг сэргээх урсгалд овог/нэр асуухаа больсон — зөвхөн нууц үг солино.
    const updated = await this.userService.resetPassword(
      dto.mobile,
      dto.password,
    );

    if (!updated) {
      throw new BadRequest().unregistered;
    }

    return updated;
  }
  async resetPassword(
    dto: ResetCurrentPasswordDto,
    mobile: string,
    role?: number,
  ) {
    if (role !== undefined && role >= CLIENT) {
      await this.validateClientUser(mobile, dto.password);
    } else {
      await this.validateAdminUser(mobile, dto.password);
    }
    const res = await this.userService.resetPassword(
      mobile,
      dto.newPassword,
      dto.lastname,
      dto.firstname,
    );
    return res;
  }
}
