import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config, configMetadata, dataSources, prompts, vectorItems, workflowSchedules, workflowRuns, workflowRunSteps, workflowResults } from "@src/db/schema.ts";
import { Logger } from "@src/utils/logger-adapter.ts";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config();

const logger = new Logger("DB");

logger.info("DB_HOST", process.env.DB_HOST);
logger.info("DB_PORT", process.env.DB_PORT);
logger.info("DB_USER", process.env.DB_USER);
logger.info("DB_PASSWORD", process.env.DB_PASSWORD);
logger.info("DB_DATABASE", process.env.DB_DATABASE);

const poolConnection = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

const db = drizzle(poolConnection, {
  mode: "default",
  schema: {
    config: config,
    configMetadata,
    dataSources: dataSources,
    prompts,
    vectorItems,
    workflowSchedules,
    workflowRuns,
    workflowRunSteps,
    workflowResults
  },
});

export default db;
