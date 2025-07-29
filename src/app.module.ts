import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import databaseConfig from './config/database.config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AdminUserModule } from './app/admin.user/admin.user.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt/jwt-auth-guard';
import { RolesGuard } from './auth/guards/role/role.guard';
import { AllExceptionsFilter } from './core/utils/all-exceptions.filter';
import { PostInterceptor } from './core/utils/post.interceptor';
import { AppDbModule } from './core/db/database.module';
import { BranchModule } from './app/branch/branch.module';
import { UserModule } from './app/user/user.module';
import { ServiceModule } from './app/service/service.module';
import { DiscountModule } from './app/discount/discount.module';
import { CategoryModule } from './app/category/category.module';
import { BrandModule } from './app/brand/brand.module';
import { ScheduleModule } from './app/schedule/schedule.module';
import { SalaryLogModule } from './app/salary_log/salary_log.module';
import { ProductModule } from './app/product/product.module';
import { OrderModule } from './app/order/order.module';
import { OrderDetailModule } from './app/order_detail/order_detail.module';
import { ProductTransactionModule } from './app/product_transaction/product_transaction.module';
import { UserServiceModule } from './app/user_service/user_service.module';
import { UserProductModule } from './app/user_product/user_product.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
      load: [configuration, databaseConfig],
    }),

    AppDbModule,
    AuthModule,
    AdminUserModule,
    BranchModule,
    UserModule,
    ServiceModule,
    DiscountModule,
    CategoryModule,
    BrandModule,
    ScheduleModule,
    SalaryLogModule,
    ProductModule,
    OrderModule,
    OrderDetailModule,
    ProductTransactionModule,
    UserServiceModule,
    UserProductModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PostInterceptor,
    },
  ],
})
export class AppModule {}
