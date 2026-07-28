import { Injectable } from '@nestjs/common';
import { VoucherDao } from './voucher.dao';
import { VoucherDto } from './voucher.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  ADMIN,
  CLIENT,
  getDefinedKeys,
  STATUS,
  UserLevel,
  VoucherStatus,
  usernameFormatter,
} from 'src/base/constants';
import { ServiceService } from '../service/service.service';
import { UserService } from '../user/user.service';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class VoucherService {
  private rewardConfig: {
    customer: Partial<
      Record<UserLevel, { name: string; type: number; value: number }>
    >;
  } = {
    customer: {
      [UserLevel.BRONZE]: { name: 'Bronze урамшуулал', type: 20, value: 0 },
      [UserLevel.SILVER]: { name: 'Silver урамшуулал', type: 20, value: 0 },
      [UserLevel.GOLD]: { name: 'Gold урамшуулал', type: 20, value: 0 },
    },
  };

  constructor(
    private readonly dao: VoucherDao,
    private serviceService: ServiceService,
    private userService: UserService,
  ) {}

  private voucherLevelKey(level: UserLevel) {
    return {
      [UserLevel.BRONZE]: 'bronze',
      [UserLevel.SILVER]: 'silver',
      [UserLevel.GOLD]: 'gold',
    }[level];
  }

  private rewardLevels() {
    return [UserLevel.BRONZE, UserLevel.SILVER, UserLevel.GOLD];
  }

  public async create(dto: VoucherDto) {
    if (dto.level !== undefined && dto.level !== null && !dto.user_id) {
      const users = await this.userService.findAll(
        {
          role: CLIENT,
          level: dto.level,
          limit: -1,
        } as any,
        ADMIN,
      );

      const ids = await Promise.all(
        users.items.map((user) => this.createOne(dto, user)),
      );

      return { count: ids.filter(Boolean).length };
    }

    const user = dto.user_id ? await this.userService.findOne(dto.user_id) : null;
    return await this.createOne(dto, user);
  }

  private async createOne(dto: VoucherDto, user?: any) {
    const service = dto.service_id
      ? await this.serviceService.findOne(dto.service_id)
      : null;

    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      status: STATUS.Active,
      user_id: user?.id ?? dto.user_id,
      level: dto.level ?? user?.level ?? null,
      value: Number(dto.value ?? 0),
      voucher_status: dto.voucher_status ?? VoucherStatus.Available,
      service_name: service?.name ?? null,
      user_name: user ? usernameFormatter(user) : null,
      mobile: user?.mobile ?? null,
    });
  }

  public async findAll(dto: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(dto, role));
  }

  public async findMine(dto: PaginationDto, userId: string) {
    return await this.dao.list(
      applyDefaultStatusFilter(
        {
          ...dto,
          user_id: userId,
        } as PaginationDto,
        CLIENT,
      ),
    );
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  //   public async calculateDiscountedPrice(
  //     type: number,
  //     value: number,
  //     min_price: number,
  //     max_price?: number,
  //   ) {
  //     const calculate = (amount: number) => {
  //       if (type === DISCOUNT.Percent) {
  //         return {
  //           discountedAmount: round(((100 - value) * amount) / 100),
  //           discount: round((value * amount) / 100),
  //           discountValue: `${value}%`,
  //           discountType: DiscountValue[DISCOUNT.Percent],
  //         };
  //       }

  //       if (type === DISCOUNT.Price) {
  //         return {
  //           discountedAmount: amount - value,
  //           discount: value,
  //           discountValue: value,
  //           discountType: DiscountValue[DISCOUNT.Price],
  //         };
  //       }

  //       return null;
  //     };

  //     return {
  //       min: calculate(min_price),
  //       ...(max_price ? { max: calculate(max_price) } : {}),
  //     };
  //   }
  public async findByService(id: string) {
    return await this.dao.getByService(id);
  }

  public async availableByUser(userId: string, orderId?: string) {
    return await this.dao.availableByUser(userId, orderId);
  }

  public async update(id: string, dto: VoucherDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async getConfig() {
    const keys = this.rewardLevels().flatMap((level) => {
      const key = this.voucherLevelKey(level);
      return [
        `voucher_reward_${key}_name`,
        `voucher_reward_${key}_type`,
        `voucher_reward_${key}_value`,
      ];
    });
    const config = await this.dao.getConfigValues(keys).catch(() => ({}));
    const numberValue = (key: string, fallback: number) => {
      const value = Number(config?.[key]?.value);
      return Number.isFinite(value) ? value : fallback;
    };

    this.rewardConfig = {
      customer: this.rewardLevels().reduce((acc, level) => {
        const key = this.voucherLevelKey(level);
        const fallback = this.rewardConfig.customer[level];
        acc[level] = {
          name:
            config?.[`voucher_reward_${key}_name`]?.value_text ??
            fallback.name,
          type: numberValue(`voucher_reward_${key}_type`, fallback.type),
          value: numberValue(`voucher_reward_${key}_value`, fallback.value),
        };
        return acc;
      }, {} as Record<number, { name: string; type: number; value: number }>),
    };

    return this.rewardConfig;
  }

  public async updateConfig(dto: any) {
    const current = await this.getConfig();
    const incoming = dto?.customer ?? dto ?? {};
    this.rewardConfig = {
      customer: {
        ...current.customer,
      },
    };

    this.rewardLevels().forEach((level) => {
      const value = incoming[level];
      if (!value) return;
      const currentItem = current.customer[level];
      this.rewardConfig.customer[level] = {
        name: value.name ?? currentItem.name,
        type: Number(value.type ?? currentItem.type),
        value: Number(value.value ?? currentItem.value),
      };
    });

    await this.dao
      .upsertConfigValues(
        this.rewardLevels().flatMap((level) => {
          const key = this.voucherLevelKey(level);
          const item = this.rewardConfig.customer[level];
          return [
            {
              key: `voucher_reward_${key}_name`,
              value: 0,
              value_text: item.name,
            },
            { key: `voucher_reward_${key}_type`, value: Number(item.type) },
            { key: `voucher_reward_${key}_value`, value: Number(item.value) },
          ];
        }),
      )
      .catch((error) => {
        console.error('Voucher reward config persist failed:', error);
      });

    return this.rewardConfig;
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
