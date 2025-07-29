import { Injectable } from '@nestjs/common';
import { DEFAULT_SKIP } from './constants';
import { Meta } from './base.interface';
import { RolePermission } from 'src/auth/guards/role/role.decorator';
import { DashUser } from 'src/auth/extentions';
import * as XLSX from 'xlsx';
import { File } from 'multer';

@Injectable()
export class BaseService {
  public mapListResult(
    count: number,
    items: any[],
    filter: any,
    summary?: any,
  ) {
    const result: any = {};
    const skip = filter.skip > 0 ? filter.skip : DEFAULT_SKIP;

    const currentPage = filter.page > 0 ? filter.page : 1;

    const helper = Math.floor(count / skip);
    const pageCount = helper == 0 ? 1 : helper;
    const meta: Meta = {
      count: count,
      page: currentPage,
      total: pageCount,
      skip: skip,
    };
    if (summary) {
      result.summary = summary;
    }
    result.meta = meta;
    result.items = items;
    return result;
  }

  // public adjustFilterForPaging(filter: any) {
  //   filter.skip = Number(filter.size || '' + DEFAULT_SKIP);
  //   filter.skip = Number(filter.page || '0') * filter.limit;
  // }

  public applyFilter(filter: any, user: any): any {
    if (user) {
      if (user.merchant) {
        filter.merchantId = user.merchant.id;
      } else if (user.terminal) {
        filter.merchantId = user.terminal.merchantId;
        filter.terminalId = user.terminal.id;
      }
    }
    return filter;
  }

  public createAxiosConfig(
    method: string,
    url: string,
    dataOrParams?: any,
    isParams = false,
  ) {
    const config = {
      method,
      maxBodyLength: Infinity,
      url: `${process.env.MANAGEMENT_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        app: 'terminal',
        'device-id': 'managament',
      },
      ...(isParams ? { params: dataOrParams } : { data: dataOrParams }),
    };
    return config;
  }

  public isModerator(user: DashUser) {
    return user.permission === RolePermission.MODERATOR;
  }

  public getEntity(payload: any): Promise<any> {
    throw new Error('Method not implemented.');
  }

  decodeBase64File(base64Str: string): Buffer {
    if (!base64Str) {
      throw new Error('Base64 string is missing.');
    }

    const base64 = base64Str.split(';base64,')[1];

    if (!base64) {
      throw new Error('Invalid base64 format.');
    }
    return Buffer.from(base64, 'base64');
  }

  public async parseExcelFile(file: File) {
    const buffer = this.decodeBase64File(file.base64);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }
}
