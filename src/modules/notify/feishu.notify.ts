import { INotifier, Level } from "@src/modules/interfaces/notify.interface.ts";
import axios from "npm:axios";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { Logger } from "@zilla/logger";

const logger = new Logger("feishu-notify");

export class FeishuNotifier implements INotifier {
  private webhook?: string;
  private enabled: boolean = false;

  constructor() {
    // It's good practice to call refresh during construction or initialization phase
    // to ensure the notifier is ready or to fail fast if config is missing.
    this.refresh().catch(error => {
      logger.error("Failed to initialize FeishuNotifier configuration:", error);
    });
  }

  async refresh(): Promise<void> {
    const configManager = ConfigManager.getInstance();
    const startTime = Date.now();
    try {
      this.enabled = await configManager.get<boolean>("ENABLE_FEISHU").catch(
        () => false,
      );

      if (this.enabled) {
        this.webhook = await configManager.get<string>("FEISHU_WEBHOOK_URL").catch(
          () => undefined,
        );

        if (!this.webhook) {
          logger.warn("Feishu webhook URL not configured but Feishu is enabled");
        }
      }
    } catch (error) {
      logger.error("Error refreshing FeishuNotifier configuration:", error);
      this.enabled = false; // Ensure it's disabled if config loading fails
    }
    logger.debug(
      `FeishuNotifier configuration refresh completed. Enabled: ${this.enabled}, Webhook set: ${!!this.webhook}. Time taken: ${Date.now() - startTime}ms`,
    );
  }

  async notify(
    title: string,
    content: string,
    options: {
      level?: Level;
      // Feishu specific options can be added here if needed
    } = {},
  ): Promise<boolean> {
    // Refresh configuration before sending, ensures config is up-to-date.
    // Consider if this is too frequent or if errors during refresh should prevent notification.
    await this.refresh();

    if (!this.enabled) {
      logger.debug("Feishu notifications are disabled.");
      return false;
    }

    if (!this.webhook) {
      logger.warn("Feishu webhook URL not configured, skipping notification.");
      return false;
    }

    const messageContent = title ? `${title}
${content}` : content;
    const payload = {
      msg_type: "text",
      content: {
        text: messageContent,
      },
    };

    try {
      const response = await axios.post(this.webhook, payload, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "User-Agent": "TrendFinder/1.0.0", // Optional: Custom User-Agent
        },
      });

      // Feishu API typically returns errcode/code 0 for success
      // Adjust based on actual Feishu API response structure
      if (response.status === 200 && response.data && (response.data.code === 0 || response.data.errcode === 0 || response.data.StatusCode === 0)) {
        logger.debug("Feishu notification sent successfully.");
        return true;
      }

      logger.error("Feishu notification failed:", response.data);
      return false;
    } catch (error) {
      logger.error("Error sending Feishu notification:", error.message, error.stack);
      if (error.response) {
        logger.error("Feishu error response data:", error.response.data);
      }
      return false;
    }
  }

  async success(title: string, content: string): Promise<boolean> {
    return this.notify(title, `✅ ${content}`, { level: "active" });
  }

  async error(title: string, content: string): Promise<boolean> {
    // Consider if error messages should @mention anyone by default in Feishu
    return this.notify(title, `❌ ${content}`, { level: "timeSensitive" });
  }

  async warning(title: string, content: string): Promise<boolean> {
    return this.notify(title, `⚠️ ${content}`, { level: "timeSensitive" });
  }

  async info(title: string, content: string): Promise<boolean> {
    return this.notify(title, `ℹ️ ${content}`, { level: "passive" });
  }
}
