---
name: Pushing to GitHub when Git pane + manual PATs fail
description: Reliable way to push commits to GitHub from this repl when the Replit Git pane hangs and user-supplied PATs are rejected.
---

# Pushing to GitHub when the UI/PAT paths fail

When the user's Replit Git pane hangs (spins forever on Push, across multiple
devices) and `git push` from bash fails for auth, the most reliable path is the
**Replit GitHub connector** (integrations), NOT a manually generated PAT.

**Why:** Manually generated classic PATs (`ghp_...`, 40 chars, correct format)
were rejected by GitHub with `401` on `api.github.com/user` three times in a row,
even though the value verifiably changed each time (different sha256 fingerprints)
and reached bash cleanly. Root cause never pinned down, but the connector token
worked immediately. Bash DOES receive newly-added/updated Replit secrets in fresh
shells (confirmed via fingerprint change), so a stale-env theory was ruled out.

**How to apply:**
1. `searchIntegrations("GitHub")` → connector `ccfg_github_*` (status not_setup).
2. `proposeIntegration(connectorId)` → user completes OAuth (a popup flow that
   works even when the Git pane hangs).
3. In code_execution: `const conns = await listConnections('github')`. The token
   is at `conns[0].settings.access_token` (40-char `gho_`-style). NEVER print it.
4. Push from code_execution with child_process, masking the token in output:
   `git push "https://x-access-token:${token}@github.com/<owner>/<repo>.git" main`
5. Non-force fast-forward pushes are fine to run directly.

Repo here: `tontineinvestmenty-alt/miapp`, branch `main`.
