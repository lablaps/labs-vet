import { spawn } from "node:child_process";
import { resolve } from "node:path";

const viteBin = resolve("node_modules", "vite", "bin", "vite.js");
const children = [
  spawn(process.execPath, ["--experimental-sqlite", "server/index.js"], {
    stdio: "inherit",
    env: { ...process.env, LABVET_API_PORT: process.env.LABVET_API_PORT || "4174" },
  }),
  spawn(process.execPath, [viteBin, "--host", "127.0.0.1"], {
    stdio: "inherit",
    env: { ...process.env },
  }),
];

let shuttingDown = false;

for (const child of children) {
  child.on("exit", (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const other of children) {
      if (other !== child && !other.killed) other.kill();
    }
    process.exit(code ?? 0);
  });
}

function shutdown() {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
