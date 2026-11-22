export type PillState = "focused" | "shown" | "other"

export function pillState(wsId: number, focusedId: number | null, shownId: number | null): PillState {
  if (wsId === focusedId) return "focused"
  if (wsId === shownId) return "shown"
  return "other"
}
