# Repository Guidelines

## Project Structure & Module Organization
Core worker entrypoint at `src/index.ts` orchestrates scheduled and HTTP handlers. Request logic lives in `src/handlers/`, shared domain code in `src/services/`, and utilities in `src/utilities/`. GraphQL artifacts such as `graphql/nouns.gql` feed the Warpcast integration. Tests reside under `test/` with shared environment types in `test/env.d.ts`. Cloudflare setup files (`wrangler.toml`, `worker-configuration.d.ts`) define deployment parameters.

## Build, Test, and Development Commands
- `pnpm dev` — run the worker locally via `wrangler dev --test-scheduled` to exercise scheduled jobs.
- `pnpm build` — produce a deployable bundle into `dist/` with a dry-run deploy.
- `pnpm deploy` — push the worker to the configured Cloudflare account.
- `pnpm lint` — execute ESLint across the project.
- `pnpm cf-typegen` — refresh typed bindings from the Wrangler environment.

## Coding Style & Naming Conventions
TypeScript modules use ESM syntax with 2-space indentation (enforced by Prettier). Export default-free modules where possible; name handlers and services descriptively and always use kebab-case (e.g., `proposal-handler.ts`, `noun-action-service.ts`). Use `camelCase` for variables/functions, `PascalCase` for types and classes, and `SCREAMING_SNAKE_CASE` only for runtime constants. Run `pnpm lint` before commits; the ESLint + Prettier toolchain will catch formatting issues, while Husky/lint-staged enforce the same on staged files.

## Messaging Helpers
Use `resolveProposalBaseUrl`/`formatProposalLink` (`src/utilities/formatters/proposal-link.ts`) to build proposal URLs and `buildProposalReminderMessage` (`src/utilities/messages/proposal-reminder.ts`) when crafting voter reminders so call-to-actions stay consistent with `Vote now → <link>`. Configure the host via `PROPOSAL_BASE_URL` in `wrangler.toml` when the destination changes.

## Testing Guidelines
Vitest powers the suite; add new specs under `test/` with filenames ending in `.spec.ts`. Prefer high-level behavior checks that mirror the worker’s scheduled and request flows. Mock external APIs via helpers in `test/env.d.ts`, and keep fixtures colocated with the spec. Run `pnpm test` locally; target covering new branches introduced by your change.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`), mirroring the existing history (`ci(deps)`, `chore(release)`). Group related changes per commit and keep messages under 72 characters after the type/scope prefix. Pull requests should link the relevant Warpcast or GitHub issue, summarize observable behavior changes, and include test output or screenshots when touching user-visible functionality.

## Cloudflare Worker & Secrets
Never commit secrets; instead use `wrangler secret put SECRET_NAME` to provision them. Document required secrets in the PR description and ensure `wrangler.toml` stays in sync with any new bindings. When modifying schedules or triggers, explain the reasoning and include verification steps from `pnpm dev`.
