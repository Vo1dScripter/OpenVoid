import openvoidIcon from "../../../desktop/icons/openvoid/icon.png"
import { Logo } from "@opencode/ui/logo"
import "./wordmark.css"

export function NewSessionWordmark() {
  if (import.meta.env.VITE_OPENCODE_APP_NAME)
    return (
      <div data-component="new-session-wordmark" class="pointer-events-none mx-auto flex w-full max-w-[720px] items-center justify-center gap-4 py-3" aria-hidden="true">
        <img src={openvoidIcon} alt="" class="size-20 shrink-0" />
        <div class="min-w-0 text-v2-text-text-base">
          <div class="text-[28px] leading-9 font-semibold tracking-tight">OpenVoid</div>
          <div class="text-sm text-v2-text-text-muted">cracked version</div>
        </div>
      </div>
    )

  return (
    <div
      data-component="new-session-wordmark"
      aria-hidden="true"
      class="pointer-events-none mx-auto w-full max-w-[720px] text-v2-background-bg-inverse"
    >
      <div data-slot="wordmark-reveal" class="relative mx-auto w-4/5">
        <Logo class="block aspect-[720/129] w-full opacity-[0.16]" />
        <Logo class="wordmark-shimmer absolute inset-0 aspect-[720/129] w-full" />
      </div>
    </div>
  )
}
