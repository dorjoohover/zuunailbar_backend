import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { JwtStrategy } from './guards/jwt/jwt.strategy';
import { MerchantModule } from 'src/app/merchant/merchant.module';
import { AdminUserModule } from 'src/app/admin.user/admin.user.module';
import { AuthService } from './auth.service';
import { BranchModule } from 'src/app/branch/branch.module';
import { UserModule } from 'src/app/user/user.module';

@Module({
  imports: [
    AdminUserModule,
    MerchantModule,
    PassportModule,
    BranchModule,
    UserModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
