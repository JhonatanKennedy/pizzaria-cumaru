# CLAUDE.md

Context for working in `apps/api` (formerly the standalone `pizzaria-cumaru-backend` repo) — the NestJS backend for a pizzeria management system ("Pizzaria Cumaru"). Orders, catalog, tables, and users flows run end-to-end — HTTP controller → use-case → domain aggregate → repository interface → Prisma — with JWT auth, class-validator DTOs, and a global error filter. Kitchen is a thin context that drives order items through the orders use-cases. Two use-cases remain stubbed (`SplitBillUseCase`, `CreateDeliveryOrderUseCase`); remaining debt and open design questions live in [08-conventions.md](.claude/rules/08-conventions.md).

This file is an index. The rules live in `.claude/rules/`, one file per topic, each with ✅/❌ examples. Read the ones relevant to the task before writing code.

@.claude/rules/01-project-context.md
@.claude/rules/02-testing.md
@.claude/rules/03-javascript.md
@.claude/rules/04-typescript.md
@.claude/rules/05-nestjs.md
@.claude/rules/06-domain.md
@.claude/rules/07-prisma.md
@.claude/rules/08-conventions.md
@.claude/rules/09-comments.md
