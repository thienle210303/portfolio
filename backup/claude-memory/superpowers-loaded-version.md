---
name: superpowers-loaded-version
description: "The superpowers version this app actually loads is NOT in ~/.claude/plugins/cache — it lives in the desktop app's own plugin store, and the cache holds stale copies"
metadata:
  node_type: memory
  type: reference
  originSessionId: 65c6e2f8-d246-4d1a-a6b5-f58b33012a62
  modified: 2026-09-30T03:22:24.368Z
---

Editing a superpowers skill on this machine: the copy the Claude desktop app
loads is **6.4.1**, at

`~/AppData/Roaming/Claude/local-agent-mode-sessions/<uuid>/<uuid>/rpm/plugin_01JETPTMWTgidsotmEhVkQTG/skills/`

`~/.claude/plugins/cache/claude-plugins-official/superpowers/` holds only
**stale** 6.2.0 and 6.3.0. There is no install manifest naming a version, so
directory dates mislead — on 2026-09-29 I edited 6.3.0 there and the change was
inert.

**How to identify the loaded copy without guessing:** the SessionStart hook
injects the real `using-superpowers` text into context. Match a detail from it
against each candidate on disk. 6.4.1 references six platform files
(`claude-code-tools.md` … `muse-tools.md`); 6.2.0 has three, 6.3.0 four. Only
the loaded copy matches exactly.

`~/.codex/plugins/cache/` also holds superpowers (6.4.1 and 6.4.2) for Codex —
a different harness, not this session.

The app's copy is writable and survives across conversations, but it is
app-managed: a plugin update replaces it, so a local edit there is temporary.
Upstream is `github.com/obra/superpowers` (Jesse Vincent), whose PR template
sets a high bar — see [[sdd-followup-routing-evals]].

Careful: `grep` with `**` in the pattern treats `*` as a quantifier and silently
reports no match. Cost me a wrong conclusion about which anchors existed.
