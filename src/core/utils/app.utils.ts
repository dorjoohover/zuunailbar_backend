import _ from 'lodash';
import moment from 'moment-timezone';
import numeral from 'numeral';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export class AppUtils {
  static uuid4(): string {
    return uuidv4().replace(/-/g, '');
  }

  static sha1(plain: string): string {
    const generator = crypto.createHash('sha1');
    generator.update(plain);
    return generator.digest('hex');
  }

  static generateDigits(size: number): string {
    return _.join(
      _.times(size, () => _.random(0, 9)),
      '',
    );
  }

  static zeroPadding(value: number | string, length: number): string {
    const pad = _.join(_.times(length, _.constant('0')), '');
    return (pad + value).slice(-pad.length);
  }

  static rightPadding(
    value: number | string,
    length: number,
    character: string,
  ): string {
    const pad = _.join(_.times(length, _.constant(character)), '');
    return (value + pad).slice(0, pad.length);
  }

  static encodeBase64(plain: string) {
    return Buffer.from(plain).toString('base64');
  }

  static decodeBase64(encoded: string) {
    return Buffer.from(encoded, 'base64').toString('utf8');
  }

  static escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static compare(left: any, right: any) {
    if (!left && !right) {
      return true;
    }
    return `${left}` === `${right}`;
  }

  static isNumber(value: string) {
    return /^\d*\.?\d+$/.test(value);
  }

  static formatNumber(value: number, format = '0,0.00'): string {
    if (value) {
      numeral.defaultFormat(format);
      return `${numeral(value).format()}`;
    } else {
      return '';
    }
  }

  static money(value: number, currency: string): string {
    if (value && currency) {
      return `${currency} ${AppUtils.formatNumber(value)}`;
    } else {
      return '';
    }
  }

  static normalizeAmount(amount: number, scale = 2): number {
    const multiplier = 10 ** scale;
    return Math.round(amount * multiplier) / multiplier;
  }

  static formatDate(raw: any, fmt?: string) {
    if (raw) {
      const format = fmt || 'YYYY-MM-DD HH:mm:ss';
      if (/^\d+$/.test(raw)) {
        return moment(Number(raw)).format(format);
      } else {
        return moment(raw).format(format);
      }
    } else {
      return 'N/A';
    }
  }

  static async mkdirP(dirPath: string, mode: any): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch (error) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  static maskPan(pan: string): string {
    return `${pan.substring(0, 4)} ${pan.substring(4, 6)}** **** ${pan.substring(12)}`;
  }

  static parseDate(date: any) {
    return moment(date).tz('Asia/Ulaanbaatar').toDate();
  }

  static parseStartDate(date: any) {
    return moment(date).tz('Asia/Ulaanbaatar').startOf('day').toISOString(true);
  }

  static parseEndDate(date: any) {
    return moment(date).tz('Asia/Ulaanbaatar').endOf('day').toISOString(true);
  }

  static now() {
    return moment().tz('Asia/Ulaanbaatar');
  }
}
