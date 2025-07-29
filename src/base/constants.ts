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
export const saltOrRounds = 1;

export const firstLetterUpper = (value: string) => {
  if (value.length == 0) return value;
  return `${value.substring(0, 1).toUpperCase()}${value.substring(1)}`;
};

export enum AdminUserStatus {
  Active = 10,
  Deleted = 20,
}
export enum UserStatus {
  Active = 10,
  Deleted = 20,
}

export enum DISCOUNT {
  Percent = 10,
  Price = 20,
  Constant = 30,
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
  Excused = 20,
  Vacation = 30,
  Absent = 40,
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
  Hidden = 20,
}
