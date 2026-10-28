import { $ } from "bun"
import { resolveChannel } from "./utils"

const arg = process.argv[2]

const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()

const src = process.env.OPENCODE_PROJECT_DESKTOP_ID === "ai.opencode.project" ? "./icons/openvoid" : `./icons/${channel}`

const dest = "resources/icons"

await $`rm -rf ${dest}`

await $`cp -R ${src} ${dest}`

console.log(`Copied ${channel} icons from ${src} to ${dest}`)
