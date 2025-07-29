import { startCronJobs } from "@src/controllers/cron.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { configureLogger } from "@src/utils/logger-config.ts";
import startServer from "@src/server.ts";
async function bootstrap() {
  const configManager = ConfigManager.getInstance();
  await configManager.initDefaultConfigSources();

  // Configure LogTape
  await configureLogger();

  startCronJobs();
  startServer();
}

bootstrap().catch(console.error);
