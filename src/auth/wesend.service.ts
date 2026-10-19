import { Injectable } from '@nestjs/common';
import { WeSend } from '@wesend/node';
import { MessageLogDao } from './message.log.dao';

@Injectable()
export class WeSendService {
  constructor(private readonly messageLog: MessageLogDao) {}
  private wesend_api_key: string = process.env.WESEND_API_KEY || '';

  async sendSMS(mobile: string, message: string): Promise<any> {
    const wesend = new WeSend(this.wesend_api_key);
    try {
      // SDK makes a fresh idempotency key per call; a fixed key would dedupe every SMS after the first
      const response = await wesend.sms.send({
        to: mobile,
        text: message,
      });
      const { status, error } = response;

      await this.messageLog.add({
        mobile,
        message,
        success: status === 'sent',
        error: error ? `${error.code}: ${error.message}` : null,
      });

      return status === 'sent';
    } catch (error) {
      console.error('Error sending SMS via WeSend:', error);
      // WeSendError (insufficient_credits, invalid_api_key, ...) энд ирдэг тул түүхэнд үлдээнэ
      await this.messageLog.add({
        mobile,
        message,
        success: false,
        error: error?.code
          ? `${error.code}: ${error.message}`
          : String(error?.message ?? error),
      });
      return false;
    }
  }

  async getBalance(): Promise<any> {
    const wesend = new WeSend(this.wesend_api_key);
    try {
      const balance = await wesend.balance.get();
      return balance;
    } catch (error) {
      console.error('Error fetching balance from WeSend:', error);
      throw error;
    }
  }

  async getPrice(): Promise<any> {
    const wesend = new WeSend(this.wesend_api_key);
    try {
      const price = await wesend.pricing.get();
      return price;
    } catch (error) {
      console.error('Error fetching price from WeSend:', error);
      throw error;
    }
  }
}
