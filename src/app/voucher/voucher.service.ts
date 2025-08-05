import { Injectable } from '@nestjs/common';
import { VoucherDao } from './voucher.dao';
import { VoucherDto } from './voucher.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS, usernameFormatter } from 'src/base/constants';
import { ServiceService } from '../service/service.service';
import { UserService } from '../user/user.service';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class VoucherService {
  constructor(
    private readonly dao: VoucherDao,
    private serviceService: ServiceService,
    private userService: UserService,
  ) {}
  public async create(dto: VoucherDto) {
    const user = await this.userService.findOne(dto.user_id);
    const service = await this.serviceService.findOne(dto.service_id);
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      status: STATUS.Active,
      service_name: service.name,
      user_name: usernameFormatter(user),
    });
  }

  public async findAll(dto: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(dto, role));
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

  public async update(id: string, dto: VoucherDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
