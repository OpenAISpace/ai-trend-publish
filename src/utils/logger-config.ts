import { configure } from "@logtape/logtape";
import { LogLevel } from "./logger-adapter.ts";

/**
 * 配置LogTape日志系统
 */
export async function configureLogger() {
  await configure({
    sinks: {
      console: (record) => {
        const timestamp = new Date(record.timestamp).toLocaleString();
        const level = record.level.toUpperCase();
        const category = Array.isArray(record.category) ? record.category.join('.') : record.category;
        const message = record.rawMessage || record.message;
        
        // 添加颜色支持
        const colors = {
          DEBUG: '\x1b[36m',   // 青色
          INFO: '\x1b[32m',    // 绿色
          WARN: '\x1b[33m',    // 黄色
          ERROR: '\x1b[31m',   // 红色
          RESET: '\x1b[0m',    // 重置
          GRAY: '\x1b[90m',    // 灰色
          DIM: '\x1b[2m',      // 变暗
          BRIGHT: '\x1b[1m',   // 加粗
          BLUE: '\x1b[34m',    // 蓝色
        };
        
        // 根据日志级别设置不同的图标和样式
        const levelIcons = {
          DEBUG: '🔍',
          INFO: '💡',
          WARN: '⚠️ ',
          ERROR: '❌',
        };
        
        const icon = levelIcons[level as keyof typeof levelIcons] || '📝';
        const coloredLevel = `${colors[level as keyof typeof colors] || colors.INFO}${colors.BRIGHT}${level.padEnd(5)}${colors.RESET}`;
        const coloredCategory = `${colors.BLUE}${category}${colors.RESET}`;
        const coloredTimestamp = `${colors.DIM}${timestamp}${colors.RESET}`;
        
        // 使用更清晰的布局
        console.log(`${colors.DIM}┌─${colors.RESET} ${coloredTimestamp}`);
        console.log(`${colors.DIM}├─${colors.RESET} ${icon} ${coloredLevel} ${colors.DIM}[${coloredCategory}]${colors.RESET}`);
        console.log(`${colors.DIM}└─${colors.RESET} ${message}\n`);
      },
    },
    filters: {},
    loggers: [
      {
        category: [],
        level: LogLevel.INFO,
        sinks: ["console"],
      },
    ],
  });
} 