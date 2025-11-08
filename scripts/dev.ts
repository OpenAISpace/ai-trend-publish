import { join } from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const frontendDist = join(rootDir, "fronted", "dist");

const frontend = Bun.spawn({
  cmd: ["bun", "run", "dev"],
  cwd: join(rootDir, "fronted"),
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
  },
});

const backend = Bun.spawn({
  cmd: ["bun", "run", "dev:api"],
  cwd: rootDir,
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    FRONTEND_DIST: frontendDist,
  },
});

const shutdown = () => {
  frontend.kill();
  backend.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.all([frontend.exited, backend.exited]);
