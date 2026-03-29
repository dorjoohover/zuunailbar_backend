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
    const headerMerchantId = req.headers['merchant-id'] as string | undefined;
    const headerBranchId = req.headers['branch-id'] as string | undefined;
    const merchantId = payload.merchant_id ?? headerMerchantId;
    const branchId = payload.branch_id ?? headerBranchId;
    if (
      payload.merchant_id &&
      headerMerchantId &&
      headerMerchantId !== payload.merchant_id
    ) {
      throw new UnauthorizedException();
    }
    if (payload.branch_id && headerBranchId && headerBranchId !== payload.branch_id) {
      throw new UnauthorizedException();
    }
    if (merchantId) {
      merchant = await this.merchantService.findOne(merchantId);
    }
    if (branchId) {
      branch = await this.branchService.findOne(branchId);
    }
    if (branch && merchant && branch.merchant_id !== merchant.id) {
      throw new UnauthorizedException();
    }
    if (!merchant && branch) {
      merchant = await this.merchantService.findOne(branch.merchant_id);
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
