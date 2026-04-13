import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
jest.mock(
  'src/common/formatter',
  () => ({
    MobileParser: (value: string) => value,
  }),
  { virtual: true },
);
import { QpayService } from './qpay.service';

describe('QpayService', () => {
  let service: QpayService;
  let httpService: {
    post: jest.Mock;
    request: jest.Mock;
  };
  const originalEnv = {
    clientId: process.env.QPAY_CLIENT_ID,
    clientSecret: process.env.QPAY_CLIENT_SECRET,
    invoiceCode: process.env.QPAY_INVOICE_CODE,
    callback: process.env.QPAY_CALLBACK,
  };

  beforeEach(() => {
    process.env.QPAY_CLIENT_ID = 'client-id';
    process.env.QPAY_CLIENT_SECRET = 'client-secret';
    process.env.QPAY_INVOICE_CODE = 'invoice-code';
    process.env.QPAY_CALLBACK = 'https://example.com/qpay';

    httpService = {
      post: jest.fn(),
      request: jest.fn(),
    };

    service = new QpayService(httpService as unknown as HttpService);
  });

  afterEach(() => {
    process.env.QPAY_CLIENT_ID = originalEnv.clientId;
    process.env.QPAY_CLIENT_SECRET = originalEnv.clientSecret;
    process.env.QPAY_INVOICE_CODE = originalEnv.invoiceCode;
    process.env.QPAY_CALLBACK = originalEnv.callback;
    jest.clearAllMocks();
  });

  it('re-authenticates when a request returns 401 and refresh fails', async () => {
    (service as any).accessToken = 'stale-access';
    (service as any).refreshToken = 'stale-refresh';
    (service as any).expiresIn = new Date(Date.now() + 5 * 60 * 1000);

    httpService.request
      .mockReturnValueOnce(
        throwError(() => ({
          response: {
            status: 401,
            data: { message: 'Unauthorized' },
          },
          message: 'Unauthorized',
        })),
      )
      .mockReturnValueOnce(
        of({
          data: {
            paid_amount: 100,
            rows: [],
          },
        }),
      );

    httpService.post.mockImplementation((url: string) => {
      if (url.endsWith('auth/refresh')) {
        return throwError(() => ({
          response: {
            status: 401,
            data: { message: 'Refresh expired' },
          },
          message: 'Refresh expired',
        }));
      }

      if (url.endsWith('auth/token')) {
        return of({
          data: {
            access_token: 'fresh-access',
            refresh_token: 'fresh-refresh',
            expires_in: 3600,
          },
        });
      }

      throw new Error(`Unexpected POST ${url}`);
    });

    await expect(service.checkPayment('invoice-1')).resolves.toEqual({
      paid_amount: 100,
      rows: [],
    });

    expect(httpService.request).toHaveBeenCalledTimes(2);
    expect(httpService.post).toHaveBeenCalledTimes(2);
    expect(httpService.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer fresh-access',
        },
      }),
    );
  });

  it('skips refresh and authenticates when the refresh window has passed', async () => {
    (service as any).accessToken = 'expired-access';
    (service as any).refreshToken = 'expired-refresh';
    (service as any).expiresIn = new Date(Date.now() - 25 * 60 * 60 * 1000);

    httpService.post.mockImplementation((url: string) => {
      if (url.endsWith('auth/token')) {
        return of({
          data: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_in: 3600,
          },
        });
      }

      throw new Error(`Unexpected POST ${url}`);
    });

    httpService.request.mockReturnValueOnce(
      of({
        data: {
          invoice_id: 'invoice-1',
          qr_image: 'image',
          qr_text: 'text',
        },
      }),
    );

    await expect(
      service.createInvoice(5000, 'order-1', 'user-1', 'branch-1', '94001234'),
    ).resolves.toEqual({
      invoice_id: 'invoice-1',
      qr_image: 'image',
      qr_text: 'text',
    });

    expect(httpService.post).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://merchant.qpay.mn/v2/auth/token',
      {},
      expect.objectContaining({
        auth: {
          username: 'client-id',
          password: 'client-secret',
        },
      }),
    );
    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://merchant.qpay.mn/v2/invoice',
        headers: {
          Authorization: 'Bearer new-access',
        },
      }),
    );
  });

  it('rethrows invoice creation errors instead of swallowing them', async () => {
    const authError = {
      response: {
        status: 401,
        data: { message: 'Unauthorized' },
      },
      message: 'Unauthorized',
    };

    httpService.post.mockReturnValueOnce(throwError(() => authError));

    await expect(
      service.createInvoice(5000, 'order-1', 'user-1', 'branch-1', '94001234'),
    ).rejects.toBe(authError);
  });

  it('clears stale tokens after refresh and auth both fail, then authenticates directly on the next request', async () => {
    (service as any).accessToken = 'stale-access';
    (service as any).refreshToken = 'stale-refresh';
    (service as any).expiresIn = new Date(Date.now() + 5 * 60 * 1000);

    httpService.request.mockReturnValueOnce(
      throwError(() => ({
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        message: 'Unauthorized',
      })),
    );

    httpService.post.mockImplementation((url: string) => {
      if (url.endsWith('auth/refresh')) {
        return throwError(() => ({
          response: {
            status: 401,
            data: { message: 'Refresh expired' },
          },
          message: 'Refresh expired',
        }));
      }

      if (url.endsWith('auth/token')) {
        return throwError(() => ({
          response: {
            status: 401,
            data: { message: 'Нэвтрэх нэр, нууц үг буруу' },
          },
          message: 'Bad credentials',
        }));
      }

      throw new Error(`Unexpected POST ${url}`);
    });

    await expect(service.checkPayment('invoice-1')).rejects.toMatchObject({
      response: {
        status: 401,
      },
    });

    expect((service as any).accessToken).toBeUndefined();
    expect((service as any).refreshToken).toBeUndefined();
    expect((service as any).expiresIn).toBeUndefined();

    httpService.post.mockClear();
    httpService.request.mockClear();

    httpService.post.mockImplementation((url: string) => {
      if (url.endsWith('auth/token')) {
        return of({
          data: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_in: 3600,
          },
        });
      }

      throw new Error(`Unexpected POST ${url}`);
    });

    httpService.request.mockReturnValueOnce(
      of({
        data: {
          paid_amount: 200,
          rows: [],
        },
      }),
    );

    await expect(service.checkPayment('invoice-1')).resolves.toEqual({
      paid_amount: 200,
      rows: [],
    });

    expect(httpService.post).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://merchant.qpay.mn/v2/auth/token',
      {},
      expect.objectContaining({
        auth: {
          username: 'client-id',
          password: 'client-secret',
        },
      }),
    );
  });
});
