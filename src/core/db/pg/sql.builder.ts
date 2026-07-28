import { AppDBInvalidDataException } from '../app.db.exceptions';

export class SqlCondition {
  constructor(
    public column: string,
    public cond: string,
    public value: any,
  ) {}
}

export class SqlConditionIsNull extends SqlCondition {
  constructor(public column: string) {
    super(column, 'IS NULL', null);
  }
}

export class SqlConditionIsNotNull extends SqlCondition {
  constructor(public column: string) {
    super(column, 'IS NOT NULL', null);
  }
}

export class SqlBuilder {
  object: any = {};
  columns: string[] = [];
  conditions: any[] = [];
  values: any[] = [];

  constructor(object: any, columns: string[] = []) {
    this.object = object;
    this.columns = columns;
  }

  private normalizeCondition(cond: string) {
    return cond.toUpperCase() === 'LIKE' ? 'ILIKE' : cond;
  }

  // Identifier-уудыг зөв quote хийх:
  //   "name"           → ` "name" `  (өөрчлөхгүй; өмнө нь quote хийгдсэн)
  //   LOWER("name")    → ` LOWER("name") ` (function call → өөрчлөхгүй)
  //   pt.status        → ` pt."status" ` (qualified → зөвхөн баруун хэсгийг quote)
  //   status           → ` "status" `
  private quoteIdentifier(column: string): string {
    const trimmed = column.trim();
    if (!trimmed) return trimmed;
    // Аль хэдийн quote хийгдсэн эсвэл function call (parenthesis-тэй) бол өөрчлөхгүй
    if (trimmed.includes('"') || trimmed.includes('(')) return trimmed;
    // Qualified нэр (pt.status гэх мэт)
    if (trimmed.includes('.')) {
      const parts = trimmed.split('.');
      return parts
        .map((p, i) => (i === parts.length - 1 ? `"${p}"` : p))
        .join('.');
    }
    return `"${trimmed}"`;
  }

  condition(column: string, cond: string, value: any) {
    const col = this.quoteIdentifier(column);
    const normalizedCond = this.normalizeCondition(cond);
    if (value !== undefined && value !== null && value !== '') {
      this.values.push(value);
      this.conditions.push(
        `${col} ${normalizedCond} $${this.values.length}`,
      );
      return this;
    }
    if (normalizedCond === 'IS NULL' || normalizedCond === 'IS NOT NULL') {
      this.conditions.push(`${col} ${normalizedCond}`);
    }
    throw new AppDBInvalidDataException(`Empty value for "${column}"`);
  }

  orConditions(conditions: SqlCondition[]) {
    const subConditions: string[] = [];
    conditions.forEach((condition) => {
      const col = this.quoteIdentifier(condition.column);
      if (
        condition.value !== undefined &&
        condition.value !== null &&
        condition.value !== ''
      ) {
        this.values.push(condition.value);
        const normalizedCond = this.normalizeCondition(condition.cond);
        subConditions.push(
          `${col} ${normalizedCond} $${this.values.length}`,
        );
      } else if (
        condition.cond === 'IS NULL' ||
        condition.cond === 'IS NOT NULL'
      ) {
        subConditions.push(`${col} ${condition.cond}`);
      }
    });

    if (subConditions.length > 0) {
      this.conditions.push(`(${subConditions.join(' OR ')})`);
    }
    return this;
  }

  conditionIfNotEmpty(column: string, cond: string, value: any) {
    if (value !== undefined && value !== null && value !== '') {
      this.values.push(value);
      const col = this.quoteIdentifier(column);
      const normalizedCond = this.normalizeCondition(cond);
      this.conditions.push(
        `${col} ${normalizedCond} $${this.values.length}`,
      );
    }

    return this;
  }
  conditionRaw(raw: string, values: any[] = []) {
    this.conditions.push(raw);
    this.values.push(...values);
    return this;
  }
  conditionIfArray(column: string, value: any[]) {
    if (!Array.isArray(value) || value.length === 0) return this;

    const col = this.quoteIdentifier(column);

    // Postgres array параметр ашиглах
    this.values.push(value);
    this.conditions.push(`${col} = ANY($${this.values.length})`);

    return this;
  }

