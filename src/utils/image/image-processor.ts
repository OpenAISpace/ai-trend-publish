// src/utils/image/image-processor.ts
import sharp from "sharp";

interface ImageValidationResult {
  isValid: boolean;
  contentType?: string;
  error?: string;
}

interface ImageProcessResult {
  originalUrl: string;
  newUrl?: string;
  error?: string;
}

export class WeixinImageProcessor {
  private static readonly MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
  private static readonly VALID_IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
  ];

  private weixinPublisher: any;

  constructor(weixinPublisher: any) {
    this.weixinPublisher = weixinPublisher;
  }

  /**
   * 压缩图片
   * @param imageBuffer 原始图片buffer
   * @param maxSizeInMB 最大大小（MB）
   * @returns 压缩后的Buffer
   */
  private async compressImage(
    imageBuffer: ArrayBuffer,
    maxSizeInMB: number = 1,
  ): Promise<Uint8Array> {
    try {
      // 使用 sharp 解码图片
      const inputBuffer = Buffer.from(imageBuffer);
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();
      const originalSize = inputBuffer.byteLength / (1024 * 1024); // MB

      // 根据原始大小决定压缩策略
      let quality: number;
      let scale = 1;

      if (originalSize > 5) {
        quality = 30;
        scale = 0.5;
      } else if (originalSize > 3) {
        quality = 40;
        scale = 0.6;
      } else if (originalSize > 2) {
        quality = 50;
        scale = 0.7;
      } else {
        quality = 60;
        scale = 0.8;
      }

      // 调整尺寸
      let resized = image;
      if (metadata.width && metadata.height) {
        const newWidth = Math.round(metadata.width * scale);
        const newHeight = Math.round(metadata.height * scale);
        resized = image.resize(newWidth, newHeight);
      }

      // 选择输出格式
      let format = metadata.format;
      if (!format || !["jpeg", "png", "webp"].includes(format)) {
        format = "jpeg";
      }

      let output: Buffer;
      if (format === "jpeg") {
        output = await resized.jpeg({ quality }).toBuffer();
      } else if (format === "png") {
        output = await resized.png({ quality }).toBuffer();
      } else if (format === "webp") {
        output = await resized.webp({ quality }).toBuffer();
      } else {
        output = await resized.jpeg({ quality }).toBuffer();
      }

      // 如果还是太大，再次尝试更激进的压缩
      if (output.length > maxSizeInMB * 1024 * 1024) {
        if (metadata.width && metadata.height) {
          const newWidth = Math.round((metadata.width * scale) * 0.7);
          const newHeight = Math.round((metadata.height * scale) * 0.7);
          resized = image.resize(newWidth, newHeight);
        }
        const lowerQuality = Math.max(quality - 20, 20);
        if (format === "jpeg") {
          output = await resized.jpeg({ quality: lowerQuality }).toBuffer();
        } else if (format === "png") {
          output = await resized.png({ quality: lowerQuality }).toBuffer();
        } else if (format === "webp") {
          output = await resized.webp({ quality: lowerQuality }).toBuffer();
        } else {
          output = await resized.jpeg({ quality: lowerQuality }).toBuffer();
        }
      }

      return new Uint8Array(output);
    } catch (error) {
      console.error("Image compression failed:", error);
      throw error;
    }
  }

  /**
   * 处理文章内容中的所有图片
   */
  async processContent(content: string): Promise<{
    content: string;
    results: ImageProcessResult[];
  }> {
    const imageUrls = this.extractImageUrls(content);
    const results: ImageProcessResult[] = [];
    let processedContent = content;

    for (const imageUrl of imageUrls) {
      try {
        const validationResult = await this.validateImage(imageUrl);
        if (!validationResult.isValid) {
          results.push({
            originalUrl: imageUrl,
            error: validationResult.error,
          });
          continue;
        }

        // 下载图片
        const response = await fetch(imageUrl);
        const imageBuffer = await response.arrayBuffer();

        let processedImage: Uint8Array | undefined;
        if (imageBuffer.byteLength > WeixinImageProcessor.MAX_IMAGE_SIZE) {
          console.log(
            `图片大小超过1MB (${
              (imageBuffer.byteLength / 1024 / 1024).toFixed(2)
            }MB)，进行压缩...`,
          );
          processedImage = await this.compressImage(imageBuffer);
          console.log(
            `压缩后大小: ${(processedImage.length / 1024 / 1024).toFixed(2)}MB`,
          );
        }

        // 上传图片到微信   
        const newUrl = await this.weixinPublisher.uploadContentImage(
          imageUrl,
          processedImage ? processedImage : new Uint8Array(imageBuffer),
        );

        results.push({
          originalUrl: imageUrl,
          newUrl,
        });

        // 替换文章中的图片URL
        processedContent = this.replaceImageUrl(
          processedContent,
          imageUrl,
          newUrl,
        );
      } catch (error) {
        console.error(`处理图片失败: ${imageUrl}`, error);
        results.push({
          originalUrl: imageUrl,
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    }

    return {
      content: processedContent,
      results,
    };
  }

  /**
   * 从文章内容中提取所有图片URL
   */
  private extractImageUrls(content: string): string[] {
    const urls = new Set<string>();
    const patterns = {
      markdown: /!\[[^\]]*\]\(([^)]+)\)/g,
      html: /<img[^>]+src=["']([^"']+)["'][^>]*>/g,
      plainUrl:
        /(https?:\/\/[^\s<>"]+?\/[^\s<>"]+?\.(jpg|jpeg|png|gif|webp))/gi,
    };

    // 提取各种格式的图片URL
    for (const [_, pattern] of Object.entries(patterns)) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        urls.add(match[1]);
      }
    }

    return Array.from(urls);
  }

  /**
   * 验证图片URL是否有效
   */
  private async validateImage(url: string): Promise<ImageValidationResult> {
    try {
      const urlObj = new URL(url);
      const extension = urlObj.pathname.toLowerCase().split(".").pop();

      if (
        !extension ||
        !WeixinImageProcessor.VALID_IMAGE_EXTENSIONS.includes(`.${extension}`)
      ) {
        return {
          isValid: false,
          error: "不支持的图片格式",
        };
      }

      const response = await fetch(url, { method: "HEAD" });
      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.startsWith("image/")) {
        return {
          isValid: false,
          error: "无效的Content-Type: " + contentType,
        };
      }

      return {
        isValid: true,
        contentType,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "验证图片URL时发生错误",
      };
    }
  }

  /**
   * 替换文章中的图片URL
   */
  private replaceImageUrl(
    content: string,
    oldUrl: string,
    newUrl: string,
  ): string {
    const escapedOldUrl = this.escapeRegExp(oldUrl);
    return content
      .replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${escapedOldUrl}\\)`, "g"),
        `![$1](${newUrl})`,
      )
      .replace(
        new RegExp(`<img([^>]*)src=["']${escapedOldUrl}["']([^>]*)>`, "g"),
        `<img$1src="${newUrl}"$2>`,
      )
      .replace(new RegExp(escapedOldUrl, "g"), newUrl);
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
