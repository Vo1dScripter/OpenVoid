import { createHash } from "node:crypto"
import { chmod, mkdir, symlink, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import pkg from "../package.json"

export async function devEnvironment(root: string) {
  const checkout = path.resolve(root)
  const id = createHash("sha256").update(checkout).digest("hex")
  const profile = path.join(
    homedir(),
    ".opencode-projects",
    id.slice(0, 16),
  )
  const configDir = path.join(profile, "config", "opencode")
  const globalConfigDir =
    process.env.OPENCODE_CONFIG_DIR ??
    path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config"), "opencode")
  const globalConfigFiles = [
    path.join(globalConfigDir, "opencode.json"),
    path.join(globalConfigDir, "opencode.jsonc"),
    process.env.OPENCODE_CONFIG,
  ].filter((file): file is string => Boolean(file && existsSync(file)))
  const source = await Promise.all(
    globalConfigFiles.map(async (file) => configRecord(Bun.JSONC.parse(await Bun.file(file).text()))),
  )
  const inline = process.env.OPENCODE_CONFIG_CONTENT
    ? configRecord(Bun.JSONC.parse(process.env.OPENCODE_CONFIG_CONTENT))
    : undefined
  const localFile = path.join(configDir, "opencode.json")
  const local = existsSync(localFile) ? configRecord(Bun.JSONC.parse(await Bun.file(localFile).text())) : undefined
  const mcp = Object.assign(
    {},
    ...source.map((config) => configRecord(config?.mcp) ?? {}),
    configRecord(inline?.mcp) ?? {},
    configRecord(local?.mcp) ?? {},
  )
  const provider = Object.assign(
    {},
    ...source.map((config) => configRecord(config?.provider) ?? {}),
    configRecord(inline?.provider) ?? {},
    configRecord(local?.provider) ?? {},
  )
  const configuredModel = [...source, inline]
    .flatMap((config) => (config?.model === undefined ? [] : [config.model]))
    .at(-1)
  const localWithoutModel = Object.fromEntries(Object.entries(local ?? {}).filter(([key]) => key !== "model"))

  await mkdir(configDir, { recursive: true, mode: 0o700 })
  await chmod(configDir, 0o700)
  const isolated =
    Object.keys(provider).length === 0 ? { ...localWithoutModel, mcp } : { ...localWithoutModel, mcp, provider }
  const instructions = [...new Set([
    ...[...source, inline, local].flatMap((config) => Array.isArray(config?.instructions) ? config.instructions : []),
    path.join(checkout, "script", "network-instructions.md"),
  ])]
  const prepared = { ...(configuredModel === undefined ? isolated : { ...isolated, model: configuredModel }), instructions }
  await writeFile(localFile, `${JSON.stringify(prepared, null, 2)}\n`, { mode: 0o600 })
  await chmod(localFile, 0o600)

  const serviceFile = path.join(configDir, "service.json")
  const service = existsSync(serviceFile) ? configRecord(Bun.JSONC.parse(await Bun.file(serviceFile).text())) ?? {} : {}
  if (service.port === undefined) {
    // The project owns its service registration and database, independently of installed clients.
    service.port = 20_000 + (Number.parseInt(id.slice(0, 8), 16) % 20_000) + 2
    await writeFile(serviceFile, `${JSON.stringify(service, null, 2)}\n`, { mode: 0o600 })
    await chmod(serviceFile, 0o600)
  }

  const sourceSkills = path.join(globalConfigDir, "skills")
  const localSkills = path.join(configDir, "skills")
  if (existsSync(sourceSkills) && !existsSync(localSkills)) await symlink(sourceSkills, localSkills, "junction")

  const env = { ...process.env }
  delete env.OPENCODE_CONFIG
  delete env.OPENCODE_CONFIG_CONTENT

  return {
    ...env,
    PATH: `${path.dirname(process.execPath)}${path.delimiter}${env.PATH ?? ""}`,
    XDG_DATA_HOME: path.join(profile, "runtime", "data"),
    XDG_CACHE_HOME: path.join(profile, "cache"),
    XDG_CONFIG_HOME: path.join(profile, "config"),
    XDG_STATE_HOME: path.join(profile, "runtime", "state"),
    OPENCODE_DB: path.join(profile, "runtime", "data", "opencode", "opencode.db"),
    OPENCODE_CONFIG_DIR: configDir,
    OPENCODE_TUI_CHANNEL: "local",
    OPENCODE_VERSION: pkg.version,
    OPENCODE_PROJECT_CHANNEL: "dev",
    OPENCODE_DISABLE_CHANNEL_DB: "1",
    OPENCODE_DESKTOP_ISOLATED_SERVER: "0",
    OPENCODE_DESKTOP_SERVER_CHANNEL: "dev",
    OPENCODE_PROJECT_DESKTOP_NAME: "OpenVoid cracked version",
    OPENCODE_PROJECT_DESKTOP_ID: "ai.opencode.project",
    OPENCODE_DESKTOP_REMOTE_DEBUGGING_PORT: String(40_000 + (Number.parseInt(id.slice(0, 8), 16) % 20_000)),
  }
}

function configRecord(value: unknown) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}
