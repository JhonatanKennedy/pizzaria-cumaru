# Pizzaria Cumaru — Frontend

Web SPA for the pizzeria management system. Consumes the REST API of [`pizzaria-cumaru-backend`](../pizzaria-cumaru-backend/).

## Stack

React 19 · TypeScript 6 · Vite 8 · React Router 8 · TanStack Query 5 · React Hook Form 7 + Zod 4 · Tailwind CSS 4 · Vitest 5 + Testing Library · oxlint · Prettier

## Getting started

```sh
npm install
cp .env.example .env.local   # set VITE_API_URL if the backend is not on :3000
npm run dev                  # http://localhost:5173
```

The backend must be running (`npm run start:dev` there) for any real data. Seeded profiles: `ana.gerente` (Manager), `joao.garcom` (Waiter), `carlos.cozinha` (Cook) — password `SenhaSegura123`.

## Commands

| Command              | Purpose                            |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Dev server with HMR                |
| `npm run build`      | Type-check + production build      |
| `npm test`           | Unit + component tests (Vitest)    |
| `npm run test:watch` | Vitest in watch mode               |
| `npm run lint`       | oxlint                             |
| `npm run format`     | Prettier write over `src/`         |
| `npm run preview`    | Serve the production build         |

## Structure and conventions

Screens trace back to the Gherkin specs in `features/`. The app is divided into bounded contexts under `src/pages/` — each context owns its screens, business rules, API calls and specs; shared UI lives in `src/components/`, assembly in `src/infra/`. The full architecture, route table and coding rules live in [CLAUDE.md](CLAUDE.md) and `.claude/rules/`.
