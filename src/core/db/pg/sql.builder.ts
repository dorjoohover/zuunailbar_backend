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

  condition(column: string, cond: string, value: any) {
    const quote = column.indexOf(`"`) === -1 ? `"` : '';
    if (value !== undefined && value !== null && value !== '') {
      this.values.push(value);
      this.conditions.push(
        `${quote}${column}${quote} ${cond} $${this.values.length}`,
      );
      return this;
    }
    if (cond === 'IS NULL' || cond === 'IS NOT NULL') {
      this.conditions.push(`${quote}${column}${quote} ${cond}`);
    }
    throw new AppDBInvalidDataException(`Empty value for "${column}"`);
  }

  orConditions(conditions: SqlCondition[]) {
    const subConditions: string[] = [];
    conditions.forEach((condition) => {
      const quote = condition.column.indexOf(`"`) === -1 ? `"` : '';
      if (
        condition.value !== undefined &&
        condition.value !== null &&
        condition.value !== ''
      ) {
        this.values.push(condition.value);
        const quote = condition.column.indexOf(`"`) === -1 ? `"` : '';
        subConditions.push(
          `${quote}${condition.column}${quote} ${condition.cond} $${this.values.length}`,
        );
      } else if (
        condition.cond === 'IS NULL' ||
        condition.cond === 'IS NOT NULL'
      ) {
        subConditions.push(
          `${quote}${condition.column}${quote} ${condition.cond}`,
        );
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
      const quote = column.indexOf(`"`) === -1 ? `"` : '';
      this.conditions.push(
        `${quote}${column}${quote} ${cond} $${this.values.length}`,
      );
    }

    return this;
  }

  conditionIfBetween(column: string, start: any, end: any) {
    const quote = column.indexOf(`"`) === -1 ? `"` : '';

    if (start && end) {
      this.values.push(start, end);
      this.conditions.push(
        `${quote}${column}${quote} BETWEEN $${this.values.length - 1} AND $${this.values.length}`,
      );
    } else if (start) {
      this.values.push(start);
      this.conditions.push(
        `${quote}${column}${quote} >= $${this.values.length}`,
      );
    } else if (end) {
      this.values.push(end);
      this.conditions.push(
        `${quote}${column}${quote} <= $${this.values.length}`,
      );
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

  conditionIsNull(column: string) {
    const quote = column.indexOf(`"`) === -1 ? `"` : '';
    this.conditions.push(`${quote}${column}${quote} IS NULL`);
    return this;
  }

  conditionIsNotNull(column: string) {
    const quote = column.indexOf(`"`) === -1 ? `"` : '';
    this.conditions.push(`${quote}${column}${quote} IS NOT NULL`);
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
