# CLAUDE.md

Context for working in `apps/web` (formerly the standalone `pizzaria-cumaru-frontend` repo) — the web SPA for a pizzeria management system ("Pizzaria Cumaru"). React 19 + TypeScript + Vite, consuming the REST API of `apps/api` (NestJS, JWT auth). Screens are organized by bounded context (`auth`, `waiter`, `kitchen`, `manager`) and driven by the Gherkin specs in the repo-root `features/`; the routes table in [01-project-context.md](.claude/rules/01-project-context.md) is the current status of each one — only the `/manager` hub is still a placeholder, and split bill is the flow still missing. Remaining debt and open design questions live in [08-conventions.md](.claude/rules/08-conventions.md).

This file is an index. The rules live in `.claude/rules/`, one file per topic, each with ✅/❌ examples. Read the ones relevant to the task before writing code.

@.claude/rules/01-project-context.md
@.claude/rules/02-testing.md
@.claude/rules/03-javascript.md
@.claude/rules/04-typescript.md
@.claude/rules/05-comments.md
@.claude/rules/06-react.md
@.claude/rules/08-conventions.md
