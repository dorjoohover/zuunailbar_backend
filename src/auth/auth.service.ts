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
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    body, h1, h2, h3, p, a, div {
      font-family: 'Montserrat', sans-serif;
    }
  </style>
</head>

<body style="margin:0; padding:0; min-width:100%; margin-top:10px;">
  <center style="width:100%; table-layout:fixed; padding-bottom:20px;">
    <div style="max-width:600px; margin:0 auto;">

      <table width="600" cellspacing="0" cellpadding="0" border="0" align="center">
        <tr>
          <td>

            <!-- HEADER -->
            <table align="center" cellpadding="0" cellspacing="0" border="0"
              style="width:100%; max-width:600px; background-color:#ffffff; border-collapse:collapse;">
              <tr>
                <td style="
                    background: linear-gradient(135deg, #1F2937 0%, #111827 100%);
                    padding:20px 40px;
                    text-align:left;">

                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <!-- LOGO -->
                      <td style="width:80%; vertical-align:middle;">
                        <img src="https://zunailbar.mn/_next/image?url=%2Flogo%2Fzu-white.png&amp;w=128&amp;q=7"
                          width="130"
                          alt="Zunailbar Logo"
                          style="display:block; border:0;">
                      </td>

                      <!-- BUTTON -->
                      <td style="width:20%; text-align:right; vertical-align:middle;">
                        <table cellspacing="0" cellpadding="0" border="0" align="right">
                          <tr>
                            <td style="border-radius:99px; background:#ffffff; mso-padding-alt:10px 16px;">
                              <a href="https://zunailbar.mn"
                                style="padding:10px 16px;
                                       color:#D4AF37 !important;
                                       font-size:14px;
                                       font-weight:600;
                                       text-decoration:none;
                                       display:inline-block;">
                                Зочлох
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>

                    </tr>
                  </table>

                </td>
              </tr>

              <tr>
                <td style="background:#fafafa; padding:20px 40px 10px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">

                    <tr>
                      <td style="font-size:14px; color:#333;">
                        Өдрийн мэнд,
                      </td>
                    </tr>

                    <tr>
                      <td style="font-size:14px; line-height:1.6; color:#333; text-align:justify;">
                        <p style="margin:0 0 15px 0;">
                          Та Zunailbar Salon платформд нэвтрэх/бүртгүүлэх гэж байна. Доорх **баталгаажуулах кодыг** оруулна уу.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="text-align:center; padding:25px 0;">
                        <div style="
                          font-size:32px;
                          font-weight:700;
                          letter-spacing:8px;
                          color:#D4AF37;
                          background:#ffffff;
                          display:inline-block;
                          padding:12px 24px;
                          border-radius:8px;
                          border:1px solid #e5e5e5;
                          ">
                          ${otp}
                        </div>
                      </td>
                    </tr>

                 

                    <tr>
                      <td style="font-size:14px; line-height:1.6; color:#333;">
                        <p style="margin:0 0 15px 0;">
                          Хэрвээ та энэ үйлдлийг өөрөө хийгээгүй бол энэхүү и-мэйлийг үл тооно уу.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="font-size:14px; line-height:1.6; color:#333;">
                        <p style="margin:0 0 15px 0;">
                          Хүндэтгэсэн,<br/>
                          <b>Zunailbar Salon</b>
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="background:#f5f5f5; padding:20px; text-align:center; font-size:12px; color:#777; border-top:1px solid #eee;">
                  <p style="margin:0; line-height:1.5;">
                    © ${new Date().getFullYear()} Zunailbar Salon — Бүх эрх хуулиар хамгаалагдсан.
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </div>
  </center>
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
      const text = `Таны OTP код: ${otp}\n
                             Хүндэтгэсэн`;
      const url = `${process.env.TELCOCOM_URL}?tenantId=${process.env.TELCOCOM}&fromNumber=${process.env.FROM_NUMBER}&toNumber=${mobile}&sms=${text}`;
      console.log(url);
      const res = await axios.get(url, {
        headers: {
          'telco-auth-token': process.env.TELCOCOM_TOKEN,
        },
      });
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
