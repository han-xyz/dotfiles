#!/bin/sh
here=$(cd "$(dirname "$0")" && pwd)
hook="$here/../scripts/claude-statusline.sh"
shell=$(command -v sh)
fixture="$here/fixtures/state.json"
tmp="$here/.tmp-statusline"
out="$tmp/claude-usage/latest.json"
account="00000000-fake-4000-8000-fixtureacct1"
payload='{ "session_id" :  "s1",	"cost": {"total_cost_usd": 1.50} }'

trap 'rm -rf "$tmp"' EXIT
rm -rf "$tmp"
mkdir -p "$tmp/bin"

fail() {
  echo "FAIL: $1"
  exit 1
}

run_hook() {
  rm -f "$out"
  printed=$(printf '%s' "$payload" | XDG_CACHE_HOME="$tmp" CLAUDE_USAGE_SOURCE="$1" PATH="$2" "$shell" "$hook") \
    || fail "the hook exits non-zero for source $1"
  [ -z "$printed" ] || fail "the hook prints \"$printed\" for source $1"
  jq -e . "$out" >/dev/null 2>&1 || fail "the snapshot for source $1 is not valid JSON"
  grep -F -q "\"data\":$payload" "$out" || fail "stdin is not passed through byte for byte for source $1"
}

expect_no_usage() {
  jq -e 'keys == ["data", "received_at"]' "$out" >/dev/null || fail "$1 should give no usage field: $(cat "$out")"
}

run_hook "$fixture" "$PATH"
jq -e '.usage.limits | length == 2' "$out" >/dev/null || fail "the fixture should give two limits: $(cat "$out")"
jq -e '[.usage.limits[] | keys == ["kind", "percent", "resets_at", "scope"]] | all' "$out" >/dev/null \
  || fail "each limit should carry exactly kind, percent, resets_at, scope: $(cat "$out")"
jq -e '.usage.fetched_at_ms == 1795341594329' "$out" >/dev/null || fail "fetched_at_ms should be copied: $(cat "$out")"
if grep -F -q "$account" "$out"; then fail "the account id reached the snapshot"; fi

printf '{"numStartups": 1}' > "$tmp/plain.json"
run_hook "$tmp/plain.json" "$PATH"
expect_no_usage "a source without cachedUsageUtilization"

run_hook "$tmp/absent.json" "$PATH"
expect_no_usage "a missing source"

for tool in sh cat date mkdir mv; do
  ln -s "$(command -v "$tool")" "$tmp/bin/$tool"
done
run_hook "$fixture" "$tmp/bin"
expect_no_usage "a PATH without jq"

cat > "$tmp/noisy.json" <<'EOF'
{"oauthAccount": {"emailAddress": "SECRET-top"}, "userID": "SECRET-user",
 "cachedUsageUtilization": {"fetchedAtMs": 1, "accountUuid": "SECRET-acct", "orgName": "SECRET-cache",
  "utilization": {"seven_day": {"utilization": 1, "resets_at": "SECRET-week"}, "email": "SECRET-util",
   "limits": [{"kind": "weekly_all", "percent": 5, "resets_at": "2026-11-23T00:59:59+00:00", "scope": null,
               "group": "SECRET-group", "severity": "SECRET-sev", "token": "SECRET-entry"}]}}}
EOF
run_hook "$tmp/noisy.json" "$PATH"
jq -e '.usage.limits | length == 1' "$out" >/dev/null || fail "the noisy source should give one limit: $(cat "$out")"
if grep -q "SECRET" "$out"; then fail "source data beyond the four limit fields and the fetch time reached the snapshot: $(cat "$out")"; fi

printf '{"cachedUsageUtilization": {"fetchedAtMs": 1, "utilization": {"limits": {"a": {"kind": "weekly_all", "percent": 5}}}}}' > "$tmp/notarray.json"
run_hook "$tmp/notarray.json" "$PATH"
expect_no_usage "a source whose limits is not an array"

printf 'not json {' > "$tmp/broken.json"
run_hook "$tmp/broken.json" "$PATH"
expect_no_usage "a source that is not JSON"

cat > "$tmp/hostile.json" <<'EOF'
{
  "oauthAccount": {"emailAddress": "SECRET_EMAIL@example.com"},
  "cachedUsageUtilization": {
    "fetchedAtMs": {"x": "SECRET_FETCH_OBJ"},
    "accountUuid": "SECRET_UUID",
    "utilization": {
      "limits": [
        {"kind": "weekly_scoped", "percent": 53, "resets_at": "2026-11-23T00:59:59+00:00", "token": "SECRET_TOKEN",
         "scope": {"model": {"id": null, "display_name": "Fa\"ble\nx", "apiKey": "SECRET_KEY"}, "surface": null, "email": "SECRET_SCOPE_EMAIL"}},
        {"kind": {"nested": "SECRET_KIND_OBJ"}, "percent": {"x": "SECRET_PERCENT_OBJ"}, "resets_at": ["SECRET_RESETS_ARR"], "scope": null},
        {"kind": "weekly_all", "percent": 5, "resets_at": "x", "scope": "SECRET_SCOPE_STR"},
        {"kind": "weekly_scoped", "percent": 7, "resets_at": "x", "scope": {"accountUuid": "SECRET_SCOPE_UUID"}},
        {"kind": "weekly_scoped", "percent": 9, "resets_at": "x", "scope": {"model": {"display_name": {"x": "SECRET_NAME_OBJ"}}}},
        42,
        null,
        "SECRET_STR_ENTRY"
      ]
    }
  }
}
EOF
run_hook "$tmp/hostile.json" "$PATH"
if grep -q "SECRET" "$out"; then fail "a hostile source leaked into the snapshot: $(cat "$out")"; fi
jq -e '.usage.fetched_at_ms == null and (.usage.limits | length == 4)' "$out" >/dev/null \
  || fail "the hostile source should give a null fetch time and four limits: $(cat "$out")"
jq -e '.usage.limits[0].scope == {"model": {"display_name": "Fa\"ble\nx"}} and ([.usage.limits[1:][].scope] == [null, null, null])' "$out" >/dev/null \
  || fail "scope should be the display name alone, or null: $(cat "$out")"

printf '{"cachedUsageUtilization": {"fetchedAtMs": 1, "utilization": {"limits": [42, {"kind": "weekly_all", "percent": 5, "resets_at": "2026-11-23T00:59:59+00:00", "scope": null}]}}}' > "$tmp/nonobject.json"
run_hook "$tmp/nonobject.json" "$PATH"
jq -e '.usage.limits | length == 1' "$out" >/dev/null || fail "a non-object entry should be skipped, not drop the rest: $(cat "$out")"

limit='{"kind": "weekly_all", "percent": 5, "resets_at": "2026-11-23T00:59:59+00:00", "scope": null}'
printf '{"cachedUsageUtilization": {"fetchedAtMs": 1, "utilization": {"limits": [%s]}}}\n{"cachedUsageUtilization": {"fetchedAtMs": 2, "utilization": {"limits": [%s, %s]}}}' \
  "$limit" "$limit" "$limit" > "$tmp/multi.json"
run_hook "$tmp/multi.json" "$PATH"
jq -e '.usage.fetched_at_ms == 1 and (.usage.limits | length == 1)' "$out" >/dev/null \
  || fail "a source with two JSON values should give the first one: $(cat "$out")"

for leftover in "$tmp"/claude-usage/latest.json.tmp.*; do
  [ -e "$leftover" ] && fail "the temp file $leftover was left behind"
done

echo ok
