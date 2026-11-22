#!/bin/sh
# Claude Code statusLine hook: keeps the last status JSON where the bar can watch it.
# Prints nothing on purpose (han's choice: no terminal status line).
dir="${XDG_CACHE_HOME:-$HOME/.cache}/claude-usage"
mkdir -p "$dir" 2>/dev/null || exit 0
tmp="$dir/latest.json.tmp.$$"
# The state file also holds account data: copy only scalar limit fields, the
# model name and the fetch time, from the file's first JSON value.
src="${CLAUDE_USAGE_SOURCE:-$HOME/.claude.json}"
filter='input | .cachedUsageUtilization | select(.utilization.limits | type == "array") | {
  fetched_at_ms: (.fetchedAtMs | if type == "number" then . else null end),
  limits: [.utilization.limits[]
    | select(type == "object")
    | select((.kind | type) == "string" and (.percent | type) == "number" and (.resets_at | type) == "string")
    | {kind, percent, resets_at, scope: (
        if (.scope | type) == "object" and (.scope.model | type) == "object" and (.scope.model.display_name | type) == "string"
        then {model: {display_name: .scope.model.display_name}}
        else null end)}]}'
usage=""
if command -v jq >/dev/null 2>&1 && [ -f "$src" ] && [ -r "$src" ]; then
  usage=$(jq -c -n "$filter" "$src" 2>/dev/null)
fi
{
  printf '{"received_at":%s,"data":' "$(date +%s)"
  cat
  if [ -n "$usage" ]; then printf ',"usage":%s}\n' "$usage"; else printf '}\n'; fi
} > "$tmp" 2>/dev/null \
  && mv -f "$tmp" "$dir/latest.json" 2>/dev/null
exit 0
