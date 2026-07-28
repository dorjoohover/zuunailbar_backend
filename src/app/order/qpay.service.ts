// src/qpay/qpay.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MobileParser } from 'src/common/formatter';
@Injectable()
export class QpayService {
  private readonly logger = new Logger(QpayService.name);
  private readonly refreshWindowMs = 24 * 60 * 60 * 1000;
  private readonly expirySkewMs = 30 * 1000;

  private baseUrl = 'https://merchant.qpay.mn/v2/';
  private accessToken?: string;
  private refreshToken?: string;
  private expiresIn?: Date;
  private tokenRecoveryPromise?: Promise<void>;

  constructor(private readonly httpService: HttpService) {}

  private clearTokens() {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.expiresIn = undefined;
  }

  private updateTokens(data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }) {
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresIn = new Date(Date.now() + data.expires_in * 1000);
  }

  private normalizeEndpoint(endpoint: string) {
    return endpoint.replace(/^\/+/, '');
  }

  private formatError(error: any) {
    const responseData = error?.response?.data;
    if (typeof responseData === 'string') return responseData;
    if (responseData?.message) return responseData.message;
    if (responseData) return JSON.stringify(responseData);
    return error?.message ?? 'Unknown error';
  }

  private canRefreshToken() {
    if (!this.refreshToken) return false;
    if (!this.expiresIn) return true;

    return Date.now() - this.expiresIn.getTime() < this.refreshWindowMs;
  }

  private hasExpiredToken() {
    if (!this.accessToken || !this.expiresIn) return true;

    return Date.now() >= this.expiresIn.getTime() - this.expirySkewMs;
  }

  private async runTokenRecovery(task: () => Promise<void>) {
    if (!this.tokenRecoveryPromise) {
      this.tokenRecoveryPromise = task().finally(() => {
        this.tokenRecoveryPromise = undefined;
      });
    }

    await this.tokenRecoveryPromise;
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('QPay refresh token is missing');
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.refreshToken}`,
          },
        },
      ),
    );

    this.updateTokens(response.data);
    this.logger.log('QPay access token refreshed');
  }

  private async recoverAuthorization(reason: string) {
    await this.runTokenRecovery(async () => {
      if (this.canRefreshToken()) {
        try {
          this.logger.warn(`${reason}. Refreshing QPay access token`);
          await this.refreshAccessToken();
          return;
        } catch (error) {
          this.logger.warn(
            `${reason}. QPay token refresh failed, re-authenticating`,
          );
          this.logger.debug(this.formatError(error));
          this.clearTokens();
        }
      } else {
        this.logger.warn(`${reason}. Re-authenticating with QPay`);
      }

      await this.authenticate();
    });
  }

  private async ensureValidToken() {
    if (this.hasExpiredToken()) {
      await this.recoverAuthorization('QPay access token missing or expired');
    }
  }

  private async requestWithToken<T = any>(
    method: 'GET' | 'POST',
    endpoint: string,
    data: any = {},
  ): Promise<T> {
    await this.ensureValidToken();
    const url = `${this.baseUrl}${this.normalizeEndpoint(endpoint)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        this.logger.warn(`QPay request returned 401 for ${endpoint}`);
        await this.recoverAuthorization('QPay request returned 401');
        const retryResponse = await firstValueFrom(
          this.httpService.request({
            method,
            url,
            data,
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          }),
        );
        return retryResponse.data;
      }

      this.logger.error('QPay request failed', this.formatError(error));
      throw error;
    }
  }
  private async authenticate() {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}auth/token`,
          {},
          {
            auth: {
              username: process.env.QPAY_CLIENT_ID,
              password: process.env.QPAY_CLIENT_SECRET,
            },
            timeout: 10000,
          },
        ),
      );

      this.updateTokens(response.data);
      this.logger.log('QPay access token authenticated');
    } catch (e) {
      this.clearTokens();
      this.logger.error('QPay authentication failed', this.formatError(e));
      throw e;
    }
  }

  // ✅ Invoice үүсгэх
  async createInvoice(
    amount: number,
    order_id: string,
    userId: string,
    branch: string,
    mobile: string,
  ) {
    try {
      const phone = MobileParser(mobile);
      const senderInvoiceNo = `${phone}-${order_id.slice(0, 12)}`;
      const res = await this.requestWithToken('POST', 'invoice', {
        // invoice_code: 'Zuunailbar',
        invoice_code: process.env.QPAY_INVOICE_CODE,
        sender_invoice_no: senderInvoiceNo,
        sender_branch_code: branch,
        invoice_receiver_code: `${userId}`,
        amount,
        invoice_description: 'Урьдчилгаа төлбөр.',
        invoice_due_date: null,
        allow_partial: false,
        minimum_amount: null,
        allow_exceed: false,
        maximum_amount: null,
        note: null,
        callback_url: `${process.env.QPAY_CALLBACK}/${order_id}/${userId}`,
      });

      return res;
    } catch (error) {
      this.logger.error(
        'QPay createInvoice failed',
        this.formatError(error),
      );
      throw error;
    }
  }

  // ✅ Invoice харах
  async getInvoice(id: string) {
    try {
      const res = await this.requestWithToken('GET', `invoice/${id}`, {});
      const payment = res?.payments?.[0];
      if (!payment) {
        throw new HttpException('Төлбөр олдсонгүй', HttpStatus.BAD_REQUEST);
      }
      return {
        status: payment.payment_status,
        amount: payment.payment_amount,
        transaction_type: payment.payment_type,
      };
    } catch (error) {
      this.logger.error('QPay getInvoice failed', this.formatError(error));
      throw error;
    }
  }

  // ✅ Төлбөр шалгах
  async checkPayment(invoiceId: string) {
    const res = await this.requestWithToken('POST', 'payment/check', {
      object_type: 'INVOICE',
      object_id: invoiceId,
      offset: {
        page_number: 1,
        page_limit: 100,
      },
    });
    return res;
  }
}
