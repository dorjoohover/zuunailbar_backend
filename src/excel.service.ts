// src/reporting/report-kit.service.ts
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { mnDate, ubDateAt00 } from './base/constants';

export type ColumnDef<T> = { header: string; key: keyof T; width?: number };

@Injectable()
export class ExcelService {
  async xlsxFromIterable<T extends Record<string, any>>(
    res: Response,
    filename: string,
    columns: ColumnDef<T>[],
    rows: T[],
    opts?: {
      sheetName?: string;
      moneyKeys?: string[];
      dateKeys?: string[];
    },
  ) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}_${dateStr}.xlsx"`,
    );

    const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const ws = wb.addWorksheet(opts?.sheetName ?? 'Data');

    // column тохиргоо
    ws.columns = columns.map((c) => ({
      header: c.header,
      key: c.key as string,
      width: c.width ?? 16,
    }));

    // эхний мөрийг bold
    ws.getRow(1).font = { bold: true };
    ws.autoFilter = {
      from: 'A1',
      to: String.fromCharCode(64 + columns.length) + '1',
    };

    const moneySet = new Set((opts?.moneyKeys ?? []).map(String));
    const dateSet = new Set((opts?.dateKeys ?? []).map(String));

    for await (const r of rows) {
      const row = ws.addRow(r);

      // мөнгөн формат
      moneySet.forEach((k) => {
        const cell = row.getCell(k);
        cell.numFmt = '#,##0" ₮"'; // ₮ тэмдэгтэй
      });

      // огнооны формат
      dateSet.forEach((k) => {
        const cell = row.getCell(k);
        if (cell.value instanceof Date) {
          (cell as any).numFmt = 'yyyy-mm-dd';
        }
      });

      row.commit();
    }

    ws.commit();
    await wb.commit();
    res.end();
  }
}
