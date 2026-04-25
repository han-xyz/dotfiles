import { createBinding, For } from "ags"
import { Gdk } from "ags/gtk4"
import AstalHyprland from "gi://AstalHyprland"

const hypr = AstalHyprland.get_default()

export default function Workspaces({ monitor }: { monitor: Gdk.Monitor }) {
  const workspaces = createBinding(hypr, "workspaces")
  const focused = createBinding(hypr, "focusedWorkspace")

  const myWorkspaces = workspaces((all) =>
    all
      .filter((ws) => ws.monitor?.name === monitor.connector)
      .sort((a, b) => a.id - b.id),
  )

  return (
    <box class="workspaces">
      <For each={myWorkspaces}>
        {(ws) => (
          <button
            class={focused((f) => `workspace ${f?.id === ws.id ? "active" : ""}`)}
            onClicked={() => ws.focus()}
          >
            <label label={`${ws.id}`} />
          </button>
        )}
      </For>
    </box>
  )
}
