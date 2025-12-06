import { forwardRef, Module } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ServiceDao } from './service.dao';
import { DiscountModule } from '../discount/discount.module';
import { UserSalariesModule } from '../user_salaries/user_salaries.module';
import { BranchServiceModule } from '../branch_service/branch_service.module';
import { BranchModule } from '../branch/branch.module';
import { UserModule } from '../user/user.module';
import { ServiceCategoryModule } from '../service_category/service_category.module';
import { UserServiceModule } from '../user_service/user_service.module';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    DiscountModule,
    UserSalariesModule,
    forwardRef(() => BranchServiceModule),
    BranchModule,
    forwardRef(() => UserModule),
    forwardRef(() => UserServiceModule),
    ServiceCategoryModule,
  ],
  controllers: [ServiceController],
  providers: [ServiceService, ServiceDao],
  exports: [ServiceService],
})
export class ServiceModule {}
