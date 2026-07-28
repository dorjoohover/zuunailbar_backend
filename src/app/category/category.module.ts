import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { CategoryDao } from './category.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryDao],
  exports: [CategoryService],
})
export class CategoryModule {}
