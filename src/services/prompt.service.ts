import { promises as fs } from "node:fs";
import path from "node:path";
import db from "@src/db/db.ts";
import { prompts as promptsTable } from "@src/db/schema.ts";
import { eq } from "drizzle-orm";

export interface PromptDetail {
  id: string;
  title: string;
  description?: string;
  size: number;
  updatedAt: string;
  content: string;
}

interface PromptPreset {
  id: string;
  file: string;
  title: string;
  description: string;
}

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "polish",
    file: "summarizer.prompt.ts",
    title: "润色提示词",
    description: "用于对文章段落进行语言润色和风格统一。",
  },
  {
    id: "ranker",
    file: "content-ranker.prompt.ts",
    title: "排序提示词",
    description: "用于根据指标给候选素材打分排序。",
  },
];

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
    row: typeof promptsTable.$inferSelect
  ): PromptDetail {
    const preset = PROMPT_PRESETS.find((p) => p.id === row.promptId);
    const content = row.content ?? "";
    return {
      id: row.promptId,
      title: row.title ?? preset?.title ?? row.promptId,
      description: preset?.description,
      content,
      size: content.length,
      updatedAt: row.updatedAt ?? new Date().toISOString(),
    };
  }

  async listPrompts(): Promise<PromptDetail[]> {
    const rows = await db.select().from(promptsTable);
    const map = new Map(rows.map((row) => [row.promptId, row]));
    return PROMPT_PRESETS.map((preset) => {
      const row = map.get(preset.id);
      if (row) {
        return this.buildPromptDetail(row);
      }
      return {
        id: preset.id,
        title: preset.title,
        description: preset.description,
        content: "",
        size: 0,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async updatePrompt(id: string, content: string): Promise<PromptDetail> {
    const preset = PROMPT_PRESETS.find((p) => p.id === id);
    await db
      .insert(promptsTable)
      .values({
        promptId: id,
        title: preset?.title ?? id,
        content,
      })
      .onDuplicateKeyUpdate({
        set: {
          content,
          title: preset?.title ?? id,
        },
      });

    const row = await db
      .select()
      .from(promptsTable)
      .where(eq(promptsTable.promptId, id))
      .limit(1);
    if (!row[0]) {
      throw new Error(`Prompt ${id} not found`);
    }
    return this.buildPromptDetail(row[0]);
  }
}
