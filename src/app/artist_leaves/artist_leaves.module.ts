import { Module } from '@nestjs/common';
import { ArtistLeavesService } from './artist_leaves.service';
import { ArtistLeavesController } from './artist_leaves.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ArtistLeavesDao } from './artist_leaves.dao';
import { AvailabilitySlotsModule } from '../availability_slots/availability_slots.module';

@Module({
  imports: [AppDbModule, BaseModule, AvailabilitySlotsModule],
  controllers: [ArtistLeavesController],
  providers: [ArtistLeavesService, ArtistLeavesDao],
  exports: [ArtistLeavesService],
})
export class ArtistLeavesModule {}
