import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { WeixinImageProcessor } from "@src/utils/image/image-processor.ts";
import { WeixinPublisher } from "@src/modules/publishers/weixin.publisher.ts";
import fs from "node:fs";
import path from "node:path";

const templatePath = path.join(__dirname, "../templates/weixin");
const templates = fs.readdirSync(templatePath)
  .filter((file) => file.endsWith(".ejs"));

/**
 * 微信转换
 */
async function main() {
  const configManager = await ConfigManager.getInstance();
  configManager.initDefaultConfigSources();
  const weixinImageProcessor = new WeixinImageProcessor(new WeixinPublisher());

  // 遍历所有模板文�?  for (const template of templates) {
    const templateFilePath = path.join(templatePath, template);
    const ejsTemplate = fs.readFileSync(templateFilePath, "utf-8");

    // 备份原始文件
    const backupPath = `${templateFilePath}.bak`;
    fs.copyFileSync(templateFilePath, backupPath);
    console.log(`已备份文�? ${backupPath}`);

    // 处理模板内容
    const result = await weixinImageProcessor.processContent(ejsTemplate);

    // 写回文件
    fs.writeFileSync(templateFilePath, result.content, "utf-8");

    console.log(`处理完成: ${template}`);
    console.log("处理结果:", result.results);
  }
}

main().catch(console.error);
