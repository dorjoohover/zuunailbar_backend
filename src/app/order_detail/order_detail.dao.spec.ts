jest.mock(
  'src/core/db/pg/app.db',
  () => ({
    AppDB: class {},
  }),
  { virtual: true },
);

jest.mock(
  'src/core/db/pg/sql.builder',
  () => ({
    SqlBuilder: class {},
    SqlCondition: class {},
  }),
  { virtual: true },
);

jest.mock(
  'src/common/error',
  () => ({
    BadRequest: class {},
    OrderError: class {
      get artistTimeUnavailable() {
        return new Error('Artist time unavailable');
      }
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/base/constants',
  () => ({
    OrderStatus: {
      Finished: 40,
    },
    STATUS: {
      Active: 10,
    },
  }),
  { virtual: true },
);

import { OrderDetailDao } from './order_detail.dao';

describe('OrderDetailDao', () => {
  let dao: OrderDetailDao;
  let db: {
    insert: jest.Mock;
    insertTx: jest.Mock;
  };

  beforeEach(() => {
    db = {
      insert: jest.fn(),
      insertTx: jest.fn(),
    };

    dao = new OrderDetailDao(db as any);
  });

  it('persists duration when adding an order detail', async () => {
    await dao.add({
      id: 'detail-1',
      order_id: 'order-1',
      service_id: 'service-1',
      service_name: 'Service 1',
      user_id: 'artist-1',
      nickname: 'Artist 1',
      description: '',
      price: 10000,
      duration: 45,
      status: 10,
      start_time: '10:00:00',
      end_time: '10:45:00',
    } as any);

    expect(db.insert).toHaveBeenCalledWith(
      'order_details',
      expect.objectContaining({
        duration: 45,
      }),
      expect.arrayContaining(['duration']),
    );
  });

  it('persists duration when creating an order detail inside a transaction', async () => {
    await dao.create(
      { query: jest.fn() },
      {
        id: 'detail-1',
        order_id: 'order-1',
        service_id: 'service-1',
        service_name: 'Service 1',
        user_id: 'artist-1',
        nickname: 'Artist 1',
        description: '',
        price: 10000,
        duration: 45,
        status: 10,
        start_time: '10:00:00',
        end_time: '10:45:00',
      },
    );

    expect(db.insertTx).toHaveBeenCalledWith(
      expect.anything(),
      'order_details',
      expect.objectContaining({
        duration: 45,
      }),
      expect.arrayContaining(['duration']),
    );
  });
});
