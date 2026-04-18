import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import {
  getDefinedKeys,
  STATUS,
  UserLevel,
  usernameFormatter,
  VOUCHER,
  VoucherStatus,
} from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { UserService } from '../user/user.service';
import { Voucher } from './voucher.entity';
import { VoucherConfigDto, VoucherDto } from './voucher.dto';
import { VoucherDao } from './voucher.dao';

const CUSTOMER_REWARD_LEVELS = [
  UserLevel.BRONZE,
  UserLevel.SILVER,
  UserLevel.GOLD,
] as const;

const VOUCHER_CONFIG_KEYS = {
  [UserLevel.BRONZE]: {
    name: 'voucher_reward_bronze_name',
    type: 'voucher_reward_bronze_type',
    value: 'voucher_reward_bronze_value',
  },
  [UserLevel.SILVER]: {
    name: 'voucher_reward_silver_name',
    type: 'voucher_reward_silver_type',
    value: 'voucher_reward_silver_value',
  },
  [UserLevel.GOLD]: {
    name: 'voucher_reward_gold_name',
    type: 'voucher_reward_gold_type',
    value: 'voucher_reward_gold_value',
  },
} as const;

const DEFAULT_VOUCHER_CONFIG = {
  [UserLevel.BRONZE]: {
    name: 'Bronze voucher',
    type: VOUCHER.Price,
    value: 0,
  },
  [UserLevel.SILVER]: {
    name: 'Silver voucher',
    type: VOUCHER.Price,
    value: 0,
  },
  [UserLevel.GOLD]: {
    name: 'Gold voucher',
    type: VOUCHER.Price,
    value: 0,
  },
} as const;

export type VoucherRewardConfigItem = {
  name: string;
  type: VOUCHER;
  value: number;
};

type VoucherConfigEntry = {
  key: string;
  value: number;
  value_text?: string | null;
};

export type VoucherConfigMap = {
  customer: Partial<Record<UserLevel, VoucherRewardConfigItem>>;
};

export type ResolvedVoucher = {
  id: string;
  name: string;
  type: VOUCHER;
  value: number;
  discount: number;
};

@Injectable()
export class VoucherService {
  constructor(
    private readonly dao: VoucherDao,
    private readonly userService: UserService,
  ) {}

  private buildDefaultConfig(): VoucherConfigMap {
    return {
      customer: CUSTOMER_REWARD_LEVELS.reduce(
        (acc, level) => {
          acc[level] = { ...DEFAULT_VOUCHER_CONFIG[level] };
          return acc;
        },
        {} as Partial<Record<UserLevel, VoucherRewardConfigItem>>,
      ),
    };
  }

  private parseConfig(entries: VoucherConfigEntry[]) {
    const config = this.buildDefaultConfig();
    const byKey = new Map(entries.map((entry) => [entry.key, entry]));

    for (const level of CUSTOMER_REWARD_LEVELS) {
      const keys = VOUCHER_CONFIG_KEYS[level];
      const rawName = byKey.get(keys.name)?.value_text;
      const rawType = byKey.get(keys.type)?.value;
      const rawValue = byKey.get(keys.value)?.value;

      config.customer[level] = {
        name:
          rawName === undefined || rawName === null || rawName === ''
            ? DEFAULT_VOUCHER_CONFIG[level].name
            : String(rawName),
        type: Number(rawType ?? DEFAULT_VOUCHER_CONFIG[level].type) as VOUCHER,
        value: Number(rawValue ?? DEFAULT_VOUCHER_CONFIG[level].value),
      };
    }

    return config;
  }

  private serializeConfig(
    dto: VoucherConfigDto | Record<string, any>,
  ): VoucherConfigEntry[] {
    return CUSTOMER_REWARD_LEVELS.flatMap((level) => {
      const item = dto?.customer?.[level] ?? dto?.[level];
      if (!item) return [];

      const keys = VOUCHER_CONFIG_KEYS[level];
      return [
        {
          key: keys.name,
          value: 0,
          value_text: item.name ?? DEFAULT_VOUCHER_CONFIG[level].name,
        },
        {
          key: keys.type,
          value: Number(item.type ?? DEFAULT_VOUCHER_CONFIG[level].type),
          value_text: null,
        },
        {
          key: keys.value,
          value: Number(item.value ?? DEFAULT_VOUCHER_CONFIG[level].value),
          value_text: null,
        },
      ];
    });
  }

  public async config() {
    const keys = CUSTOMER_REWARD_LEVELS.flatMap((level) =>
      Object.values(VOUCHER_CONFIG_KEYS[level]),
    );
    const entries = await this.dao.getAppConfigValues(keys);
    const missingEntries = keys
      .filter((key) => {
        const entry = entries.find((item) => item.key === key);
        if (!entry) return true;
        return key.endsWith('_name') && !entry.value_text;
      })
      .map((key) => {
        const level = CUSTOMER_REWARD_LEVELS.find(
          (item) =>
            Object.values(VOUCHER_CONFIG_KEYS[item]).includes(
              key as (typeof VOUCHER_CONFIG_KEYS)[typeof item][keyof (typeof VOUCHER_CONFIG_KEYS)[typeof item]],
            ),
        );

        if (level == null) return null;

        const group = VOUCHER_CONFIG_KEYS[level];
        const defaults = DEFAULT_VOUCHER_CONFIG[level];
        if (group.name === key) {
          return { key, value: 0, value_text: defaults.name };
        }
        if (group.type === key) {
          return { key, value: defaults.type, value_text: null };
        }
        return { key, value: defaults.value, value_text: null };
      })
      .filter(Boolean) as VoucherConfigEntry[];

    if (missingEntries.length) {
      await this.dao.upsertAppConfigValues(missingEntries);
      entries.push(...missingEntries);
    }

    return this.parseConfig(entries);
  }

