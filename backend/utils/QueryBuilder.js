// QueryBuilder.js (Postgres Only – Full Featured, 3-param WHERE)

class QueryBuilder {
  constructor(table) {
    this.table = table;

    this._select = ['*'];
    this._joins = [];

    this._where = [];
    this._having = [];
    this._groupBy = [];
    this._orderBy = [];

    this._limit = '';
    this._offset = '';

    this._params = [];
    this._isCount = false;
  }

  /* =======================
     INTERNAL HELPERS
  ======================= */

  _resolveSubQuery(value) {
    // Callback-based subquery
    if (typeof value === 'function') {
      const sub = new QueryBuilder(this.table);
      sub._params = this._params;
      value(sub);
      this._params = sub._params;
      return `(${sub.build().sql})`;
    }

    // QueryBuilder instance
    if (value instanceof QueryBuilder) {
      this._params = value._params;
      return `(${value.build().sql})`;
    }

    return null;
  }

  _pushCondition(target, type, column, operator, value) {
    const sub = this._resolveSubQuery(value);
    if (sub) {
      target.push(`${type} ${column} ${operator} ${sub}`);
      return this;
    }

    this._params.push(value);
    target.push(
      `${type} ${column} ${operator} $${this._params.length}`
    );
    return this;
  }

  _buildClause(list) {
    if (!list.length) return '';
    return list.join(' ').replace(/^(AND|OR)\s/, '');
  }

  /* =======================
     SELECT / COUNT
  ======================= */

