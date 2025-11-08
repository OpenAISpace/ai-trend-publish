import db from "@src/db/db.ts";
import { prompts as promptsTable } from "@src/db/schema.ts";
import { eq } from "drizzle-orm";
import {
  PROMPT_PRESETS,
  PROMPT_PRESET_MAP,
  type PromptPreset,
} from "@src/constants/prompt-presets.ts";

export interface PromptDetail {
  id: string;
  title: string;
  description?: string;
  size: number;
  updatedAt: string;
  content: string;
}

export class PromptService {
  private static instance: PromptService;

  private constructor() {}

  static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  private buildPromptDetail(
    row: typeof promptsTable.$inferSelect,
    preset?: PromptPreset
  ): PromptDetail {
    const meta = preset ?? PROMPT_PRESET_MAP.get(row.promptId);
    const content = row.content ?? meta?.defaultContent ?? "";
    return {
      id: row.promptId,
      title: row.title ?? meta?.title ?? row.promptId,
      description: meta?.description,
      content,
      size: content.length,
      updatedAt: row.updatedAt ?? new Date().toISOString(),
    };
  }

  private async fetchPromptRow(id: string) {
    const rows = await db
      .select()
      .from(promptsTable)
      .where(eq(promptsTable.promptId, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async seedDefaults(): Promise<void> {
    for (const preset of PROMPT_PRESETS) {
      const existing = await this.fetchPromptRow(preset.id);
      if (existing) continue;
      await db.insert(promptsTable).values({
        promptId: preset.id,
        title: preset.title,
        content: preset.defaultContent,
      });
    }
  }

  async listPrompts(): Promise<PromptDetail[]> {
    await this.seedDefaults();
    const rows = await db.select().from(promptsTable);
    const map = new Map(rows.map((row) => [row.promptId, row]));
    return PROMPT_PRESETS.map((preset) => {
      const row = map.get(preset.id);
      if (row) {
        return this.buildPromptDetail(row, preset);
      }
      return {
        id: preset.id,
        title: preset.title,
        description: preset.description,
        content: preset.defaultContent,
        size: preset.defaultContent.length,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async getPrompt(id: string): Promise<PromptDetail> {
    const preset = PROMPT_PRESET_MAP.get(id);
    if (!preset) {
      throw new Error(`Prompt ${id} not registered`);
    }
    const row = await this.fetchPromptRow(id);
    if (row) {
      return this.buildPromptDetail(row, preset);
    }
    return {
      id: preset.id,
      title: preset.title,
      description: preset.description,
      content: preset.defaultContent,
      size: preset.defaultContent.length,
      updatedAt: new Date().toISOString(),
    };
  }

  async getPromptContent(id: string): Promise<string> {
    const prompt = await this.getPrompt(id);
    return prompt.content;
  }

  async updatePrompt(id: string, content: string): Promise<PromptDetail> {
    const preset = PROMPT_PRESET_MAP.get(id);
    if (!preset) {
      throw new Error(`Prompt ${id} not registered`);
    }

    await db
      .insert(promptsTable)
      .values({
        promptId: id,
        title: preset.title,
        content,
      })
      .onDuplicateKeyUpdate({
        set: {
          content,
          title: preset.title,
        },
      });

    const row = await this.fetchPromptRow(id);
    if (!row) {
      throw new Error(`Prompt ${id} not found`);
    }
    return this.buildPromptDetail(row, preset);
  }
}
