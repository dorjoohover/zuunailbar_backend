import { Module } from '@nestjs/common';
import { AppDB } from './pg/app.db';

@Module({
  imports: [],
  controllers: [],
  providers: [AppDB],
  exports: [AppDB],
})
export class AppDbModule {}
