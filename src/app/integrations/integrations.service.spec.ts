jest.mock('./integrations.dao', () => ({
  IntegrationDao: class {},
}));
jest.mock('../integration_payments/integration_payment.dao', () => ({
  IntegrationPaymentDao: class {},
}));
jest.mock('../user/user.service', () => ({
  UserService: class {},
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
  () => {
    const toYmd = (value: Date | string | number = new Date()) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ulaanbaatar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value));

    return {
      getDefinedKeys: (obj: Record<string, unknown>) =>
        Object.keys(obj).filter((key) => obj[key] !== undefined),
      mnDate: toYmd,
      SALARY_LOG_STATUS: {
        Pending: 10,
      },
      SalaryLogValue: {
        10: 'Pending',
      },
      STATUS: {
        Active: 10,
        Hidden: 0,
      },
      ubDateAt00: (value: Date | string | number = new Date()) =>
        new Date(`${toYmd(value)}T00:00:00.000Z`),
      usernameFormatter: () => '',
    };
  },
  { virtual: true },
);
jest.mock(
  'src/core/utils/app.utils',
  () => ({
    AppUtils: {
      uuid4: () => 'integration-1',
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

import { IntegrationService } from './integrations.service';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let dao: {
    add: jest.Mock;
    getById: jest.Mock;
    getByDate: jest.Mock;
    getByArtistAndDate: jest.Mock;
    getArtistIncomeTotals: jest.Mock;
    update: jest.Mock;
    list: jest.Mock;
    getListSummary: jest.Mock;
  };
  let integrationPaymentDao: {
    getArtistTransferTotals: jest.Mock;
  };

  beforeEach(() => {
    dao = {
      add: jest.fn(),
      getById: jest.fn(),
      getByDate: jest.fn(),
      getByArtistAndDate: jest.fn(),
      getArtistIncomeTotals: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      getListSummary: jest.fn(),
    };
    integrationPaymentDao = {
      getArtistTransferTotals: jest.fn(),
    };

    service = new IntegrationService(
      dao as any,
      integrationPaymentDao as any,
      {} as any,
      {} as any,
    );
  });

  it('normalizes created salary log dates to YYYY-MM-DD', async () => {
    dao.add.mockResolvedValue('integration-1');

    await service.create({
      artist_id: 'artist-1',
      approved_by: 'admin-1',
      date: new Date('2026-04-05T16:00:00.000Z'),
      amount: 150000,
      salary_status: 10,
      order_count: 2,
    });

    expect(dao.add).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-04-06',
      }),
    );
  });

  it('serializes fetched salary log dates as date-only strings', async () => {
    dao.getById.mockResolvedValue({
      id: 'integration-1',
      artist_id: 'artist-1',
      approved_by: 'admin-1',
      date: new Date('2026-04-06T00:00:00.000Z'),
      amount: 150000,
      salary_status: 10,
      order_count: 2,
      status: 10,
    });

    const result = await service.findOne('integration-1');

    expect(result).toEqual(
      expect.objectContaining({
        date: '2026-04-06',
      }),
    );
  });

  it('keeps salary log updates date-only when aggregating confirmed orders', async () => {
    dao.getByArtistAndDate.mockResolvedValue({
      id: 'integration-1',
      amount: 150000,
      order_count: 2,
    });
    dao.update.mockResolvedValue(1);

    await service.updateSalaryLog({
      artist_id: 'artist-1',
      approved_by: 'admin-1',
      date: new Date('2026-04-05T16:00:00.000Z'),
      amount: 50000,
      salary_status: 10,
      order_count: 1,
      day: 1,
    });

    expect(dao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'integration-1',
        date: '2026-04-06',
      }),
      expect.arrayContaining(['date']),
    );
  });

  it('defaults missing salary_status to pending when creating salary logs', async () => {
    dao.getByArtistAndDate.mockResolvedValue(null);
    dao.add.mockResolvedValue('integration-1');

    await service.updateSalaryLog({
      artist_id: 'artist-1',
      approved_by: 'admin-1',
      date: '2026-04-27',
      amount: 50000,
      order_count: 1,
      day: 5,
    });

    expect(dao.add).toHaveBeenCalledWith(
      expect.objectContaining({
        salary_status: 10,
      }),
    );
  });

  it('calculates reconciliation salary and balance from artist percent', async () => {
    dao.getArtistIncomeTotals.mockResolvedValue([
      {
        artist_id: 'artist-1',
        income_amount: '100000',
        salary_amount: '30000',
        order_count: '1',
        percent: '30',
        salary_day: '5',
      },
    ]);
    integrationPaymentDao.getArtistTransferTotals.mockResolvedValue([
      {
        artist_id: 'artist-1',
        transferred_amount: '5000',
      },
    ]);

    const result = await service.getReconciliation({
      from: '2026-04-01',
      to: '2026-04-15',
    } as any);

    expect(result.items).toEqual([
      expect.objectContaining({
        artist_id: 'artist-1',
        income_amount: 100000,
        salary_amount: 30000,
        transferred_amount: 5000,
        balance_amount: 25000,
        percent: 30,
        salary_day: 5,
      }),
    ]);
    expect(result.summary).toEqual(
      expect.objectContaining({
        income_amount: 100000,
        salary_amount: 30000,
        transferred_amount: 5000,
        balance_amount: 25000,
        order_count: 1,
      }),
    );
  });
});
