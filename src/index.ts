import { startCronJobs } from "@src/controllers/cron.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { Logger, LogLevel } from "@zilla/logger";
import startServer from "@src/server.ts";
async function bootstrap() {
  const configManager = ConfigManager.getInstance();
  await configManager.initDefaultConfigSources();

  Logger.level = LogLevel.INFO;

  startCronJobs();
  startServer();
}

bootstrap().catch(console.error);
