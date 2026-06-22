jest.mock('./integration_payment.dao', () => ({
  IntegrationPaymentDao: class {},
}));
jest.mock('../user/user.service', () => ({
  UserService: class {},
}));
jest.mock('../integrations/integrations.service', () => ({
  IntegrationService: class {},
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
    getDefinedKeys: (obj: Record<string, unknown>) =>
      Object.keys(obj).filter((key) => obj[key] !== undefined),
    SALARY_LOG_STATUS: {
      Pending: 10,
      Approved: 20,
    },
    PaymentType: {
      SALARY: 10,
      ADVANCE: 20,
    },
    STATUS: {
      Active: 10,
    },
    ubDateAt00: (value: Date | string | number = new Date()) =>
      new Date(value),
    usernameFormatter: () => '',
  }),
  { virtual: true },
);
let uuidCounter = 0;
jest.mock(
  'src/core/utils/app.utils',
  () => ({
    AppUtils: {
      uuid4: () => `uuid-${++uuidCounter}`,
    },
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
  'src/common/error',
  () => ({
    BadRequest: class {
      get integrationNotFound() {
        const { HttpException } = require('@nestjs/common');
        throw new HttpException('Цалингийн нэгтгэл олдсонгүй.', 400);
      }
      static integrationAmountExceeded(balance: number) {
        const { HttpException } = require('@nestjs/common');
        throw new HttpException(
          `Төлөх дүн үлдэгдлээс их байна. Үлдэгдэл: ${balance}₮`,
          400,
        );
      }
    },
  }),
  { virtual: true },
);

import { HttpException } from '@nestjs/common';
import { PaymentType, STATUS } from 'src/base/constants';
import { IntegrationPaymentService } from './integration_payment.service';

describe('IntegrationPaymentService', () => {
  let service: IntegrationPaymentService;
  let dao: {
    add: jest.Mock;
    getLatestIntegrationId: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    getByDate: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(() => {
    uuidCounter = 0;
    dao = {
      add: jest.fn().mockResolvedValue('payment-1'),
      getLatestIntegrationId: jest.fn().mockResolvedValue(null),
      list: jest.fn(),
      getById: jest.fn(),
      getByDate: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };

    service = new IntegrationPaymentService(
      dao as any,
      {} as any,
      { getReconciliation: jest.fn() } as any,
      {} as any,
    );
  });

  it('creates one transfer row without splitting by salary balance', async () => {
    const paidAt = new Date('2026-04-19T10:00:00.000Z');

    await service.create({
      artist_id: 'artist-1',
      amount: 811000,
      type: PaymentType.SALARY,
      paid_at: paidAt,
      paid_by: 'admin-1',
    } as any);

    expect(dao.add).toHaveBeenCalledTimes(1);
    expect(dao.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'uuid-1',
        artist_id: 'artist-1',
        amount: 811000,
        paid_at: paidAt,
        status: STATUS.Active,
      }),
    );
    expect(dao.getLatestIntegrationId).not.toHaveBeenCalled();
  });

  it('keeps explicit integration_id when one is provided', async () => {
    await service.create({
      artist_id: 'artist-1',
      integration_id: 'integration-1',
      amount: 5000,
      type: PaymentType.SALARY,
      paid_at: new Date('2026-04-19T10:00:00.000Z'),
      paid_by: 'admin-1',
    } as any);

    expect(dao.add).toHaveBeenCalledWith(
      expect.objectContaining({
        integration_id: 'integration-1',
      }),
    );
  });

  it('rejects invalid payment amounts before inserting', async () => {
    await expect(
      service.create({
        artist_id: 'artist-1',
        amount: 0,
        type: PaymentType.ADVANCE,
        paid_at: new Date('2026-04-19T10:00:00.000Z'),
        paid_by: 'admin-1',
      } as any),
    ).rejects.toBeInstanceOf(HttpException);

    expect(dao.add).not.toHaveBeenCalled();
  });
});
