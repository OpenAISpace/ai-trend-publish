import process from "node:process";

const tailwind = Bun.spawn(
  ["bunx", "tailwindcss", "-i", "./src/index.css", "-o", "./src/styles.css", "--watch"],
  {
    stdout: "inherit",
    stderr: "inherit",
  },
);

const bundler = Bun.spawn(
  [
    "bun",
    "build",
    "./src/index.html",
    "--outdir=dist",
    "--sourcemap",
    "--target=browser",
    "--watch",
    "--define:process.env.NODE_ENV=\"development\"",
    "--env=BUN_PUBLIC_*",
  ],
  {
    stdout: "inherit",
    stderr: "inherit",
  },
);

const shutdown = () => {
  tailwind.kill();
  bundler.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.all([tailwind.exited, bundler.exited]);
