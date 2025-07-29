import axios from "axios";
import {
  AliTaskResponse,
  AliTaskStatusResponse,
  BaseAliyunImageGenerator,
} from "@src/providers/image-gen/aliyun/base.aliyun.image-generator.ts";

/**
 * 阿里云海报生成模型参数接口 */
interface WanxPosterGenOptions {
  title: string; // 必选，主标题，最多30个字
  sub_title?: string; // 可选，副标题，最多30个字
  body_text?: string; // 可选，正文，最多50个字
  prompt_text_zh?: string; // 可选，中文提示词
  prompt_text_en?: string; // 可选，英文提示词
  generate_mode: "generate" | "sr" | "hrf"; // 必选，生成模式
  generate_num?: 1 | 2 | 3 | 4; // 可选，生成数量，仅generate 模式下有效
  auxiliary_parameters?: string; // 可选，sr或hrf模式下的辅助参数
  wh_ratios?: "横版" | "竖版"; // 可选，默认横版
  lora_name?:
    | "2D插画1"
    | "2D插画2"
    | "浩瀚星空"
    | "浓郁色彩"
    | "光线粒子"
    | "透明玻璃"
    | "剪纸工艺"
    | "折纸工艺"
    | "中国水墨"
    | "中国刺绣"
    | "真实场景"
    | "2D卡纸"
    | "儿童水彩"
    | "赛博背景"
    | "浅蓝抽象"
    | "深蓝抽象"
    | "抽象点线"
    | "童话油画"; // 可选，预设背景风格
  lora_weight?: number; // 可选，lora权重，范围-1-1，默认为0.8
  ctrl_ratio?: number; // 可选，留白效果权重，范围-1-1，默认为0.7
  ctrl_step?: number; // 可选，留白步数比例，范围-1-1，默认为0.7
  creative_title_layout?: boolean; // 可选，是否启用创意排版，默认false
}

/**
 * 阿里云海报生成器实现 */
export class AliyunWanxPosterGenerator extends BaseAliyunImageGenerator {
  constructor() {
    super();
    this.baseUrl =
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
    this.model = "wanx-poster-generation-v1";
  }

