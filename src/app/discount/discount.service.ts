import { Injectable } from '@nestjs/common';
import { DiscountDto } from './discount.dto';
import { DiscountDao } from './discount.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import {
  ADMINUSERS,
  DISCOUNT,
  DiscountValue,
  getDefinedKeys,
  round,
  STATUS,
} from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class DiscountService {
  constructor(private readonly dao: DiscountDao) {}
  public async create(dto: DiscountDto) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      status: STATUS.Active,
    });
  }

  public async findAll(dto: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(dto, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async calculateDiscountedPrice(
    type: number,
    value: number,
    min_price: number,
    max_price?: number,
  ) {
    const calculate = (amount: number) => {
      if (type === DISCOUNT.Percent) {
        return {
          discountedAmount: round(((100 - value) * amount) / 100),
          discount: round((value * amount) / 100),
          discountValue: `${value}%`,
          discountType: DiscountValue[DISCOUNT.Percent],
        };
      }

      if (type === DISCOUNT.Price) {
        return {
          discountedAmount: amount - value,
          discount: value,
          discountValue: value,
          discountType: DiscountValue[DISCOUNT.Price],
        };
      }

      return null;
    };

    return {
      min: calculate(min_price),
      ...(max_price ? { max: calculate(max_price) } : {}),
    };
  }
  public async findByService(id: string) {
    try {
      return await this.dao.getByService(id);
    } catch (error) {
      return null;
    }
  }

  public async update(id: string, dto: DiscountDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
