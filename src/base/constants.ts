import { User } from 'src/app/user/user.entity';

export const DEFAULT_SKIP = 0;
export const DEFAULT_LIMIT = 20;
export const DEFAULT_SORT = false;
export const ADMINUSERS = 10;
export const ADMIN = 20;
export const MANAGER = 30;
export const EMPLOYEE = 40;
export const CLIENT = 50;

export const isOnlyFieldPresent = (query, field) => {
  const removeKeys = ['size', 'page', 'limit', 'skip', 'sort'];
  console.log(query);
  const filteredKeys = Object.keys(query).filter(
    (key) => !removeKeys.includes(key),
  );
  return filteredKeys.length === 1 && filteredKeys[0] === field;
};
export const isAnyFieldPresent = (query) => {
  const removeKeys = ['size', 'page', 'limit', 'skip', 'sort'];
  const filteredKeys = Object.keys(query).filter(
    (key) => !removeKeys.includes(key),
  );
  return filteredKeys;
};

export function getDefinedKeys(obj: Record<string, any>): string[] {
  return Object.entries(obj)

    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key]) => key);
}
export const MN_TZ = 'Asia/Ulaanbaatar' as const;
export const usernameFormatter = (user: User) => {
  return (
    user.nickname ??
    `${user.lastname && `${firstLetterUpper(user.lastname)}.`}${
      user.firstname ?? ''
    }`
  );
};
export function mnDayRange(d: Date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const pick = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const y = pick('year'),
    m = pick('month'),
    day = pick('day');
  return {
    start: new Date(Date.UTC(y, m - 1, day, 0, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, day + 1, 0, 0, 0)),
  };
}

export const saltOrRounds = 1;
export function toTimeString(hour: number | string): string {
  const h = String(hour).padStart(2, '0');
  return `${h}:00:00`;
}
export function startOfISOWeek(d: Date) {
  const date = new Date(d);
  const isoDay = (date.getDay() + 6) % 7; // 0=Даваа, 6=Ням
  date.setDate(date.getDate() - isoDay);
  date.setHours(0, 0, 0, 0);
  return date;
}
export const firstLetterUpper = (value: string) => {
  if (value.length == 0) return value;
  return `${value.substring(0, 1).toUpperCase()}${value.substring(1)}`;
};

export const mnDate = (d = new Date()): Date => {
  const now = new Date(d);
  const mongoliaTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Ulaanbaatar' }),
  );
  return mongoliaTime;
};
export function getMnParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const pick = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = pick('year'),
    m = pick('month'),
    day = pick('day');
  return {
    y,
    m,
    day,
    ymd: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}
export enum AdminUserStatus {
  Active = 10,
  Deleted = 20,
}
export enum CategoryType {
  DEFAULT = 10,
  COST = 20,
}
export enum UserStatus {
  Active = 10,
  Deleted = 20,
}
export enum CostStatus {
  Paid = 10,
  Remainder = 20,
}

export enum DISCOUNT {
  Percent = 10,
  Price = 20,
}
export enum VOUCHER {
  Percent = 10,
  Price = 20,
  Service = 30,
}
export enum SCHEDULE_TYPE {
  Employee = 10,
  Branch = 20,
}

export const round = (value: number, round = 1000) => {
  return Math.floor(value / round) * round;
};

export const DiscountValue = {
  [DISCOUNT.Percent]: 'Percent',
  [DISCOUNT.Price]: 'Price',
};
export enum ScheduleStatus {
  Active = 10,
  Pending = 20,

  Hidden = 60,
}
export enum ScheduleType {
  Free = 10,
  Vacation = 20,
}

export enum UserProductStatus {
  Active = 10,
  Returned = 20,
  Lost = 30,
  Damaged = 40,
  Replaced = 50,
}

export enum STATUS {
  Active = 10,
  Pending = 20,
  Hidden = 30,
}
export enum COST_STATUS {
  Paid = 10,
  Pending = 20,
}

export enum PRODUCT_STATUS {
  Active = 10,
  Hidden = 20,
}
export enum SALARY_LOG_STATUS {
  Pending = 10,
  Paid = 20,
}
export enum PRODUCT_TRANSACTION_STATUS {
  Used = 10,
  Sold = 20,
  Damaged = 30,
}
export enum PRODUCT_LOG_STATUS {
  Bought = 10,
  Remainder = 20,
  // Damaged = 30,
}
