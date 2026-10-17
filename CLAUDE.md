# CLAUDE.md

Guidance for Claude Code when working in `004_Shazanguage`. Part of Mike Dawson's product portfolio (https://mike-dawson.vercel.app/product).

## Rules

- **Start from the latest `main`.** At the start of every session, before doing anything else, run `git checkout main && git pull`. If there are uncommitted changes or unpushed commits, don't switch: say what's there and ask first. In a worktree where `main` is checked out elsewhere, run `git fetch origin` and branch from `origin/main`.
- **Never push to `main`.** Work on a branch and open a PR to `main`.
- **Clean up merged branches.** After a PR is merged, delete its branch locally and on GitHub.