  async generate(options: WanxPosterGenOptions): Promise<string> {
    // 参数验证
    this.validateOptions(options);

    try {
      // 提交任务
      const taskResponse = await this.submitTask<AliTaskResponse>({
        input: {
          title: options.title,
          sub_title: options.sub_title,
          body_text: options.body_text,
          prompt_text_zh: options.prompt_text_zh,
          prompt_text_en: options.prompt_text_en,
          generate_mode: options.generate_mode,
          generate_num: options.generate_mode === "generate"
            ? (options.generate_num || 1)
            : undefined,
          auxiliary_parameters: options.auxiliary_parameters,
          lora_name: options.lora_name,
          wh_ratios: options.wh_ratios || "横版",
          lora_weight: this.clampValue(options.lora_weight, 0, 1, 0.8),
          ctrl_ratio: this.clampValue(options.ctrl_ratio, 0, 1, 0.7),
          ctrl_step: this.clampValue(options.ctrl_step, 0, 1, 0.7),
          creative_title_layout: options.creative_title_layout,
        },
        parameters: {},
      });

      // 等待任务完成
      return await this.waitForCompletion(taskResponse.output.task_id);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `阿里云API调用失败: ${
            error.response?.data?.message || error.message
          }`,
        );
      }
      throw error;
    }
  }

  getResult(output: AliTaskStatusResponse["output"]): string {
    if (output.render_urls && output.render_urls.length > 0) {
      return output.render_urls[0];
    }
    throw new Error("任务成功但未获取到图片URL");
  }

  private validateOptions(options: WanxPosterGenOptions): void {
    if (!options.title) {
      throw new Error("标题是必需的");
    }

    // 裁剪标题
    if (options.title.length > 30) {
      console.warn(`标题超过30个字符，已自动裁剪。原标题: ${options.title}`);
      options.title = options.title.slice(0, 30);
    }

    // 裁剪副标题
    if (options.sub_title && options.sub_title.length > 30) {
      console.warn(
        `副标题超过30个字符，已自动裁剪。原副标题: ${options.sub_title}`,
      );
      options.sub_title = options.sub_title.slice(0, 30);
    }

    // 裁剪正文
    if (options.body_text && options.body_text.length > 50) {
      console.warn(`正文超过50个字符，已自动裁剪。原正文: ${options.body_text}`);
      options.body_text = options.body_text.slice(0, 50);
    }

    // 处理提示词
    if (!options.prompt_text_zh && !options.prompt_text_en) {
      throw new Error("中文或英文提示词至少需要提供一个");
    }

    const promptLength = (options.prompt_text_zh?.length || 0) +
      (options.prompt_text_en?.length || 0);
    if (promptLength > 50) {
      console.warn("中英文提示词总长度超�?0个字符，将按比例裁剪");
      if (options.prompt_text_zh && options.prompt_text_en) {
        const ratio = 50 / promptLength;
        const zhLen = Math.floor(options.prompt_text_zh.length * ratio);
        const enLen = Math.floor(options.prompt_text_en.length * ratio);
        options.prompt_text_zh = options.prompt_text_zh.slice(0, zhLen);
        options.prompt_text_en = options.prompt_text_en.slice(0, enLen);
      } else if (options.prompt_text_zh) {
        options.prompt_text_zh = options.prompt_text_zh.slice(0, 50);
      } else if (options.prompt_text_en) {
        options.prompt_text_en = options.prompt_text_en.slice(0, 50);
      }
    }

    // 处理生成模式
    if (!["generate", "sr", "hrf"].includes(options.generate_mode)) {
      console.warn(
        `生成模式 "${options.generate_mode}" 无效，将使用默认�?"generate"`,
      );
      options.generate_mode = "generate";
    }

    // 处理sr或hrf模式下的辅助参数
    if (options.generate_mode !== "generate" && !options.auxiliary_parameters) {
      console.warn(
        `${options.generate_mode}模式下需要auxiliary_parameters，将切换为generate模式`,
      );
      options.generate_mode = "generate";
    }

    // 处理生成数量
    if (options.generate_mode === "generate" && options.generate_num) {
      if (![1, 2, 3, 4].includes(options.generate_num)) {
        console.warn(`生成数量 ${options.generate_num} 无效，将使用默认�?1`);
        options.generate_num = 1;
      }
    }

    // 处理宽高
    if (options.wh_ratios && !["横版", "竖版"].includes(options.wh_ratios)) {
      console.warn(`宽高"${options.wh_ratios}" 无效，将使用默认"横版"`);
      options.wh_ratios = "横版";
    }

    // 处理lora名称
    const validLoraNames = [
      "2D插画1",
      "2D插画2",
      "浩瀚星空",
      "浓郁色彩",
      "光线粒子",
      "透明玻璃",
      "剪纸工艺",
      "折纸工艺",
      "中国水墨",
      "中国刺绣",
      "真实场景",
      "2D卡纸",
      "儿童水彩",
      "赛博背景",
      "浅蓝抽象",
      "深蓝抽象",
      "抽象点线",
      "童话油画",
    ];

    if (options.lora_name && !validLoraNames.includes(options.lora_name)) {
      console.warn(`lora_name "${options.lora_name}" 无效，将移除此参数`);
      delete options.lora_name;
    }

    // 处理数值范围参数
    if (options.lora_weight !== undefined) {
      if (options.lora_weight < 0 || options.lora_weight > 1) {
        console.warn(
          `lora_weight ${options.lora_weight} 超出范围[0-1]，将使用默认0.8`,
        );
        options.lora_weight = 0.8;
      }
    }

    if (options.ctrl_ratio !== undefined) {
      if (options.ctrl_ratio < 0 || options.ctrl_ratio > 1) {
        console.warn(
          `ctrl_ratio ${options.ctrl_ratio} 超出范围[0-1]，将使用默认0.7`,
        );
        options.ctrl_ratio = 0.7;
      }
    }

    if (options.ctrl_step !== undefined) {
      if (options.ctrl_step < 0 || options.ctrl_step > 1) {
        console.warn(
          `ctrl_step ${options.ctrl_step} 超出范围[0-1]，将使用默认0.7`,
        );
        options.ctrl_step = 0.7;
      }
    }
  }
}
