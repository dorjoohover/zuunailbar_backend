import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from 'src/auth/constants';
import { MerchantService } from 'src/app/merchant/merchant.service';
import { AdminUserService } from 'src/app/admin.user/admin.user.service';
import { DashRequest, DashUser } from 'src/auth/extentions';
import { ADMIN } from 'src/base/constants';
import { BranchService } from 'src/app/branch/branch.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private merchantService: MerchantService,
    private adminUsersService: AdminUserService,
    private branchService: BranchService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true,
    });
  }

  async validate(req: DashRequest, payload: any) {
    let merchant;
    let branch;
    const merchantId = req.headers['merchant-id'] as string;
    const branchId = req.headers['branch-id'] as string;
    if (merchantId) {
      merchant = await this.merchantService.findOne(merchantId);
    }
    if (branchId) {
      branch = await this.branchService.findOne(branchId);
    }
    const user = await this.adminUsersService.getAdminUserById(payload);

    if (!user) {
      throw new UnauthorizedException();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // req.user.app = payload.app;
    const { password, ...result } = user;

    return <DashUser>{
      user: result,
      merchant,
      branch,
    };
  }
}
