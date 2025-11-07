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
  get notFoundClient() {
    throw new HttpException('Хэрэглэгч олдсонгүй.', HttpStatus.BAD_REQUEST);
  }

  notFound(name: string) {
    throw new HttpException(`${name} олдсонгүй.`, HttpStatus.BAD_REQUEST);
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

  get STOCK_EMPTY() {
    throw new HttpException('Үлдэгдэлгүй байна.', HttpStatus.BAD_REQUEST);
  }

  static required(message: string) {
    throw new HttpException(
      `${firstLetterUpper(message)} is required`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OrderError {
  // Артист сонгоогүй
  get userNotFound() {
    throw new HttpException('Артист сонгоогүй байна', HttpStatus.BAD_REQUEST);
  }
  get clientNotFound() {
    throw new HttpException(
      'Хэрэглэгч сонгоогүй байна',
      HttpStatus.BAD_REQUEST,
    );
  }

  // Захиалга аль хэдийн өгөгдсөн
  get orderAlreadyPlaced() {
    throw new HttpException(
      'Захиалга аль хэдийн өгөгдсөн байна',
      HttpStatus.BAD_REQUEST,
    );
  }

  // Төлбөр амжилтгүй
  get paymentFailed() {
    throw new HttpException('Төлбөр амжилтгүй боллоо', HttpStatus.BAD_REQUEST);
  }

  get dateOrTimeNotSelected() {
    throw new HttpException(
      'Цаг эсвэл өдөр сонгоогүй байна',
      HttpStatus.BAD_REQUEST,
    );
  }

  // Үйлчилгээ сонгоогүй
  get serviceNotSelected() {
    throw new HttpException(
      'Үйлчилгээ сонгоогүй байна',
      HttpStatus.BAD_REQUEST,
    );
  }

  // Цаг давхцаж байна
  get timeConflict() {
    throw new HttpException(
      'Сонгосон цаг давхцаж байна',
      HttpStatus.BAD_REQUEST,
    );
  }

  // Алдаатай цаг (жишээ нь 25)
  get invalidHour() {
    throw new HttpException(
      'Алдаатай цаг сонгосон байна',
      HttpStatus.BAD_REQUEST,
    );
  }

  // Цаг ажиллахгүй эсвэл өдөр, цаг буруу
  get nonWorkingHour() {
    throw new HttpException(
      'Сонгосон цаг ажиллахгүй эсвэл буруу өдөр/цаг байна',
      HttpStatus.BAD_REQUEST,
    );
  }
  get artistTimeUnavailable() {
    throw new HttpException(
      'Сонгосон артистын энэ цаг боломжгүй байна',
      HttpStatus.BAD_REQUEST,
    );
  }
  // Хэрэглэгч идэвхгүй
  get userInactive() {
    throw new HttpException('Хэрэглэгч идэвхгүй байна', HttpStatus.BAD_REQUEST);
  }
  // Banned user
  get bannedUser() {
    throw new HttpException(
      'Хэрэглэгч хориглогдсон байна',
      HttpStatus.FORBIDDEN,
    );
  }

  // Захиалга хийх эрхгүй
  get orderNotAllowed() {
    throw new HttpException(
      'Танд захиалга хийх эрх байхгүй',
      HttpStatus.FORBIDDEN,
    );
  }
}
export class NoPermissionException extends ForbiddenException {
  constructor(message = 'Эрх хүрэлцэхгүй байна') {
    super(message);
  }
}

export class AuthError {
  get unregister() {
    throw new HttpException(
      'Бүртгэлгүй хэрэглэгч байна.',
      HttpStatus.FORBIDDEN,
    );
  }
  get wrongPassword() {
    throw new HttpException('Нууц үг буруу байна.', HttpStatus.FORBIDDEN);
  }

  get checkPermission() {
    throw new HttpException('Эрх хүрэлцэхгүй байна.', HttpStatus.FORBIDDEN);
  }
}
