import path from "node:path"
import { devEnvironment } from "./dev-env"

const root = path.resolve(import.meta.dir, "..")
const target = process.argv[2]
if (target !== "cli" && target !== "desktop") throw new Error("Expected dev target: cli or desktop")

const directory = path.join(root, "packages", target === "desktop" ? "desktop" : "cli")
const entry = target === "desktop" ? "scripts/dev.ts" : "src/index.ts"
const child = Bun.spawn([process.execPath, entry, ...process.argv.slice(3)], {
  cwd: directory,
  env: {
    ...(await devEnvironment(root)),
    ...(target === "cli" ? { OPENCODE_PROJECT_DIRECTORY: process.cwd() } : {}),
  },
  stdio: ["inherit", "inherit", "inherit"],
})
process.exitCode = await child.exited
