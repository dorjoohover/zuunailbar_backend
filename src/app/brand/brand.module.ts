import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { BrandDao } from './brand.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [BrandController],
  providers: [BrandService, BrandDao],
  exports: [BrandService],
})
export class BrandModule {}
