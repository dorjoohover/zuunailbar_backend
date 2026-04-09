jest.mock('./order.dao', () => ({
  OrdersDao: class {},
}));
jest.mock('../order_detail/order_detail.service', () => ({
  OrderDetailService: class {},
}));
jest.mock('../service/service.service', () => ({
  ServiceService: class {},
}));
jest.mock('./qpay.service', () => ({
  QpayService: class {},
}));
jest.mock('../user/user.service', () => ({
  UserService: class {},
}));
jest.mock('../user_service/user_service.service', () => ({
  UserServiceService: class {},
}));
jest.mock('../integrations/integrations.service', () => ({
  IntegrationService: class {},
}));
jest.mock('../payment/payment.service', () => ({
  PaymentService: class {},
}));
jest.mock('./order.log.dao', () => ({
  OrderLogDao: class {},
}));
jest.mock('./order.dto', () => ({
  AvailableTimeDto: class {},
  OrderDto: class {},
}));
jest.mock('./order.entity', () => ({
  Order: class {},
  Slot: class {},
}));
jest.mock(
  'src/common/decorator/pagination.dto',
  () => ({
    PaginationDto: class {},
  }),
  { virtual: true },
);
jest.mock(
  'src/utils/global.service',
  () => ({
    applyDefaultStatusFilter: (value: unknown) => value,
  }),
  { virtual: true },
);
jest.mock(
  'src/base/constants',
  () => ({
    ADMIN: 20,
    CLIENT: 50,
    EMPLOYEE: 40,
    ENDTIME: 22,
    getDefinedKeys: (obj: Record<string, unknown>) =>
      Object.keys(obj).filter((key) => obj[key] !== undefined),
    MANAGER: 30,
    mnDate: (value: Date | string | number = new Date()) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ulaanbaatar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value)),
    OrderStatus: {
      Pending: 10,
      Active: 20,
      Finished: 40,
      Cancelled: 50,
      Absent: 60,
      Friend: 70,
    },
    PAYMENT_STATUS: {
      Pending: 10,
      Active: 20,
      Cancelled: 50,
    },
    PaymentMethod: {
      P2P: 1,
      CASH: 2,
    },
    STARTTIME: 7,
    STATUS: {
      Active: 10,
      Hidden: 30,
    },
    timeToDecimal: (value: string) => {
      const [hours, minutes = '0', seconds = '0'] = String(value).split(':');
      return Number(hours) + Number(minutes) / 60 + Number(seconds) / 3600;
    },
    toTimeString: (value: number | string, half?: boolean) =>
      `${String(Math.floor(Number(value))).padStart(2, '0')}:${
        half || Number(value) % 1 !== 0 ? '30' : '00'
      }:00`,
    toYMD: (value: Date) => value.toISOString().slice(0, 10),
    UserLevel: {
      BRONZE: 0,
      SILVER: 10,
      GOLD: 20,
    },
    usernameFormatter: () => '',
    UserStatus: {
      Banned: 30,
    },
  }),
  { virtual: true },
);
jest.mock(
  'src/core/utils/app.utils',
  () => ({
    AppUtils: {
      uuid4: () => 'uuid-1',
    },
  }),
  { virtual: true },
);
jest.mock(
  'src/core/db/pg/app.db',
  () => ({
    AppDB: class {},
  }),
  { virtual: true },
);
jest.mock(
  'src/excel.service',
  () => ({
    ExcelService: class {},
  }),
  { virtual: true },
);
jest.mock(
  'src/common/formatter',
  () => ({
    MobileParser: (value: string) => value,
  }),
  { virtual: true },
);
jest.mock(
  'src/common/error',
  () => ({
    BadRequest: class {},
    OrderError: class {},
  }),
  { virtual: true },
);

