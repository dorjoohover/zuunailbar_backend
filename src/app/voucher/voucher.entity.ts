import { UserLevel, VOUCHER, VoucherStatus } from 'src/base/constants';

export class Voucher {
  public id: string;
  public user_id: string;
  public name: string;
  public type: VOUCHER;
  public value: number;
  public level?: UserLevel | null;
  public voucher_status: VoucherStatus;
  public used_order_id?: string | null;
  public used_at?: Date | null;
  public created_by?: string | null;
  public note?: string | null;
  public status: number;
  public service_id?: string | null;
  public service_name?: string | null;
  public user_name?: string | null;
  public updated_at?: Date;
  public created_at?: Date;
  public mobile?: string | null;
}
