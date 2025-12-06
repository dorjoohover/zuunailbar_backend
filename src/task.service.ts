import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from './app/order/order.service';
import { IntegrationService } from './app/integrations/integrations.service';
import { UserService } from './app/user/user.service';
import {
  ADMIN,
  ADMINUSERS,
  E_M,
  mnDate,
  OrderStatus,
  toYMD,
  ubDateAt00,
  UserStatus,
} from './base/constants';
import { AvailabilitySlotsService } from './app/availability_slots/availability_slots.service';
import { ArtistLeavesService } from './app/artist_leaves/artist_leaves.service';
import { BranchLeavesService } from './app/branch_leaves/branch_leaves.service';
import { BranchService } from './app/branch/branch.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    // private readonly order: OrderService,
    // private integration: IntegrationService,
    private user: UserService,
    private branch: BranchService,
    private slots: AvailabilitySlotsService,
    private artistLeave: ArtistLeavesService,
    private branchLeave: BranchLeavesService,
  ) {}
  //   @Cron(CronExpression.EVERY_DAY_AT_11PM)

  private async updateArtistSlots(today: string) {
    const { items: artists } = await this.user.findAll(
      {
        role: E_M,
        user_status: UserStatus.Active,
      },
      ADMIN,
    );

    await artists.map(async (artist) => {
      const { items: artistLeaves } = await this.artistLeave.findAll(
        {
          artist_id: artist.id,
          start_date: today,
        },
        ADMIN,
      );
      const dates = artistLeaves.map((al) => toYMD(al.date) as unknown as Date);
      await this.slots.createByArtist(artist.id, dates);
    });
  }
  private async updateBranchSlots(today: string) {
    const { items: branches } = await this.branch.find({}, ADMIN);

    await branches.map(async (branch) => {
      const { items: branchLeaves } = await this.branchLeave.findAll(
        {
          branch_id: branch.id,
          start_date: today,
        },
        ADMIN,
      );
      const dates = branchLeaves.map((al) => toYMD(al.date) as unknown as Date);
      await this.slots.createByBranch(branch.id, dates);
    });
  }
  @Cron('0 0 * * *', {
    timeZone: 'Asia/Ulaanbaatar',
  })
  async handleCron() {
    const today = toYMD(new Date());
    await this.updateArtistSlots(today);
    await this.updateBranchSlots(today);

    console.log('Runs every day at ', new Date());
  }
  // @Cron(CronExpression.EVERY_10_SECONDS)
  // public async handleCron() {
  //   const date = ubDateAt00();
  //   const today = date.getUTCDate();
  //   if (today != 15 && today != 30) return;
  //   const users = await this.user.findAll(
  //     { skip: 0, limit: -1, sort: false, role: 35 },
  //     ADMINUSERS,
  //   );
  //   await Promise.all(
  //     users.items.map(async (user) => {
  //       const u = await this.integration.findDate(
  //         user.id,
  //         date.toISOString().slice(0, 10),
  //       );
  //       if (u.length! + 0) return;
  //       const orders = await this.order.getOrders(user.id);
  //       const order_count = orders.length;
  //       if (order_count == 0) return;
  //       const integration =
  //         Math.round(order_count * +user.percent * 1000) / 1000;
  //       await this.integration.create({
  //         amount: integration,
  //         approved_by: null,
  //         date: date,
  //         order_count: order_count,
  //         user_id: user.id,
  //       });
  //     }),
  //   );
  // }
}

// Select error! [SELECT * FROM "users" WHERE "role" <= $1 AND "role" >= $2 order by created_at desc limit -1 offset 0], [40,30]
// [Nest] 24612  - 08/19/2025, 8:20:40 PM   ERROR [Scheduler] error: LIMIT must not be negative
