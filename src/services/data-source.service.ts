import db from "@src/db/db.ts";
import { dataSources } from "@src/db/schema.ts";
import { eq } from "drizzle-orm";

export interface DataSourceRecord {
  id: number;
  platform: string | null;
  identifier: string | null;
}

export class DataSourceService {
  private static instance: DataSourceService;

  private constructor() {}

  static getInstance(): DataSourceService {
    if (!DataSourceService.instance) {
      DataSourceService.instance = new DataSourceService();
    }
    return DataSourceService.instance;
  }

  async list(): Promise<DataSourceRecord[]> {
    return await db.select().from(dataSources).orderBy(dataSources.id);
  }

  async create(input: { platform: string; identifier: string }) {
    const result = await db.insert(dataSources).values({
      platform: input.platform,
      identifier: input.identifier,
    });
    const insertId = Number((result as any).insertId);
    const rows = await db.select().from(dataSources).where(
      eq(dataSources.id, insertId),
    );
    return rows[0];
  }

  async update(
    id: number,
    patch: { platform?: string; identifier?: string },
  ): Promise<void> {
    await db.update(dataSources).set(patch).where(eq(dataSources.id, id));
  }

  async remove(id: number): Promise<void> {
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }
}
