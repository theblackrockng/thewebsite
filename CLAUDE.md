# CLAUDE.md — Agent Instructions for The BlackRock Repo

## BUILD_STATUS.md maintenance rule

**Every agent that completes a task in this repo must update `BUILD_STATUS.md` before finishing.**

What to update:

- **Build History** — add a row for any new feature, fix, or significant refactor (commit hash + short description).
- **Architecture Map** — if you added a page, route, API endpoint, context, table, or integration, add it to the relevant section. If you removed one, remove it.
- **Gaps** — if you closed a gap, remove its entry. If you introduced a new gap (incomplete implementation, stubbed feature), add it.
- **Known Issues** — if you fixed an issue, remove it. If you introduced a known edge case or left something unfinished, add it.
- **Next Steps** — promote items from "needs a decision" to "safe to build" when the decision has been made. Remove items that are now done.

You do not need to rewrite sections wholesale. Targeted additions and removals are enough.

**Rule: if you changed code and did not update BUILD_STATUS.md, the task is not done.**

---

## Project conventions

- Commits: concise imperative message, no `Co-Authored-By` trailers.
- Push: use `git push main-website <branch>` — never `git push origin`.
- No comments in code unless the _why_ is non-obvious.
- No new files unless the task explicitly requires them.
- No error handling for scenarios that cannot happen.
- No backwards-compat shims for removed code.
