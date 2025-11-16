import { STATUS } from 'src/base/constants';

export class ServiceCategoryMeta {
  public name: string;
}
export class Service {
  public id: string;
  public merchant_id: string;
  public category_id?: string;
  public name: string;
  public max_price: number;
  public min_price: number;
  public duration: number;
  public image: string;
  public icon: string;
  public description?: string;
  //uridchilgaa uneer
  public pre?: number;
  public status: STATUS;
  public created_by: string;
  public created_at?: Date;
  // web der service hesegt haragdah
  public view?: number;
  // haragah daraalal
  public index?: number;
  public meta?: ServiceCategoryMeta;
}
