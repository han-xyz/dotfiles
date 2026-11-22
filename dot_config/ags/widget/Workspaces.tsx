import { createBinding, createComputed, createMemo, createState, For, With } from "ags"
import { Gdk, Gtk } from "ags/gtk4"
import AstalHyprland from "gi://AstalHyprland"
import { iconFor } from "./appIcon"
import { pillState } from "../workspaces"

const hypr = AstalHyprland.get_default()

// Hyprland emits no IPC event when the scrolling layout reorders columns, so
// the config sends a custom "bar-reorder" event after each such bind (see
// hypr/lua/columns.lua). Mouse-drag reorders send nothing at all, so every
// focus change (activewindowv2) resyncs too. Resync client positions and bump
// the tick so every pill re-sorts its icons.
const [layoutTick, setLayoutTick] = createState(0)
hypr.connect("event", (_h, event: string, args: string) => {
  const reordered = (event === "custom" && args === "bar-reorder") || event === "activewindowv2"
  if (!reordered) return
  hypr.sync_clients((_src, res) => {
    try {
      hypr.sync_clients_finish(res)
    } catch (e) {
      console.error(e)
      return
    }
    setLayoutTick((t) => t + 1)
  })
})

export default function Workspaces({ monitor }: { monitor: Gdk.Monitor }) {
  const workspaces = createBinding(hypr, "workspaces")
  const focused = createBinding(hypr, "focusedWorkspace")
  const focusedClient = createBinding(hypr, "focusedClient")
  const monitors = createBinding(hypr, "monitors")

  // On hot-plug the Gdk monitor can exist before AstalHyprland lists the
  // output, so the Hyprland monitor is looked up reactively, not once.
  const hyprMonitor = createMemo(() => monitors().find((m) => m.name === monitor.connector) ?? null)
  const shownId = createComputed(() => {
    const m = hyprMonitor()
    return m ? (createBinding(m, "activeWorkspace")()?.id ?? null) : null
  })

  const myWorkspaces = workspaces((all) =>
    all
      .filter((ws) => ws.monitor?.name === monitor.connector)
      .sort((a, b) => a.id - b.id),
  )

  return (
    <box class="workspaces">
      <For each={myWorkspaces}>
        {(ws) => {
          const clients = createComputed([createBinding(ws, "clients"), layoutTick], (cs) =>
            cs.filter((c) => c.mapped).sort((a, b) => a.x - b.x || a.y - b.y),
          )
          const isEmpty = clients.as((cs) => cs.length === 0)
          const state = createComputed(() => pillState(ws.id, focused()?.id ?? null, shownId()))
          const pillTooltip = clients((cs) =>
            cs.length === 0
              ? `Workspace ${ws.id}: empty. Click: switch`
              : `Workspace ${ws.id}: ${cs.map((c) => c.class || c.initialClass).join(", ")}. Click: switch`,
          )

          return (
            <button
              class={state((st) => (st === "other" ? "workspace" : `workspace ws-${st}`))}
              tooltipText={pillTooltip}
              onClicked={() => ws.focus()}
            >
              <With value={isEmpty}>
                {(empty) =>
                  empty ? (
                    <label class="empty" label="•" />
                  ) : (
                    <box class="clients" spacing={0} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                      <For each={clients}>
                        {(c) => (
                          <image
                            class={focusedClient(
                              (fc) => `client ${fc?.address === c.address ? "focused" : ""}`,
                            )}
                            iconName={createBinding(c, "class")((cls) => iconFor(cls || c.initialClass))}
                            pixelSize={16}
                            tooltipText={createBinding(c, "title")((t) => `${t || c.class || c.initialClass}. Click: focus`)}
                            valign={Gtk.Align.CENTER}
                            $={(self) => {
                              // Capture phase + claim: the icon's click is
                              // consumed here so it never reaches the outer
                              // button, which would also focus the workspace.
                              const g = new Gtk.GestureClick()
                              g.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
                              g.connect("released", () => {
                                c.focus()
                                g.set_state(Gtk.EventSequenceState.CLAIMED)
                              })
                              self.add_controller(g)
                            }}
                          />
                        )}
                      </For>
                    </box>
                  )
                }
              </With>
            </button>
          )
        }}
      </For>
    </box>
  )
}
