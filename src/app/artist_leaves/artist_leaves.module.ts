import { Module } from '@nestjs/common';
import { ArtistLeavesService } from './artist_leaves.service';
import { ArtistLeavesController } from './artist_leaves.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ArtistLeavesDao } from './artist_leaves.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [ArtistLeavesController],
  providers: [ArtistLeavesService, ArtistLeavesDao],
  exports: [ArtistLeavesService],
})
export class ArtistLeavesModule {}
