# CLAUDE.md

Guidance for Claude Code when working in `004_Shazanguage`. Part of Mike Dawson's product portfolio (https://mike-dawson.vercel.app/product).

## Shared rules

These rules are the same in every one of Mike's prototype repos. Change them in all repos together.

**Read before building**
- **Read `README.md` first.** It's the agreed product brief. Build within its v1 scope and non-goals.
- **Flag drift.** If a request conflicts with the README or seems to drift from its focus, say so before building.
- **Challenge the thinking.** Question the problem, the users and the solution, rather than accepting them as given.

**Git and GitHub**
- **Start from the latest `main`.** At the start of every session, run `git checkout main && git pull`. If there are uncommitted changes or unpushed commits, don't switch: say what's there and ask first. In a worktree where `main` is checked out elsewhere, run `git fetch origin` and branch from `origin/main`.
- **Never push to `main`.** Work on a branch and open a PR to `main`.
- **Mike approves every merge.** Never merge without his say-so.
- **Clean up merged branches.** After a PR is merged, delete its branch locally and on GitHub.

**Jira**
- **Jira key first.** Where the repo has a Jira key, branch names and commit messages start with it.
- **Jira comments.** Start every Jira comment with `(via Claude)`.

**Keeping the README current**
- **Update it in the same PR.** When a change affects scope, status, tech approach or roadmap, update `README.md` as part of that PR.
- **Review checkpoints.** At the end of each version or major milestone, ask Mike to review the README and the product's focus before starting the next one.

**Security**
- **Never commit secrets.** No credentials, API keys or tokens, and no personal data such as real financial figures, account details or other people's information.
- **These repos are public.** Use fake sample data in the repo.
