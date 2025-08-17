import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { ADMINUSERS, firstLetterUpper } from 'src/base/constants';

export class BadRequest {
  static merchantNotFound(merchant: any, role: number) {
    if (!merchant && !merchant?.id && role != ADMINUSERS) {
      throw new HttpException('Merchant id not found', HttpStatus.BAD_REQUEST);
    }
  }
  static branchNotFound(branch: any, role: number) {
    if (!branch && !branch?.id && role != ADMINUSERS) {
      throw new HttpException('Branch id not found', HttpStatus.BAD_REQUEST);
    }
  }

  get registered() {
    throw new HttpException(
      'Бүртгэлтэй хэрэглэгч байна',
      HttpStatus.BAD_REQUEST,
    );
  }
  get OTP_INVALID() {
    throw new HttpException(
      'Нэг удаагийн нууц үг буруу байна',
      HttpStatus.BAD_REQUEST,
    );
  }
  get STOCK_INSUFFICIENT() {
    throw new HttpException('Үлдэгдэл хүрэлцэхгүй', HttpStatus.BAD_REQUEST);
  }
  static required(message: string) {
    throw new HttpException(
      `${firstLetterUpper(message)} is required`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class NoPermissionException extends ForbiddenException {
  constructor(message = 'Эрх хүрэлцэхгүй байна') {
    super(message);
  }
}
