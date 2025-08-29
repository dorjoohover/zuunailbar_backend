// src/reporting/report-kit.service.ts
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

export type ColumnDef<T> = { header: string; key: keyof T; width?: number };

@Injectable()
export class ReportService {
  /** CSV: async iterable-ээс мөр мөрөөр бичнэ (RAM бага) */
  async csvFromIterable<T extends Record<string, any>>(
    res: Response,
    filename: string,
    columns: ColumnDef<T>[],
    rows: AsyncIterable<T> | Iterable<T>,
  ) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Header
    res.write(columns.map((c) => c.header).join(',') + '\n');

    for await (const r of rows as AsyncIterable<T>) {
      const line = columns.map((c) => String(r[c.key] ?? '')).join(',');
      res.write(line + '\n');
    }
    res.end();
  }

  /** XLSX: async iterable-ээс шууд streaming writer-р бичнэ (RAM бага) */
  async xlsxFromIterable<T extends Record<string, any>>(
    res: Response,
    filename: string,
    columns: ColumnDef<T>[],
    rows: AsyncIterable<T> | Iterable<T>,
    opts?: { sheetName?: string; moneyKeys?: string[] },
  ) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const ws = wb.addWorksheet(opts?.sheetName ?? 'Data');

    ws.columns = columns.map((c) => ({
      header: c.header,
      key: c.key as string,
      width: c.width ?? 16,
    }));
    ws.getRow(1).font = { bold: true };

    // Optional: мөнгөн формат
    const moneySet = new Set((opts?.moneyKeys ?? []).map(String));
    for await (const r of rows as AsyncIterable<T>) {
      const row = ws.addRow(r);
      moneySet.forEach((k) => {
        const cell = row.getCell(k);
        if (typeof cell.value === 'number') (cell as any).numFmt = '#,##0" ₮"';
      });
      row.commit();
    }

    ws.commit();
    await wb.commit(); // чухал
    res.end();
  }
}
