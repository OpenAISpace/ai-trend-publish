import { ConfigManager } from "@src/utils/config/config-manager.ts";
import db from "@src/db/db.ts";
import { dataSources } from "@src/db/schema.ts";
import { Logger } from "@src/utils/logger-adapter.ts";
export type NewsPlatform = "firecrawl" | "twitter";

const logger = new Logger("getDataSources");

interface SourceItem {
  identifier: string;
}

type SourceConfig = Record<NewsPlatform, SourceItem[]>;

// 本地源配置
export const sourceConfigs: SourceConfig = {
  firecrawl: [
    { identifier: "https://news.ycombinator.com/" },
  ],
  twitter: [
    { identifier: "https://x.com/OpenAIDevs" },
  ],
} as const;

interface DbSource {
  identifier: string;
  platform: NewsPlatform;
}

export const getDataSources = async (): Promise<SourceConfig> => {
  const configManager = ConfigManager.getInstance();
  try {
    const dbEnabled = await configManager.get("ENABLE_DB");
    const mergedSources: SourceConfig = JSON.parse(
      JSON.stringify(sourceConfigs),
    );

    if (dbEnabled) {
      logger.info("开始从数据库获取数据源");
      const dbResults = await db.select({
        identifier: dataSources.identifier,
        platform: dataSources.platform,
      })
        .from(dataSources);

      // 处理数据库结果
      dbResults.forEach((item) => {
        const { platform, identifier } = item;
        if (
          identifier !== null &&
          platform !== null &&
          platform in mergedSources
        ) {
          const exists = mergedSources[platform as NewsPlatform].some(
            (source) => source.identifier === identifier,
          );
          if (!exists) {
            mergedSources[platform as NewsPlatform].push({ identifier });
          }
        }
      });
    }

    return mergedSources;
  } catch (error) {
    console.error("Failed to get data sources from database:", error);
    // 数据库不可用时返回本地配置
    return sourceConfigs;
  }
};
