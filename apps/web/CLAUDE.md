# CLAUDE.md

Context for working in `apps/web` (formerly the standalone `pizzaria-cumaru-frontend` repo) — the web SPA for a pizzeria management system ("Pizzaria Cumaru"). React 19 + TypeScript + Vite, consuming the REST API of `apps/api` (NestJS, JWT auth). Login is implemented end-to-end (React Hook Form + Zod → role-guarded routes); the remaining screens are placeholders organized by bounded context (see 01-project-context), driven by the Gherkin specs in the repo-root `features/`. Remaining debt and open design questions live in [08-conventions.md](.claude/rules/08-conventions.md).

This file is an index. The rules live in `.claude/rules/`, one file per topic, each with ✅/❌ examples. Read the ones relevant to the task before writing code.

@.claude/rules/01-project-context.md
@.claude/rules/02-testing.md
@.claude/rules/03-javascript.md
@.claude/rules/04-typescript.md
@.claude/rules/05-comments.md
@.claude/rules/08-conventions.md
