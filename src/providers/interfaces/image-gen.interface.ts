/**
 * 图片生成器接�? */
import { Buffer } from "node:buffer";
export interface ImageGenerator {
  /**
   * 初始化生成器
   */
  initialize(): Promise<void>;

  /**
   * 刷新配置
   */
  refresh(): Promise<void>;

  /**
   * 生成图片
   * @param options 生成选项
   * @returns 生成结果（可能是Buffer或URL�?   */
  generate(options: any): Promise<Buffer | string>;

  /**
   * 将生成的图片保存到文�?   * @param options 生成选项
   * @param outputPath 输出路径
   */
  saveToFile(options: any, outputPath: string): Promise<void>;
}

/**
 * 图片生成器类�? */
export enum ImageGeneratorType {
  TEXT_LOGO = "TEXT_LOGO",
  PDD920_LOGO = "PDD920_LOGO",
  ALIWANX21 = "ALIWANX21",
  ALIWANX_POSTER = "ALIWANX_POSTER",
}

/**
 * 图片生成器类型映�? */
export interface ImageGeneratorTypeMap {
  [ImageGeneratorType.TEXT_LOGO]:
    import("@src/providers/image-gen/text-logo.ts").TextLogoGenerator;
  [ImageGeneratorType.PDD920_LOGO]:
    import("@src/providers/image-gen/pdd920-logo.ts").PDD920LogoGenerator;
  [ImageGeneratorType.ALIWANX21]:
    import("@src/providers/image-gen/aliyun/aliwanx2.1.image.ts").AliWanX21ImageGenerator;
  [ImageGeneratorType.ALIWANX_POSTER]:
    import("@src/providers/image-gen/aliyun/aliwanx-poster.image-generator.ts").AliyunWanxPosterGenerator;
}
