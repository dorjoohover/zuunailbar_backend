import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ServiceModule } from '../service/service.module';
import { HomeDao } from './home.dao';

@Module({
  imports: [AppDbModule, BaseModule, ServiceModule],

  controllers: [HomeController],
  providers: [HomeService, HomeDao],
  exports: [HomeService],
})
export class HomeModule {}
