import ejs from "ejs";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { join } from "node:path";
import { Logger } from "@src/utils/logger-adapter.ts";
import { existsSync, statSync, readFileSync } from "fs";
import { cwd, platform } from "process";

const logger = new Logger("base-template-renderer");

/**
 * 基础模板渲染器类（Bun 版本）
 */
export abstract class BaseTemplateRenderer<T extends ejs.Data> {
  protected templates: { [key: string]: string } = {};
  protected configManager: ConfigManager;
  protected availableTemplates: string[] = [];
  protected templatePrefix: string;

  constructor(templatePrefix: string) {
    this.templatePrefix = templatePrefix;
    this.configManager = ConfigManager.getInstance();
    // 初始化时异步加载模板
    this.initializeTemplates();
  }

  /**
   * 初始化并加载模板
   */
  public async initializeTemplates(): Promise<void> {
    try {
      await this.loadTemplates();
    } catch (error) {
      logger.error("模板加载失败:", error);
      throw error;
    }
  }

  /**
   * 获取模板文件内容
   * @param templatePath 模板文件路径
   * @returns 模板内容
   */
  protected async getTemplateContent(templatePath: string): Promise<string> {
    try {
      // 构建相对于当前模块的模板文件路径
      let baseDir = "";
      
      // 尝试使用 import.meta.url 获取当前模块目录
      if (typeof import.meta !== "undefined" && import.meta.url) {
        baseDir = new URL(".", import.meta.url).pathname;
        // Windows 路径处理
        if (platform === "win32" && baseDir.startsWith("/")) {
          baseDir = baseDir.substring(1);
        }
      } else {
        // 回退到相对于工作目录的路径
        baseDir = join(cwd(), "src/modules/render/weixin");
      }
      
      const fullPath = join(baseDir, templatePath);
      logger.info(`尝试加载模板文件: ${fullPath}`);
      
      if (existsSync(fullPath) && statSync(fullPath).isFile()) {
        const fileContent = readFileSync(fullPath, "utf-8");
        logger.info(`成功加载模板文件: ${templatePath}`);
        return fileContent;
      }
      
      throw new Error(`模板文件不存在: ${fullPath}`);
    } catch (error) {
      logger.error(`加载模板文件失败: ${templatePath}`, error);
      throw new Error(`无法加载模板文件: ${templatePath}\n错误: ${error}`);
    }
  }

  /**
   * 加载模板文件
   */
  protected abstract loadTemplates(): Promise<void>;

  /**
   * 从配置中获取模板类型
   * @returns 配置的模板类型或默认
   */
  protected async getTemplateTypeFromConfig(): Promise<string> {
    try {
      const configKey = `${this.templatePrefix.toUpperCase()}_TEMPLATE_TYPE`;
      const configValue = await this.configManager.get<string>(configKey);

      if (configValue === "random") {
        return this.getRandomTemplateType();
      }
      return configValue;
    } catch (error: any) {
      logger.error(`未找到${this.templatePrefix}模板配置，使用默认模板`, error);
      return this.availableTemplates[0];
    }
  }

  /**
   * 随机选择一个模板类型
   * @returns 随机选择的模板类型
   */
  protected getRandomTemplateType(): string {
    const randomIndex = Math.floor(
      Math.random() * this.availableTemplates.length,
    );
    return this.availableTemplates[randomIndex];
  }

  protected abstract doRender(data: T, template: string): Promise<string>;

  /**
   * 渲染模板
   * @param data 渲染数据
   * @param templateType 模板类型，或'config'（从配置获取）或 'random'（随机选择）
   * @returns 渲染后的 HTML
   */
  public async render(
    data: T,
    templateType?: string,
  ): Promise<string> {
    try {
      let finalTemplateType: string;

      // 如果没有传templateType，从配置获取
      if (!templateType) {
        finalTemplateType = await this.getTemplateTypeFromConfig();
      } else if (templateType === "random") {
        // 如果指定random，随机选择模板
        finalTemplateType = this.getRandomTemplateType();
      } else {
        // 检查指定的模板是否存在
        if (!this.availableTemplates.includes(templateType)) {
          throw new Error(
            `Template type '${templateType}' not found for ${this.templatePrefix}`,
          );
        }
        finalTemplateType = templateType;
      }

      logger.info(`使用${this.templatePrefix}模板: ${finalTemplateType}`);

      const template = this.templates[finalTemplateType];
      if (!template) {
        throw new Error(
          `Template '${finalTemplateType}' not found for ${this.templatePrefix}`,
        );
      }

      // 使用 EJS 渲染模板
      return await this.doRender(data, template);
    } catch (error) {
      logger.error("模板渲染失败:", error);
      throw error;
    }
  }
}
