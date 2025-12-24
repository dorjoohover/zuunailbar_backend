import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UserServiceDao } from './user_service.dao';
import { UserServiceDto } from './user_service.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { ServiceService } from '../service/service.service';
import { UserService } from '../user/user.service';
import {
  CLIENT,
  EMPLOYEE,
  getDefinedKeys,
  mnDate,
  OrderSlot,
  ParallelOrderSlot,
  STATUS,
  toYMD,
  usernameFormatter,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { User } from '../user/user.entity';
import { AvailabilitySlotsService } from '../availability_slots/availability_slots.service';
import { AvailabilitySlot } from '../availability_slots/availability_slots.entity';

@Injectable()
export class UserServiceService {
  constructor(
    private readonly dao: UserServiceDao,
    @Inject(forwardRef(() => ServiceService))
    private readonly service: ServiceService,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    @Inject(forwardRef(() => AvailabilitySlotsService))
    private slots: AvailabilitySlotsService,
  ) {}
  public async create(dto: UserServiceDto, u: User) {
    try {
      let services = dto.services;
      let user: User;
      u.role == EMPLOYEE
        ? (user = u)
        : (user = await this.userService.findOne(dto.user_id));
      let userServices = await this.findAll(
        {
          user_id: dto.user_id,
          limit: -1,
          page: 0,
          skip: 0,
          sort: false,
        },
        CLIENT,
      );
      if (userServices.items.length > 0) {
        const dtoServices = dto.services;

        const toDelete = userServices.items
          .filter((s) => !dtoServices.includes(s.service_id))
          .map((s) => s.id);
        if (toDelete.length > 0) await this.dao.deleteMany(toDelete);
        services = dtoServices.filter(
          (id) => !userServices.items.some((s) => s.service_id === id),
        );
      }
      const payload = await Promise.all(
        services.map(async (s) => {
          const service = await this.service.findOne(s);
          return {
            ...dto,
            id: AppUtils.uuid4(),
            branch_id: dto.branch_id ?? user.branch_id,
            user_name: usernameFormatter(user),
            service_name: service.name,
            user_id: user.id,
            service_id: s,
            status: STATUS.Active,
          };
        }),
      );
      await this.dao.addMany(payload);
    } catch (error) {
      console.log(error);
    }
  }

  public async search(services: string, user?: string) {
    return await this.dao.getByServices(services, user);
  }

  public async findAll(pg: PaginationDto, role: number) {
    const res = await this.dao.list(applyDefaultStatusFilter(pg, role));

    return res;
  }
  public async findAllUserService(pg: PaginationDto, role: number) {
    const res = await this.dao.groupByUserList(
      applyDefaultStatusFilter(pg, role),
    );

    return res;
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async updateLevel(customer_id: string, level: number) {
    await this.dao.updateLevel(customer_id, level);
  }

  public async update(id: string, dto: UserServiceDto) {
    return await this.dao.update({ ...dto, id, updated_at: mnDate() }, [
      ...getDefinedKeys(dto),
      'updated_at',
    ]);
  }

  public async updateStatus(id: string, status: number) {
    return await this.dao.update({ id, status }, ['id', 'status']);
  }
  public async deleteByUser(id: string) {
    return await this.dao.updateByUser({ user_id: id, status: STATUS.Hidden }, [
      'user_id',
      'status',
    ]);
  }

  private async getServiceArtists(branch_id: string, services: string[]) {
    // Тухайн үйлчилгээ бүрийг хэн хийж чаддаг вэ?
    const mapping: Record<string, string[]> = {};

    for (const service of services) {
      const { items } = await this.dao.list({
        branch_id,
        service_id: service,
      });
      console.log(items);

      mapping[service] = items.map((i) => i.user_id);
    }

    return mapping; // { service1: [artist1, artist5], service2: [artist2], ... }
  }
  private async getArtistsSlots(
    artistIds: string[],
    date: string,
    slot: number,
  ) {
    const result: Record<string, AvailabilitySlot[]> = {};
    for (const id of artistIds) {
      const slots = await this.slots.findAll({
        artist_id: id,
        date: date,
        slots: [slot],
        // start_date: toYMD(new Date()),
      });
      result[id] = slots.items;
    }

    return result;
  }
  private getParallelAvailable(
    schedules: Record<string, AvailabilitySlot[]>,
    mapping: Record<string, string[]>,
  ): ParallelOrderSlot {
    const result: ParallelOrderSlot = {};

    for (const [serviceId, artistIds] of Object.entries(mapping)) {
      result[serviceId] = {};

      for (const artistId of artistIds) {
        const artistSchedules = schedules[artistId] || [];

        if (artistSchedules.length === 0) continue; // slots хоосон бол skip

        // Бүх slots-ыг нэг array-д merge
        const allSlots = artistSchedules.flatMap((s) => s.slots.map(String));

        if (allSlots.length === 0) continue; // slots хоосон бол skip

        result[serviceId][artistId] = {
          artists: artistIds.filter((id) => id !== artistId),
          slots: { all: Array.from(new Set(allSlots)).sort() },
        };
      }

      // Хэрэв service-д нэг ч artist байхгүй бол устгах
      if (Object.keys(result[serviceId]).length === 0) {
        delete result[serviceId];
      }
    }

    return result;
  }

  private getSequentialAvailable(
    mapping: Record<string, string[]>, // serviceId → artistId[]
    slots: Record<string, AvailabilitySlot[]>, // artistId → [{date, slots[]}]
  ): OrderSlot {
    const firstServiceArtists = Object.values(mapping)[0] || [];
    const result: OrderSlot = {};

    firstServiceArtists.forEach((artistId) => {
      const artistSlots = slots[artistId] || [];
      if (artistSlots.length === 0) return; // slots хоосон бол skip

      const slotObj: Record<string, string[]> = {};

      artistSlots.forEach((slot) => {
        const dateKey = toYMD(slot.date);
        if (!slotObj[dateKey]) slotObj[dateKey] = [];
        slotObj[dateKey].push(...slot.slots);
      });

      // slots хоосон бол skip
      const nonEmptyDates = Object.fromEntries(
        Object.entries(slotObj).filter(([_, s]) => s.length > 0),
      );
      if (Object.keys(nonEmptyDates).length > 0) {
        result[artistId] = { slots: nonEmptyDates };
      }
    });

    return result;
  }
  public async etParallelArtists(
    branch_id: string,
    services: string[],
    parallel: boolean,
    date: string,
    slot: number,
  ) {
    // 1. Service бүрт хэн ажиллаж чадах вэ?
    const mapping = await this.getServiceArtists(branch_id, services);
    // Artist ID–уудыг бүхэлд нь цуглуулах
    const artistIds = Array.from(new Set(Object.values(mapping).flat()));
    // 2. Artist slots татах
    const slots = await this.getArtistsSlots(artistIds, date, slot);
    // 3. Parallel эсэхээс хамаарч тооцоолно
    let res = parallel
      ? this.getParallelAvailable(slots, mapping)
      : this.getSequentialAvailable(mapping, slots);
    console.log(res);
    return res;
  }
}
