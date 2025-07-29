import db from "@src/db/db.ts";
import { IConfigSource } from "../interfaces/config-source.interface.ts";
import { config } from "@src/db/schema.ts";
import { eq } from "drizzle-orm";
import { Logger } from "@src/utils/logger-adapter.ts";

const logger = new Logger("DbConfigSource");

export class DbConfigSource implements IConfigSource {
  constructor(
    public priority: number = 10,
  ) {
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await db.select().from(config).where(
        eq(config.key, key),
      ).limit(1);

      if (!result || result.length === 0) {
        return null;
      }

      const value = result[0].value;
      if (!value) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      logger.error("Error fetching config from database", error);
      return null;
    }
  }
}
