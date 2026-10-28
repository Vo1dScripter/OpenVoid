import { createResource, createSignal, Show } from "solid-js"
import { Button } from "@opencode/ui/button"
import { Tooltip } from "@opencode/ui/tooltip"
import { showToast } from "@opencode/ui/toast"
import { usePlatform } from "@/runtime/platform/platform"
import { useLanguage } from "@/runtime/i18n/language"

export function ProjectMaintenanceButton() {
  const platform = usePlatform()
  const language = useLanguage()
  const [busy, setBusy] = createSignal(false)
  const [capability] = createResource(
    () =>
      platform.projectMaintenance?.("status").catch(() => ({ available: false, message: "" })) ??
      Promise.resolve({ available: false, message: "" }),
    { initialValue: { available: false, message: "" } },
  )
  const reinstall = async () => {
    setBusy(true)
    try {
      const result = await platform.projectMaintenance?.("reinstall")
      if (result?.message) showToast({ title: language.t("project.reinstall.title"), description: result.message })
    } catch (error) {
      showToast({ title: language.t("project.reinstall.title"), description: String(error) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Show when={capability.latest.available}>
      <Tooltip placement="bottom" value={language.t("project.reinstall.description")}>
        <Button
          type="button"
          variant="neutral"
          size="small"
          class="shrink-0 whitespace-nowrap"
          disabled={busy()}
          aria-busy={busy()}
          aria-label={language.t("project.reinstall.title")}
          onClick={() => void reinstall()}
          icon="refresh"
        >
          {language.t("project.reinstall.title")}
        </Button>
      </Tooltip>
    </Show>
  )
}
