import { BaseImageGenerator } from "@src/providers/image-gen/base.image-generator.ts";

export interface TextLogoOptions {
  text: string;
  width?: number;
  height?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

export class TextLogoGenerator extends BaseImageGenerator {
  private static readonly DEFAULT_OPTIONS: Partial<TextLogoOptions> = {
    width: 1200,
    height: 400,
    fontSize: 160,
    backgroundColor: "#FFFFFF",
    textColor: "#1a73e8",
    gradientStart: "#1a73e8",
    gradientEnd: "#4285f4",
  };

  async refresh(): Promise<void> {
    // 文本Logo生成器不需要配置
  }

  async generate(options: TextLogoOptions): Promise<string> {
    const finalOptions = { ...TextLogoGenerator.DEFAULT_OPTIONS, ...options };
    const {
      width,
      height,
      text,
      fontSize,
      backgroundColor,
      gradientStart,
      gradientEnd,
    } = finalOptions;

    // 创建SVG文本
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${gradientStart};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${gradientEnd};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text
          x="50%"
          y="50%"
          font-family="Arial, 'Microsoft YaHei', sans-serif"
          font-size="${fontSize}px"
          font-weight="bold"
          fill="url(#grad1)"
          text-anchor="middle"
          dominant-baseline="middle"
          filter="url(#shadow)"
          style="letter-spacing: 2px;"
        >
          ${text}
        </text>
      </svg>`;
  }

  public static async saveToFile(
    options: TextLogoOptions,
    outputPath: string,
  ): Promise<void> {
    const generator = new TextLogoGenerator();
    const svg = await generator.generate(options);
    await Bun.write(outputPath, svg);
  }
}