  select(cols) {
    this._select = Array.isArray(cols) ? cols : [cols];
    return this;
  }
  distinctOn(columns) {
    this._distinctOn = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  count(column = '*', alias = 'count') {
    this._select = [`COUNT(${column}) AS ${alias}`];
    this._isCount = true;
    return this;
  }

  /* =======================
     JOIN
  ======================= */

  joinTable(type, table, condition) {
    this._joins.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }

  /* =======================
     WHERE (AND)
  ======================= */

  where(column, operator, value) {
    return this._pushCondition(
      this._where,
      'AND',
      column,
      operator,
      value
    );
  }

  whereGreater(column, value) {
    return this.where(column, '>', value);
  }

  whereLess(column, value) {
    return this.where(column, '<', value);
  }

  whereGreaterOrEqual(column, value) {
    return this.where(column, '>=', value);
  }

  whereLessOrEqual(column, value) {
    return this.where(column, '<=', value);
  }

  whereLike(column, value) {
    return this.where(column, 'ILIKE', `%${value}%`);
  }

  whereBetween(column, from, to) {
    this._params.push(from, to);
    const p1 = `$${this._params.length - 1}`;
    const p2 = `$${this._params.length}`;
    this._where.push(`AND ${column} BETWEEN ${p1} AND ${p2}`);
    return this;
  }

  whereIn(column, values) {
    const sub = this._resolveSubQuery(values);
    if (sub) {
      this._where.push(`AND ${column} IN ${sub}`);
      return this;
    }

    const placeholders = values.map(v => {
      this._params.push(v);
      return `$${this._params.length}`;
    });

    this._where.push(
      `AND ${column} IN (${placeholders.join(', ')})`
    );
    return this;
  }

  whereNotIn(column, values) {
    const sub = this._resolveSubQuery(values);
    if (sub) {
      this._where.push(`AND ${column} NOT IN ${sub}`);
      return this;
    }

    const placeholders = values.map(v => {
      this._params.push(v);
      return `$${this._params.length}`;
    });

    this._where.push(
      `AND ${column} NOT IN (${placeholders.join(', ')})`
    );
    return this;
  }

  /* =======================
     WHERE (OR)
  ======================= */

  orWhere(column, operator, value) {
    return this._pushCondition(
      this._where,
      'OR',
      column,
      operator,
      value
    );
  }

  orWhereLike(column, value) {
    return this.orWhere(column, 'ILIKE', `%${value}%`);
  }

  /* =======================
     WHERE GROUP
  ======================= */

  whereGroup(callback) {
    const group = new QueryBuilder(this.table);
    group._params = this._params;

    callback(group);

    this._params = group._params;
    const clause = group._buildClause(group._where);
    if (clause) this._where.push(`AND (${clause})`);
    return this;
  }

  orWhereGroup(callback) {
    const group = new QueryBuilder(this.table);
    group._params = this._params;

    callback(group);

    this._params = group._params;
    const clause = group._buildClause(group._where);
    if (clause) this._where.push(`OR (${clause})`);
    return this;
  }



  /* =======================
     GROUP BY
  ======================= */

  groupBy(columns) {
    this._groupBy = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  /* =======================
     HAVING
  ======================= */

  having(column, operator, value) {
    return this._pushCondition(this._having, 'AND', column, operator, value);
  }

  orHaving(column, operator, value) {
    return this._pushCondition(this._having, 'OR', column, operator, value);
  }

  havingGroup(callback) {
    const group = new QueryBuilder(this.table);
    group._params = this._params;

    callback(group);

    this._params = group._params;
    const clause = group._buildClause(group._having);

    if (clause) {
      this._having.push(`AND (${clause})`);
    }

    return this;
  }

  orHavingGroup(callback) {
    const group = new QueryBuilder(this.table);
    group._params = this._params;

    callback(group);

    this._params = group._params;
    const clause = group._buildClause(group._having);

    if (clause) {
      this._having.push(`OR (${clause})`);
    }

    return this;
  }

  /* =======================
     ORDER / LIMIT / OFFSET
  ======================= */
orderBy(column, direction = 'ASC') {
  this._orderBy.push(`${column} ${direction}`);
  return this;
}

  limit(limit) {
    this._limit = `LIMIT ${limit}`;
    return this;
  }

  offset(offset) {
    this._offset = `OFFSET ${offset}`;
    return this;
  }

  paginate(page = 1, pageSize = 10) {
    this.limit(pageSize);
    this.offset((page - 1) * pageSize);
    return this;
  }

  /* =======================
     BUILD
  ======================= */

  build() {
    let distinct = '';
    if (this._distinctOn && this._distinctOn.length) {
      distinct = `DISTINCT ON (${this._distinctOn.join(', ')}) `;
    }

    let sql = `SELECT ${distinct}${this._select.join(', ')} FROM ${this.table}`;

    if (this._joins.length) sql += ' ' + this._joins.join(' ');

    const whereClause = this._buildClause(this._where);
    if (whereClause) sql += ` WHERE ${whereClause}`;

    if (this._groupBy.length)
      sql += ` GROUP BY ${this._groupBy.join(', ')}`;

    const havingClause = this._buildClause(this._having);
    if (havingClause) sql += ` HAVING ${havingClause}`;

    if (!this._isCount && this._orderBy.length) {
      sql += ` ORDER BY ${this._orderBy.join(', ')}`;
    }

    if (!this._isCount && this._limit) sql += ` ${this._limit}`;
    if (!this._isCount && this._offset) sql += ` ${this._offset}`;

    return { sql, params: this._params };
  }

  /* =======================
     COUNT + PAGINATION
  ======================= */

  countAllWithPagination() {
    const dataQuery = this.build();

    // Clone without pagination
    const tempQB = new QueryBuilder(this.table);

    tempQB._select = ['1'];
    tempQB._joins = this._joins;
    tempQB._where = this._where;
    tempQB._groupBy = this._groupBy;
    tempQB._having = this._having;
    tempQB._params = this._params;

    const base = tempQB.build();

    const countQuery = {
      sql: `SELECT COUNT(*) AS total FROM (${base.sql}) x`,
      params: base.params
    };

    return {
      dataQuery,
      countQuery
    };
  }

  /* =======================
     DEBUG
  ======================= */

  toJSON() {
    const { sql, params } = this.build();
    let debugSQL = sql;

    params.forEach((p, i) => {
      const safe = typeof p === 'string' ? `'${p}'` : p;
      debugSQL = debugSQL.replace(`$${i + 1}`, safe);
    });

    return { sql, params, debug: debugSQL };
  }
}

module.exports = QueryBuilder;
