import { ModelPerformance } from "@src/api/livebench.api.ts";
import fs from "fs";
import path from "path";
import { AIBenchTemplateRenderer } from "@src/modules/render/weixin/aibench.renderer.ts";

// 示例数据
const modelData = {
  "o1-2024-12-17-high": {
    metrics: {
      "Reasoning Average": 91.58,
      "Coding Average": 69.69,
      "Mathematics Average": 80.32,
      "Data Analysis Average": 65.47,
      "Language Average": 65.39,
      "IF Average": 81.55,
      "Global Average": 76.32,
    },
    organization: "Unknown",
  },
  "o3-mini-2025-01-31-high": {
    metrics: {
      "Reasoning Average": 89.58,
      "Coding Average": 82.74,
      "Mathematics Average": 77.29,
      "Data Analysis Average": 70.64,
      "Language Average": 50.68,
      "IF Average": 84.36,
      "Global Average": 75.97,
    },
    organization: "Unknown",
  },
  "deepseek-r1": {
    metrics: {
      "Reasoning Average": 83.17,
      "Coding Average": 66.74,
      "Mathematics Average": 80.71,
      "Data Analysis Average": 69.78,
      "Language Average": 48.53,
      "IF Average": 80.51,
      "Global Average": 72.34,
    },
    organization: "Unknown",
  },
  "o3-mini-2025-01-31-medium": {
    metrics: {
      "Reasoning Average": 86.33,
      "Coding Average": 65.38,
      "Mathematics Average": 72.37,
      "Data Analysis Average": 66.56,
      "Language Average": 46.26,
      "IF Average": 83.16,
      "Global Average": 71,
    },
    organization: "Unknown",
  },
  "gemini-2.0-flash-thinking-exp-01-21": {
    metrics: {
      "Reasoning Average": 78.17,
      "Coding Average": 53.49,
      "Mathematics Average": 75.85,
      "Data Analysis Average": 69.37,
      "Language Average": 42.18,
      "IF Average": 82.47,
      "Global Average": 68.53,
    },
    organization: "Unknown",
  },
  "gemini-2.0-pro-exp-02-05": {
    metrics: {
      "Reasoning Average": 60.08,
      "Coding Average": 63.49,
      "Mathematics Average": 70.97,
      "Data Analysis Average": 68.02,
      "Language Average": 44.85,
      "IF Average": 83.38,
      "Global Average": 66.24,
    },
    organization: "Unknown",
  },
  "gemini-exp-1206": {
    metrics: {
      "Reasoning Average": 57,
      "Coding Average": 63.41,
      "Mathematics Average": 72.36,
      "Data Analysis Average": 63.16,
      "Language Average": 51.29,
      "IF Average": 77.34,
      "Global Average": 64.87,
    },
    organization: "Unknown",
  },
  "o3-mini-2025-01-31-low": {
    metrics: {
      "Reasoning Average": 69.83,
      "Coding Average": 61.46,
      "Mathematics Average": 63.06,
      "Data Analysis Average": 62.04,
      "Language Average": 38.25,
      "IF Average": 80.06,
      "Global Average": 63.49,
    },
    organization: "Unknown",
  },
  "gemini-2.0-flash": {
    metrics: {
      "Reasoning Average": 55.25,
      "Coding Average": 53.92,
      "Mathematics Average": 65.62,
      "Data Analysis Average": 67.55,
      "Language Average": 40.69,
      "IF Average": 85.79,
      "Global Average": 63.24,
    },
    organization: "Unknown",
  },
  "qwen2.5-max": {
    metrics: {
      "Reasoning Average": 51.42,
      "Coding Average": 64.41,
      "Mathematics Average": 58.35,
      "Data Analysis Average": 67.93,
      "Language Average": 56.28,
      "IF Average": 75.35,
      "Global Average": 62.89,
    },
    organization: "Unknown",
  },
} as { [key: string]: ModelPerformance };

// 保存文件的工具函�?
async function saveToFile(content: string, filePath: string): Promise<void> {
  const dir = path.dirname(filePath);

  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 写入文件
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, "utf8", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function main() {
  try {
    // 使用渲染器处理数�?
    const renderer = new AIBenchTemplateRenderer();
    const templateData = renderer.transformData(modelData);
    const htmlContent = await renderer.render(templateData);

    // 保存到文�?
    const outputPath = path.join(
      __dirname,
      "../../../temp/aibench_preview.html",
    );
    await saveToFile(htmlContent, outputPath);
    console.log(`预览文件已生成：${outputPath}`);

    // 输出一些基本信息用于验�?
    console.log("\n=== AI模型评测数据 ===");
    console.log(`总计模型数：${templateData.globalTop10.length}`);
    console.log("\n--- 全局排名�?�?---");
    templateData.globalTop10.slice(0, 3).forEach((model, index) => {
      console.log(`${index + 1}. ${model.name} (${model.score.toFixed(2)}�?`);
    });

    console.log("\n--- 各项能力最高分 ---");
    templateData.categories.forEach((category) => {
      if (category.models.length > 0) {
        const topModel = category.models[0];
        console.log(
          `${category.name}: ${topModel.name} (${topModel.score.toFixed(2)}�?`,
        );
      }
    });
  } catch (error) {
    console.error("生成预览时出�?", error);
  }
}

// 运行程序
main().catch(console.error);
