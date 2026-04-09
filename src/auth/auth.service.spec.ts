import * as bcrypt from 'bcrypt';

jest.mock(
  'src/app/admin.user/admin.user.service',
  () => ({
    AdminUserService: class {},
  }),
  { virtual: true },
);
jest.mock(
  'src/app/user/user.service',
  () => ({
    UserService: class {},
  }),
  { virtual: true },
);
jest.mock(
  './auth.dto',
  () => ({
    LoginDto: class {},
    RegisterDto: class {},
    ResetCurrentPasswordDto: class {},
    ResetPasswordDto: class {},
  }),
  { virtual: true },
);
jest.mock(
  'src/base/constants',
  () => ({
    ADMIN: 20,
    CLIENT: 50,
  }),
  { virtual: true },
);
jest.mock(
  'src/common/error',
  () => ({
    AuthError: class {
      get unregister() {
        throw new Error('Бүртгэлгүй хэрэглэгч байна.');
      }
      get wrongPassword() {
        throw new Error('Нууц үг буруу байна.');
      }
      get checkPermission() {
        throw new Error('Эрх хүрэлцэхгүй байна.');
      }
    },
    BadRequest: class {
      get OTP_INVALID() {
        throw new Error('Нэг удаагийн нууц үг буруу байна');
      }
      get unregistered() {
        throw new Error('Бүртгэлгүй хэрэглэгч байна');
      }
    },
  }),
  { virtual: true },
);
jest.mock(
  './resend.service',
  () => ({
    ResendService: class {},
  }),
  { virtual: true },
);

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let adminUsersService: {
    getAdminUser: jest.Mock;
  };
  let userService: {
    findMobile: jest.Mock;
    resetPassword: jest.Mock;
  };
  let jwtService: {
    sign: jest.Mock;
  };
  let mailer: {
    sendMail: jest.Mock;
  };

  beforeEach(() => {
    adminUsersService = {
      getAdminUser: jest.fn(),
    };
    userService = {
      findMobile: jest.fn(),
      resetPassword: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(() => 'signed-token'),
    };
    mailer = {
      sendMail: jest.fn(),
    };

    service = new AuthService(
      adminUsersService as any,
      userService as any,
      jwtService as any,
      mailer as any,
    );
  });

  it('authenticates client login against the users service', async () => {
    userService.findMobile.mockResolvedValue({
      id: 'user-1',
      firstname: 'Test',
      lastname: 'User',
      role: 50,
      merchant_id: 'merchant-1',
      branch_id: null,
      password: await bcrypt.hash('secret', 1),
    });

    const result = await service.login({
      mobile: '99001122',
      password: 'secret',
    });

    expect(userService.findMobile).toHaveBeenCalledWith('99001122');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        merchant_id: 'merchant-1',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'signed-token',
        merchant_id: 'merchant-1',
      }),
    );
  });

  it('rejects password reset when the otp is invalid', async () => {
    await expect(
      service.reset({
        mobile: 'user@example.com',
        otp: '0000',
        password: 'secret',
        firstname: 'Test',
        lastname: 'User',
      }),
    ).rejects.toThrow('Нэг удаагийн нууц үг буруу байна');

    expect(userService.resetPassword).not.toHaveBeenCalled();
  });

  it('rejects password reset when the user was not updated', async () => {
    (service as any).otps['user@example.com'] = '1234';
    userService.resetPassword.mockResolvedValue(0);

    await expect(
      service.reset({
        mobile: 'user@example.com',
        otp: '1234',
        password: 'secret',
        firstname: 'Test',
        lastname: 'User',
      }),
    ).rejects.toThrow('Бүртгэлгүй хэрэглэгч байна');
  });
});
