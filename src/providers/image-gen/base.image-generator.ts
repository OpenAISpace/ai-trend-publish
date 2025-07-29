import { ImageGenerator } from "@src/providers/interfaces/image-gen.interface.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";

/**
 * 图片生成器基础抽象�? */
export abstract class BaseImageGenerator implements ImageGenerator {
  protected configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * 初始化生成器
   */
  async initialize(): Promise<void> {
    await this.refresh();
  }

  /**
   * 刷新配置
   */
  abstract refresh(): Promise<void>;

  /**
   * 生成图片
   * @param options 生成选项
   */
  abstract generate(options: any): Promise<Buffer | string>;

  /**
   * 将生成的图片保存到文�?   * @param options 生成选项
   * @param outputPath 输出路径
   */
  async saveToFile(options: any, outputPath: string): Promise<void> {
    const result = await this.generate(options);

    if (Buffer.isBuffer(result)) {
      await fs.writeFile(outputPath, result);
    } else if (typeof result === "string") {
      // 如果是URL，需要下载图�?      throw new Error("保存URL类型的图片尚未实�?);
    } else if (Array.isArray(result)) {
      throw new Error("保存多个图片URL尚未实现");
    }
  }
}
