import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      throw new Error(
        'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and set it.',
      );
    }

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error(
        'DATABASE_URL is not a valid URL. Example: postgresql://user:password@localhost:5432/devtrack',
      );
    }

    url.searchParams.delete('schema');
    this.pool = new Pool({ connectionString: url.toString() });
  }

  async query<T extends QueryResultRow = any>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.pool.query<T>(text, params);
    return result.rows;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
