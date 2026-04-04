import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { mnDate } from './base/constants';
import { OrderService } from './app/order/order.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(private readonly order: OrderService) {}
  @Cron(CronExpression.EVERY_MINUTE)
  public async checkPendingOrders() {
    await this.order.checkOrders();
    console.log(new Date());
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async handleCron() {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);

    await this.order.confirmSalaryProcessStatus(undefined, mnDate(targetDate));
  }
}
