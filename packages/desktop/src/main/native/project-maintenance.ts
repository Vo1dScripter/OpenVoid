import { spawn } from "node:child_process"
import { mkdirSync, openSync, closeSync, existsSync } from "node:fs"
import path from "node:path"
import { app, dialog } from "electron"

let starting = false

export async function projectMaintenance(action: "status" | "reinstall") {
  const development = process.env.OPENCODE_DESKTOP_CLI_DEV
  const available =
    !app.isPackaged &&
    process.platform === "linux" &&
    process.env.OPENCODE_PROJECT_DESKTOP_ID === "ai.opencode.project" &&
    Boolean(development)
  if (!available || !development || action === "status") return { available, message: "" }
  if (starting) return { available, message: "La reinstalación ya está en marcha." }
  starting = true
  try {
    const choice = await dialog.showMessageBox({
      type: "question",
      title: "Reinstalar motor de OpenVoid",
      message: "¿Reinstalar el motor local?",
      detail:
        "Se cerrará esta app y se reiniciará su servidor, interrumpiendo las tareas activas. Se reinstalarán las dependencias del motor y Electron; no se borrará ni descargará de nuevo el código del proyecto. Se conservarán tus modificaciones, historial, MCP, skills y reglas de VPN. Si la instalación falla, se restaurarán las dependencias anteriores.",
      buttons: ["Cancelar", "Reinstalar motor"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    })
    if (choice.response !== 1) return { available, message: "" }
    const root = path.resolve(development, "../..")
    const script = path.join(root, "script", "reinstall-project.py")
    const state = process.env.XDG_STATE_HOME
    if (!existsSync(script) || !state) throw new Error("No se encontró el instalador privado del proyecto")
    const directory = path.resolve(state, "../..", "maintenance")
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    const fd = openSync(path.join(directory, "reinstall.log"), "a", 0o600)
    try {
      const child = spawn("/usr/bin/python3", [script, "--wait-pid", String(process.pid)], {
        cwd: root,
        env: process.env,
        detached: true,
        stdio: ["ignore", fd, fd],
      })
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve)
        child.once("error", reject)
      })
      child.unref()
    } finally {
      closeSync(fd)
    }
    // Let the IPC response reach the renderer before disposing its window.
    setTimeout(() => app.quit(), 250)
    return { available, message: "Reinstalando; la aplicación se abrirá al terminar." }
  } catch (error) {
    return { available, message: error instanceof Error ? error.message : String(error) }
  } finally {
    starting = false
  }
}