  public async updateConfig(dto: VoucherConfigDto) {
    const entries = this.serializeConfig(dto);
    if (!entries.length) return this.config();

    await this.dao.upsertAppConfigValues(entries);
    return this.config();
  }

  public calculateDiscount(
    total: number,
    type?: VOUCHER | number | null,
    value?: number | null,
  ) {
    const amount = Number(total ?? 0);
    const voucherValue = Number(value ?? 0);
    if (amount <= 0 || voucherValue <= 0) return 0;

    if (Number(type) === VOUCHER.Percent) {
      return Math.min(amount, Math.round((amount * voucherValue) / 100));
    }

    return Math.min(amount, voucherValue);
  }

  public async resolveForOrder(input: {
    voucher_id?: string | null;
    customer_id?: string | null;
    order_id?: string | null;
    subtotal: number;
  }): Promise<ResolvedVoucher | null> {
    const voucherId = input.voucher_id ?? null;
    const customerId = input.customer_id ?? null;
    if (!voucherId || !customerId || input.subtotal <= 0) return null;

    const voucher = await this.dao.getById(voucherId);
    if (!voucher || Number(voucher.status) !== STATUS.Active) {
      throw new HttpException('Voucher олдсонгүй.', HttpStatus.BAD_REQUEST);
    }

    if (voucher.user_id !== customerId) {
      throw new HttpException(
        'Сонгосон voucher тухайн хэрэглэгчид хамаарахгүй байна.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const sameOrder =
      input.order_id && voucher.used_order_id && voucher.used_order_id === input.order_id;
    if (
      Number(voucher.voucher_status) !== VoucherStatus.Available &&
      !sameOrder
    ) {
      throw new HttpException(
        'Сонгосон voucher аль хэдийн ашиглагдсан байна.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const discount = this.calculateDiscount(
      input.subtotal,
      Number(voucher.type),
      Number(voucher.value),
    );
    if (discount <= 0) {
      throw new HttpException(
        'Сонгосон voucher-ийн дүн буруу байна.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      id: voucher.id,
      name: voucher.name,
      type: Number(voucher.type) as VOUCHER,
      value: Number(voucher.value ?? 0),
      discount,
    };
  }

  public async syncOrderVoucherTx(input: {
    client: any;
    order_id: string;
    previous_voucher_id?: string | null;
    next_voucher_id?: string | null;
  }) {
    const { client, order_id, previous_voucher_id, next_voucher_id } = input;

    if (previous_voucher_id && previous_voucher_id !== next_voucher_id) {
      await this.dao.releaseTx(client, previous_voucher_id);
    }

    if (next_voucher_id) {
      await this.dao.markUsedTx(client, next_voucher_id, order_id);
    } else if (previous_voucher_id) {
      await this.dao.releaseByOrderTx(client, order_id);
    }
  }

  public async releaseOrderVoucher(orderId: string) {
    return await this.dao.releaseByOrder(orderId);
  }

  public async ensureRewardVoucherForLevel(
    userId: string,
    level: UserLevel,
    createdBy?: string | null,
  ) {
    if (!CUSTOMER_REWARD_LEVELS.includes(level as (typeof CUSTOMER_REWARD_LEVELS)[number])) {
      return null;
    }

    const existing = await this.dao.getIssuedReward(userId, level);
    if (existing) return existing;

    const config = await this.config();
    const reward = config.customer[level];
    if (!reward || Number(reward.value ?? 0) <= 0) return null;

    const user = await this.userService.findOne(userId);
    if (!user) return null;

    await this.dao.add({
      id: AppUtils.uuid4(),
      user_id: userId,
      name: reward.name,
      type: reward.type,
      value: reward.value,
      level,
      voucher_status: VoucherStatus.Available,
      used_order_id: null,
      used_at: null,
      created_by: createdBy ?? null,
      note: null,
      status: STATUS.Active,
      service_id: null,
      service_name: null,
      user_name: usernameFormatter(user),
    } as any);

    return true;
  }

  public async create(dto: VoucherDto, createdBy?: string) {
    const user = await this.userService.findOne(dto.user_id);
    if (!user) {
      throw new HttpException('Хэрэглэгч олдсонгүй.', HttpStatus.BAD_REQUEST);
    }

    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      voucher_status: dto.voucher_status ?? VoucherStatus.Available,
      used_order_id: null,
      used_at: null,
      created_by: createdBy ?? null,
      note: dto.note ?? null,
      status: STATUS.Active,
      service_id: null,
      service_name: null,
      user_name: usernameFormatter(user),
    } as any);
  }

  public async findAll(dto: PaginationDto, role: number, userId?: string) {
    const query = applyDefaultStatusFilter(
      userId ? { ...dto, user_id: userId } : dto,
      role,
    );

    return await this.dao.list(query);
  }

  public async available(userId: string, orderId?: string) {
    return await this.dao.listAvailableByUser(userId, orderId);
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: VoucherDto) {
    const payload: Partial<Voucher> & { id: string } = {
      ...dto,
      id,
    };

    if (dto.user_id) {
      const user = await this.userService.findOne(dto.user_id);
      if (!user) {
        throw new HttpException('Хэрэглэгч олдсонгүй.', HttpStatus.BAD_REQUEST);
      }
      payload.user_name = usernameFormatter(user);
    }

    return await this.dao.update(payload, getDefinedKeys(payload));
  }

  public async remove(id: string) {
    await this.dao.update(
      {
        id,
        voucher_status: VoucherStatus.Cancelled,
      },
      ['voucher_status'],
    );
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
