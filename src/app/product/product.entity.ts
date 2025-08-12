import { CategoryType } from 'src/base/constants';

export class Product {
  id: string;
  brand_id: string;
  brand_name: string;
  category_name: string;
  category_id: string;
  name: string;
  ref: string;
  quantity: number;
  type: CategoryType;
  price: number;
  color: string;
  size: string;
  status: number;
  merchant_id: string;
  created_at?: Date;
}
