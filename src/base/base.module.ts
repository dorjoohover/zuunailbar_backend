import { Module } from '@nestjs/common';
import { BaseController } from './base.controller';
import { BaseService } from './base.service';

@Module({
    providers: [BaseController, BaseService],
    exports: [BaseController, BaseService],
})
export class BaseModule {}