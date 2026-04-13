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
    create: jest.Mock;
    clearPaidMeta: jest.Mock;
    updateTx: jest.Mock;
    updateOrderStatus: jest.Mock;
    updatePaidDate: jest.Mock;
    updatePrePaid: jest.Mock;
    updateSalaryProcessStatus: jest.Mock;
    customerCheck: jest.Mock;
    getSlotsUnified: jest.Mock;
    get_order_details: jest.Mock;
    getShiftBoundaries: jest.Mock;
  };
  let orderDetail: {
    createTx: jest.Mock;
    deleteTx: jest.Mock;
    updateStatusByOrder: jest.Mock;
    updateTx: jest.Mock;
    updateViewStatusTx: jest.Mock;
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
  let qpay: {
    createInvoice: jest.Mock;
    checkPayment: jest.Mock;
  };
  let payment: {
    syncManualPayments: jest.Mock;
  };
  let db: {
    withTransaction: jest.Mock;
  };

  beforeEach(() => {
    dao = {
      create: jest.fn(),
      clearPaidMeta: jest.fn(),
      updateTx: jest.fn(),
      updateOrderStatus: jest.fn(),
      updatePaidDate: jest.fn(),
      updatePrePaid: jest.fn(),
      updateSalaryProcessStatus: jest.fn(),
      customerCheck: jest.fn(),
      getSlotsUnified: jest.fn(),
      get_order_details: jest.fn(),
      getShiftBoundaries: jest.fn(),
    };
    dao.getShiftBoundaries.mockResolvedValue([]);

    orderDetail = {
      createTx: jest.fn(),
      deleteTx: jest.fn(),
      updateStatusByOrder: jest.fn(),
      updateTx: jest.fn(),
      updateViewStatusTx: jest.fn(),
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

    qpay = {
      createInvoice: jest.fn(),
      checkPayment: jest.fn(),
    };

    payment = {
      syncManualPayments: jest.fn().mockResolvedValue({
        latestPaidAt: undefined,
        latestMethod: undefined,
        hasPrePayment: false,
      }),
    };

    db = {
      withTransaction: jest.fn().mockImplementation(async (fn) =>
        fn({ query: jest.fn() }),
      ),
    };

    service = new OrderService(
      dao as any,
      orderDetail as any,
      serviceConfig as any,
      user as any,
      {} as any,
      qpay as any,
      userService as any,
      integrationService as any,
      orderLog as any,
      payment as any,
      db as any,
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

  it('syncs pre and remaining payment methods for admin orders', async () => {
    serviceConfig.getBookingConfigs.mockResolvedValue([
      {
        id: 'service-1',
        duration: '60',
        pre: '10000',
        name: 'Service 1',
      },
    ]);
    user.findOne.mockResolvedValue({
      id: 'artist-1',
      nickname: 'Artist 1',
    });
    dao.create.mockResolvedValue('order-created');

    await service.create(
      {
        branch_id: 'branch-1',
        customer_id: 'customer-1',
        order_date: '2026-04-12',
        start_time: '10:00:00',
        order_status: OrderStatus.Active,
        total_amount: 30000,
        pre_amount: 10000,
        paid_amount: 20000,
        pre_method: 3,
        method: 4,
        details: [
          {
            service_id: 'service-1',
            user_id: 'artist-1',
            price: 30000,
          },
        ],
      } as any,
      {
        id: 'admin-1',
        role: 20,
        mobile: '99999999',
      } as any,
      'merchant-1',
    );

    expect(payment.syncManualPayments).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'order-created',
        pre_method: 3,
        method: 4,
        pre_amount: 10000,
        paid_amount: 20000,
      }),
    );
  });

  it('does not create client orders when prepayment amount is missing', async () => {
    serviceConfig.getBookingConfigs.mockResolvedValue([
      {
        id: 'service-1',
        duration: '60',
        pre: '0',
        name: 'Service 1',
      },
    ]);
    user.findOne.mockResolvedValue({
      id: 'artist-1',
      nickname: 'Artist 1',
    });
    jest.spyOn(service, 'canPlaceOrder').mockResolvedValue(undefined);

    await expect(
      service.create(
        {
          branch_id: 'branch-1',
          order_date: '2026-04-12',
          start_time: '10:00:00',
          details: [
            {
              service_id: 'service-1',
              user_id: 'artist-1',
              price: 30000,
            },
          ],
        } as any,
        {
          id: 'client-1',
          role: 50,
          mobile: '99999999',
        } as any,
        'merchant-1',
      ),
    ).rejects.toThrow('Урьдчилгаа төлбөр үүсгэхэд алдаа гарлаа');

    expect(qpay.createInvoice).not.toHaveBeenCalled();
    expect(dao.create).not.toHaveBeenCalled();
  });

  it('does not persist client orders when qpay invoice creation fails', async () => {
    serviceConfig.getBookingConfigs.mockResolvedValue([
      {
        id: 'service-1',
        duration: '60',
        pre: '10000',
        name: 'Service 1',
      },
    ]);
    user.findOne.mockResolvedValue({
      id: 'artist-1',
      nickname: 'Artist 1',
    });
    qpay.createInvoice.mockRejectedValue(new Error('401'));
    jest.spyOn(service, 'canPlaceOrder').mockResolvedValue(undefined);

    await expect(
      service.create(
        {
          branch_id: 'branch-1',
          order_date: '2026-04-12',
          start_time: '10:00:00',
          details: [
            {
              service_id: 'service-1',
              user_id: 'artist-1',
              price: 30000,
            },
          ],
        } as any,
        {
          id: 'client-1',
          role: 50,
          mobile: '99999999',
        } as any,
        'merchant-1',
      ),
    ).rejects.toThrow('Урьдчилгаа төлбөр үүсгэхэд алдаа гарлаа');

    expect(qpay.createInvoice).toHaveBeenCalled();
    expect(dao.create).not.toHaveBeenCalled();
  });

  it('temporarily hides existing order details before resequencing sequential edits', async () => {
    orderDetail.findByOrder.mockResolvedValue([
      {
        id: 'detail-1',
        user_id: 'artist-1',
        start_time: '17:00:00',
        end_time: '19:00:00',
      },
      {
        id: 'detail-2',
        user_id: 'artist-1',
        start_time: '19:00:00',
        end_time: '19:30:00',
      },
    ]);
    serviceConfig.findOne
      .mockResolvedValueOnce({ duration: '90' })
      .mockResolvedValueOnce({ duration: '30' });

    await service.update(
      'order-1',
      {
        branch_id: 'branch-1',
        order_date: '2026-04-08',
        order_status: OrderStatus.Active,
        paid_amount: 0,
        pre_amount: 0,
        parallel: false,
        start_time: '17:00:00',
        details: [
          {
            id: 'detail-1',
            service_id: 'service-1',
            user_id: 'artist-1',
            duration: 90,
          },
          {
            id: 'detail-2',
            service_id: 'service-2',
            user_id: 'artist-1',
            duration: 30,
          },
        ],
      } as any,
      'admin-1',
      20,
    );

    expect(orderDetail.updateViewStatusTx).toHaveBeenCalledWith(
      expect.anything(),
      'order-1',
      30,
    );
    expect(orderDetail.updateTx).toHaveBeenCalledTimes(2);
    expect(orderDetail.updateViewStatusTx.mock.invocationCallOrder[0]).toBeLessThan(
      orderDetail.updateTx.mock.invocationCallOrder[0],
    );
  });

  it('clears order paid meta when remaining payment is removed', async () => {
    orderDetail.findByOrder.mockResolvedValue([
      {
        id: 'detail-1',
        user_id: 'artist-1',
        start_time: '17:00:00',
        end_time: '18:00:00',
      },
    ]);
    serviceConfig.findOne.mockResolvedValue({ duration: '60' });
    payment.syncManualPayments.mockResolvedValue({
      latestPaidAt: undefined,
      latestMethod: undefined,
      hasPrePayment: true,
    });

    await service.update(
      'order-1',
      {
        branch_id: 'branch-1',
        order_date: '2026-04-08',
        order_status: OrderStatus.Active,
        paid_amount: 0,
        pre_amount: 10000,
        parallel: false,
        start_time: '17:00:00',
        details: [
          {
            id: 'detail-1',
            service_id: 'service-1',
            user_id: 'artist-1',
            duration: 60,
          },
        ],
      } as any,
      'admin-1',
      20,
    );

    expect(dao.clearPaidMeta).toHaveBeenCalledWith('order-1');
    expect(dao.updatePaidDate).not.toHaveBeenCalled();
  });
});