import { OrderStatus } from 'src/base/constants';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let dao: {
    updateOrderStatus: jest.Mock;
    updateSalaryProcessStatus: jest.Mock;
    customerCheck: jest.Mock;
    getSlotsUnified: jest.Mock;
    get_order_details: jest.Mock;
    getShiftBoundaries: jest.Mock;
  };
  let orderDetail: {
    updateStatusByOrder: jest.Mock;
    findByOrder: jest.Mock;
  };
  let user: {
    findOne: jest.Mock;
    updateLevel: jest.Mock;
  };
  let integrationService: {
    updateSalaryLog: jest.Mock;
  };
  let serviceConfig: {
    getBookingConfigs: jest.Mock;
    findOne: jest.Mock;
  };
  let userService: {
    getByServices: jest.Mock;
    findOne: jest.Mock;
  };
  let orderLog: {
    add: jest.Mock;
    addTx: jest.Mock;
  };

  beforeEach(() => {
    dao = {
      updateOrderStatus: jest.fn(),
      updateSalaryProcessStatus: jest.fn(),
      customerCheck: jest.fn(),
      getSlotsUnified: jest.fn(),
      get_order_details: jest.fn(),
      getShiftBoundaries: jest.fn(),
    };

    orderDetail = {
      updateStatusByOrder: jest.fn(),
      findByOrder: jest.fn(),
    };

    user = {
      findOne: jest.fn(),
      updateLevel: jest.fn(),
    };

    integrationService = {
      updateSalaryLog: jest.fn(),
    };

    serviceConfig = {
      getBookingConfigs: jest.fn(),
      findOne: jest.fn(),
    };

    userService = {
      getByServices: jest.fn(),
      findOne: jest.fn(),
    };

    orderLog = {
      add: jest.fn(),
      addTx: jest.fn(),
    };

    service = new OrderService(
      dao as any,
      orderDetail as any,
      serviceConfig as any,
      user as any,
      {} as any,
      {} as any,
      userService as any,
      integrationService as any,
      orderLog as any,
      {} as any,
      {} as any,
    );

    jest.spyOn(service, 'find').mockResolvedValue({
      items: [
        {
          id: 'order-1',
          order_date: '2026-04-09',
          order_status: OrderStatus.Active,
          salary_date: null,
          salary_status: 10,
          customer_id: 'customer-1',
        },
      ],
      count: 1,
    } as any);

    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'order-1',
      order_status: OrderStatus.Active,
      status: 10,
    } as any);

    jest.spyOn(service, 'checkLevel').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('finishes active orders before salary confirmation and aggregates their salary', async () => {
    orderDetail.findByOrder.mockResolvedValue([
      {
        user_id: 'artist-1',
        price: 100000,
      },
    ]);
    user.findOne.mockResolvedValue({
      id: 'artist-1',
      salary_day: 5,
      percent: 30,
    });

    const result = await service.confirmSalaryProcessStatus(
      'admin-1',
      '2026-04-09',
    );

    expect(orderLog.add).toHaveBeenCalledWith(
      expect.objectContaining({
        changed_by: 'admin-1',
        order_id: 'order-1',
        old_order_status: OrderStatus.Active,
        new_order_status: OrderStatus.Finished,
      }),
    );
    expect(dao.updateOrderStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.Finished,
    );
    expect(orderDetail.updateStatusByOrder).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.Finished,
    );
    expect(dao.updateSalaryProcessStatus).toHaveBeenCalledWith(
      'order-1',
      expect.any(Date),
    );
    expect(integrationService.updateSalaryLog).toHaveBeenCalledWith(
      expect.objectContaining({
        approved_by: 'admin-1',
        amount: 30000,
        artist_id: 'artist-1',
        order_count: 1,
        salary_status: 10,
        date: '2026-04-20',
        day: 5,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        count: 1,
      }),
    );
  });

  it('filters out slot suggestions that exceed configured finish time', async () => {
    serviceConfig.getBookingConfigs.mockResolvedValue([
      {
        id: 'service-1',
        category_id: 'category-1',
        duration: '180',
      },
    ]);
    userService.getByServices.mockResolvedValue([
      { user_id: 'artist-1' },
      { user_id: 'artist-2' },
    ]);
    dao.getSlotsUnified.mockResolvedValue([
      {
        artist_id: 'artist-1',
        branch_id: 'branch-1',
        date: new Date('2026-04-10'),
        start_time: '18:00:00',
        finish_time: '20:00:00',
      },
      {
        artist_id: 'artist-1',
        branch_id: 'branch-1',
        date: new Date('2026-04-10'),
        start_time: '17:00:00',
        finish_time: '20:00:00',
      },
      {
        artist_id: 'artist-2',
        branch_id: 'branch-1',
        date: new Date('2026-04-10'),
        start_time: '18:00:00',
        finish_time: null,
      },
    ]);
    dao.get_order_details.mockResolvedValue([]);

    const result = await service.getSlots({
      branch_id: 'branch-1',
      services: 'service-1',
      parallel: 'false',
    } as any);

    expect(result).toEqual([
      expect.objectContaining({
        artist_id: 'artist-1',
        start_time: '17:00:00',
      }),
      expect.objectContaining({
        artist_id: 'artist-2',
        start_time: '18:00:00',
      }),
    ]);
  });

  it('deduplicates repeated service categories before querying unified slots', async () => {
    serviceConfig.getBookingConfigs.mockResolvedValue([
      {
        id: 'service-1',
        category_id: 'category-1',
        duration: '60',
      },
      {
        id: 'service-2',
        category_id: 'category-1',
        duration: '30',
      },
    ]);
    userService.getByServices.mockResolvedValue([{ user_id: 'artist-1' }]);
    dao.getSlotsUnified.mockResolvedValue([
      {
        artist_id: 'artist-1',
        branch_id: 'branch-1',
        date: new Date('2026-04-10'),
        start_time: '10:00:00',
        finish_time: null,
      },
    ]);
    dao.get_order_details.mockResolvedValue([]);

    await service.getSlots({
      branch_id: 'branch-1',
      services: 'service-1,service-2',
      parallel: 'false',
    } as any);

    expect(dao.getSlotsUnified).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['category-1'],
      }),
    );
  });

  it('rejects order details that exceed shift finish boundary', async () => {
    dao.getShiftBoundaries.mockResolvedValue([
      {
        artist_id: 'artist-1',
        schedule_finish_time: '20:00:00',
        booking_finish_time: null,
      },
    ]);

    await expect(
      (service as any).validateShiftFinishBoundaries({
        branch_id: 'branch-1',
        order_date: '2026-04-10',
        details: [
          {
            user_id: 'artist-1',
            start_time: '18:00:00',
            end_time: '20:30:00',
          },
        ],
      }),
    ).rejects.toThrow('Ажилтны тарах цагаас хэтэрсэн захиалга байна.');
  });
});
