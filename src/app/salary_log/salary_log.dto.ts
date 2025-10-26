export class SalaryLogDto {
  user_id: string;
  approved_by: string;
  date: Date;
  amount: number;
  order_count: number;
}

export class SalaryDto {
  user_id: string;
  approved_by: string;
  date: Date;
  amount: number;
  salary_status: number;
  order_count: number;
  day: number;
}
