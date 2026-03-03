import { Injectable, Logger } from '@nestjs/common';
import { UserService } from './app/user/user.service';
import { ArtistLeavesService } from './app/artist_leaves/artist_leaves.service';
import { BranchLeavesService } from './app/branch_leaves/branch_leaves.service';
import { BranchService } from './app/branch/branch.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ADMINUSERS,
  mnDate,
  SALARY_LOG_STATUS,
  SalaryStatus,
  ubDateAt00,
} from './base/constants';
import { IntegrationService } from './app/integrations/integrations.service';
import { OrderService } from './app/order/order.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly order: OrderService,
    private integration: IntegrationService,
    private user: UserService,
  ) {}
  @Cron(CronExpression.EVERY_MINUTE)
  public async checkPendingOrders() {
    await this.order.checkOrders();
    console.log(new Date());
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  public async handleCron() {
    const date = new Date();
    const users = await this.user.findAll(
      { skip: 0, limit: -1, sort: false, role: 35 },
      ADMINUSERS,
    );
    await Promise.all(
      users.items.map(async (user) => {
        const u = await this.integration.findDate(
          user.id,
          date.toISOString().slice(0, 10),
        );
        if (u.length! + 0) return;
        const orders = await this.order.getOrders(
          user.id,
          user.salary_day ?? 5,
        );
        const order_count = orders.length;
        if (order_count == 0) return;
        const integration =
          Math.round(order_count * +user.percent * 1000) / 1000;
        await this.integration.create({
          amount: integration,
          approved_by: null,
          date: date,
          order_count: order_count,
          artist_id: user.id,
          salary_status: SALARY_LOG_STATUS.Pending,
        });
      }),
    );
  }
}
