export class Repository {
  constructor(public db: D1Database) {}
  one<T>(sql: string, ...args: unknown[]) {
    return this.db
      .prepare(sql)
      .bind(...args)
      .first<T>();
  }
  all<T>(sql: string, ...args: unknown[]) {
    return this.db
      .prepare(sql)
      .bind(...args)
      .all<T>()
      .then((r) => r.results);
  }
  run(sql: string, ...args: unknown[]) {
    return this.db
      .prepare(sql)
      .bind(...args)
      .run();
  }
  statement(sql: string, ...args: unknown[]) {
    return this.db.prepare(sql).bind(...args);
  }
  batch(statements: D1PreparedStatement[]) {
    return this.db.batch(statements);
  }
}
