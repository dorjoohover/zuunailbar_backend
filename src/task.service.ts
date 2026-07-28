import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { mnDate } from './base/constants';
import { OrderService } from './app/order/order.service';
import { ScheduleService } from './app/schedule/schedule.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly order: OrderService,
    private readonly schedule: ScheduleService,
  ) {}
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

  /**
   * Артистуудын цагийн хуваарийг (schedules) app_config.availability_days-аар
   * тодорхойлогдсон цонхонд байнга бөглөгдсөн байлгана — admin шинэ долоо
   * хоног өгөөгүй өдрүүдийг өмнөх долоо хоногоос автоматаар хуулна.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async generateScheduleWindow() {
    try {
      const res = await this.schedule.ensureAvailabilityWindow();
      this.logger.log(
        `Schedule window generated: ${res.created} row(s) for ${res.artists} artist(s)`,
      );
    } catch (error) {
      this.logger.error('Schedule window generation failed', error as Error);
    }
  }
}