  conditionIfBetween(column: string, start: any, end: any) {
    const col = this.quoteIdentifier(column);

    if (start && end) {
      this.values.push(start, end);
      this.conditions.push(
        `${col} BETWEEN $${this.values.length - 1} AND $${this.values.length}`,
      );
    } else if (start) {
      this.values.push(start);
      this.conditions.push(`${col} >= $${this.values.length}`);
    } else if (end) {
      this.values.push(end);
      this.conditions.push(`${col} <= $${this.values.length}`);
    }

    return this;
  }
  conditionIfTimeBetween(startCol: string, endCol: string, time: string) {
    if (!time) return this;

    this.values.push(time);
    const timeParamIndex = this.values.length;

    const quoteStart = startCol.includes('"') ? '' : '"';
    const quoteEnd = endCol.includes('"') ? '' : '"';

    this.conditions.push(
      `(
      (${quoteStart}${startCol}${quoteStart} <= ${quoteEnd}${endCol}${quoteEnd}
        AND $${timeParamIndex}::time BETWEEN ${quoteStart}${startCol}${quoteStart} AND ${quoteEnd}${endCol}${quoteEnd})
      OR
      (${quoteStart}${startCol}${quoteStart} > ${quoteEnd}${endCol}${quoteEnd}
        AND ($${timeParamIndex}::time >= ${quoteStart}${startCol}${quoteStart}
          OR $${timeParamIndex}::time <= ${quoteEnd}${endCol}${quoteEnd}))
    )`,
    );

    return this;
  }

  private toPgDate(v: string | Date) {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    throw new Error('Invalid date value');
  }
  conditionIfDateBetweenValues(
    startDate?: string | Date,
    endDate?: string | Date,
    column?: string,
  ) {
    if (!column || (!startDate && !endDate)) return this;
    const col = this.quoteIdentifier(column);

    if (startDate && endDate) {
      this.values.push(this.toPgDate(startDate), this.toPgDate(endDate));
      const a = this.values.length - 1,
        b = this.values.length;
      this.conditions.push(`${col} BETWEEN $${a}::date AND $${b}::date`);
    } else if (startDate) {
      this.values.push(this.toPgDate(startDate));
      this.conditions.push(`${col} >= $${this.values.length}::date`);
    } else {
      this.values.push(this.toPgDate(endDate!));
      this.conditions.push(`${col} <= $${this.values.length}::date`);
    }
    return this;
  }
  conditionIsNull(column: string) {
    this.conditions.push(`${this.quoteIdentifier(column)} IS NULL`);
    return this;
  }

  conditionIsNotNull(column: string) {
    this.conditions.push(`${this.quoteIdentifier(column)} IS NOT NULL`);
    return this;
  }

  create() {
    const cols: string[] = [];
    const indexes: string[] = [];

    this.columns.forEach((column) => {
      if (this.object.hasOwnProperty(column)) {
        cols.push(`"${column}"`);
        this.values.push(this.object[column]);
        indexes.push(`$${cols.length}`);
      }
    });

    return { cols: cols.join(', '), indexes: indexes.join(', ') };
  }

  update() {
    const cols: string[] = [];

    this.columns.forEach((column) => {
      if (this.object.hasOwnProperty(column)) {
        this.values.push(this.object[column]);
        cols.push(`"${column}"=$${this.values.length}`);
      }
    });

    return { sets: cols.join(', ') };
  }

  criteria() {
    let criteria = this.conditions.join(' AND ');
    if (this.conditions.length > 0) {
      criteria = `WHERE ${criteria}`;
    }
    return criteria;
  }
}
