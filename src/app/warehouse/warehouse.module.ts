import { Module } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { WarehouseDao } from './warehouse.dao';

@Module({
  imports: [AppDbModule, BaseModule],

  controllers: [WarehouseController],
  providers: [WarehouseService, WarehouseDao],
  exports: [WarehouseService],
})
export class WarehouseModule {}
