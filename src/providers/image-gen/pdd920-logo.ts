import { BaseImageGenerator } from "@src/providers/image-gen/base.image-generator.ts";
import { Buffer } from "node:buffer";

export interface PDD920LogoOptions {
  text: string;
  t: string;
  type?: "json";
}

interface PDD920Response {
  url: string;
}

export class PDD920LogoGenerator extends BaseImageGenerator {
  private static readonly BASE_URL = "https://api.920pdd.com/API/ceshi/wx/";

  // PDD920 Logo生成器不需要刷新配置，空实现
  async refresh(): Promise<void> {
    // 无需实现
  }

  /**
   * 生成图片
   * @param options 配置选项
   * @returns 如果type为json，返回图片URL；否则返回图片buffer
   */
  async generate(options: PDD920LogoOptions): Promise<string | Buffer> {
    try {
      const params = new URLSearchParams();
      params.append("text", options.text);
      params.append("t", options.t);
      if (options.type) {
        params.append("type", options.type);
      }
      const url = `${PDD920LogoGenerator.BASE_URL}?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`图片生成失败: HTTP ${response.status}`);
      }

      if (options.type === "json") {
        const data = (await response.json()) as PDD920Response;
        return data.url;
      } else {
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
      }
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(`图片生成失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 将图片保存到文件
   * @param options 配置选项
   * @param outputPath 输出文件路径
   */
  public static async saveToFile(
    options: PDD920LogoOptions,
    outputPath: string,
  ): Promise<void> {
    const generator = new PDD920LogoGenerator();
    // type设为undefined，确保返回Buffer
    const result = await generator.generate({ ...options, type: undefined });
    if (Buffer.isBuffer(result)) {
      const fs = await import("fs/promises");
      await fs.writeFile(outputPath, result);
    } else {
      throw new Error("无法保存图片：生成结果不是Buffer类型");
    }
  }
}
