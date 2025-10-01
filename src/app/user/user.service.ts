import { Injectable } from '@nestjs/common';
import { UserDto } from './user.dto';
import { UserDao } from './user.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  ADMIN,
  CLIENT,
  E_M,
  EMPLOYEE,
  getDefinedKeys,
  MANAGER,
  saltOrRounds,
  STATUS,
  UserStatus,
} from 'src/base/constants';
import { BadRequest, NoPermissionException } from 'src/common/error';
import { User } from './user.entity';
import { MobileFormat, MobileParser } from 'src/common/formatter';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import * as bcrypt from 'bcrypt';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { RegisterDto } from 'src/auth/auth.dto';
import { BranchService } from '../branch/branch.service';
import { UserServiceService } from '../user_service/user_service.service';
import { UserSalariesService } from '../user_salaries/user_salaries.service';
@Injectable()
export class UserService {
  constructor(
    private readonly dao: UserDao,
    private readonly userService: UserServiceService,
    private readonly userSalary: UserSalariesService,
    private readonly branchService: BranchService,
  ) {}
  public async create(
    dto: UserDto,
    merchant: string,
    user: User,
    branch_id: string,
  ) {
    if (dto.role < EMPLOYEE && user.role === MANAGER)
      throw new NoPermissionException();
    if (!dto.password) BadRequest.required('Password');
    const mobile = MobileFormat(dto.mobile);
    let res;
    try {
      res = await this.dao.getByMobile(mobile);
    } catch (error) {
      error.message?.toLowerCase().includes('not found')
        ? (res = null)
        : (res = 0);
    }

    if (res != null) throw new BadRequest().registered;
    let branch;
    if (branch_id) branch = await this.branchService.findOne(branch_id);
    if (dto.branch_id) branch = await this.branchService.findOne(dto.branch_id);
    const password = await this.hash(dto.password);
    const result = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      status: STATUS.Active,
      user_status: UserStatus.Active,
      mobile: mobile,
      merchant_id: merchant,
      password: password,
      added_by: user.id,
      branch_id: dto.role === ADMIN ? null : branch_id,
      branch_name: branch_id ? branch.name : null,
      birthday: new Date(dto.birthday),
      color: dto.color,
    });
    if (dto.duration || dto.percent || dto.date) {
      await this.userSalary.create({
        user_id: result,
        duration: dto.duration,
        percent: dto.percent,
        status: STATUS.Active,
        date: dto.date,
      });
    }
  }
  private async hash(password: string) {
    return await bcrypt.hash(password, saltOrRounds);
  }
  public async register(
    dto: RegisterDto,
    merchant: string,
  ): Promise<{ id: string; mobile: string }> {
    try {
      const mobile = MobileFormat(dto.mobile);
      let res;
      try {
        res = await this.dao.getByMobile(mobile);
      } catch (error) {
        res = null;
      }
      if (res) throw new BadRequest().registered;
      const password = await this.hash(dto.password);
      const id = await this.dao.add({
        id: AppUtils.uuid4(),
        status: STATUS.Active,
        user_status: UserStatus.Active,
        mobile: mobile,
        merchant_id: merchant,
        added_by: null,
        branch_id: null,
        birthday: null,
        description: null,
        profile_img: null,
        experience: null,
        nickname: null,
        firstname: null,
        lastname: null,
        password,
        role: CLIENT,
        device: null,
        branch_name: null,
        color: null,
      });
      return {
        id,
        mobile,
      };
    } catch (error) {
      console.log(error);
    }
  }

  public async updateOtp(mobile: string, otp: string) {
    await this.dao.updateOtp(mobile, otp);
  }
  public async checkOtp(otp: string, mobile: string) {
    const res = await this.findMobile(mobile);
    return res.otp == otp;
  }
  public async search(filter: SearchDto, merchant: string) {
    const services = filter.services;
    const value = filter.value;
    let user;
    if (value) {
      try {
        const res = await this.dao.getById(value);
        user = {
          id: res.id,
          value: `${res.mobile}__${res.nickname}__${res.branch_id}__${res.color}`,
        };
      } catch (error) {}
    }
    let res = await this.dao.search({
      ...filter,
      merchant,
      status: STATUS.Active,
    });

    if (services && filter.role == E_M) {
      const service = await this.userService.search(services);
      res = service
        .map((s) => res.find((r) => r.id == s.user_id))
        .filter((d) => d != undefined);
    }
    if (user && res.find((r) => user.id == r.id) === undefined)
      return [...res, user];
    return res;
  }
  public async findAll(pg: PaginationDto, role: number) {
    const data = await this.dao.list(applyDefaultStatusFilter(pg, role));

    const items = data.items.map(({ password, ...rest }) => {
      const mobile = MobileParser(rest.mobile);
      return {
        ...rest,
        mobile,
      };
    });

    return {
      ...data,
      items,
    };
  }

  public async findMobile(mobile: string) {
    return await this.dao.getByMobile(mobile);
  }
  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findDevice(id: string) {
    return await this.dao.getByDevice(id);
  }
  public async resetPassword(mobile: string, password: string) {
    const user = await this.dao.getByMobile(mobile);
    if (!user) return;
    const pass = await this.hash(password);
    const body = { id: user.id, password: pass };
    await this.dao.update(body, getDefinedKeys(body));
  }
  public async update(id: string, dto: UserDto) {
    let body = dto;
    body.id = id;
    if (body.password) {
      body.password = await bcrypt.hash(dto.password, saltOrRounds);
    }
    if (body.branch_id) {
      try {
        body.branch_name = (
          await this.branchService.findOne(body.branch_id)
        ).name;
      } catch (error) {}
    }
    return await this.dao.update(body, getDefinedKeys(body));
  }

  public async updateStatus(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
  public async updatePercent(id: string, percent: number) {
    return await this.dao.updatePercent(id, percent);
  }
}
