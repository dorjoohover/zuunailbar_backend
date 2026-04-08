export class IntegrationDto {
  artist_id: string;
  approved_by: string;
  date: Date | string;
  amount: number;
  salary_status: number;
  order_count: number;
}

export class IntegrationLogDto {
  artist_id: string;
  approved_by: string;
  date: Date | string;
  amount: number;
  salary_status: number;
  order_count: number;
  day: number;
}
