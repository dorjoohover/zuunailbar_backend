import { Module } from '@nestjs/common';
import { BaseController } from './base.controller';
import { BaseService } from './base.service';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [BaseController, BaseService, FirebaseService],
  exports: [BaseController, BaseService, FirebaseService],
})
export class BaseModule {}
