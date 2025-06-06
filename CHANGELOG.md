# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-alpha.33] - 2025-06-06

### 🐛 Bug Fixes

- *(config)* Update `WARPCAST_BASE_URL` to new endpoint

## [1.0.0-alpha.32] - 2025-04-05

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.31] - 2025-03-24

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.30] - 2025-03-15

### ⚙️ Miscellaneous Tasks

- *(dependabot)* Add time and timezone to update schedule

## [1.0.0-alpha.29] - 2025-02-27

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.28] - 2025-02-20

### ⚙️ Miscellaneous Tasks

- *(env)* Add node version specification files

## [1.0.0-alpha.27] - 2025-01-26

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.26] - 2025-01-26

### 🚀 Features

- *(logger)* Enhance log formatting with custom serializer

## [1.0.0-alpha.25] - 2025-01-26

### 🚀 Features

- *(warpcast)* Add support for `PATCH` HTTP method
- *(warpcast)* Add `getUserByFid` to fetch user by FID
- *(warpcast)* Add `getUserByUsername` to fetch user data
- *(warpcast)* Add `StarterPack` type definition
- *(warpcast)* Extend `ViewerContext` with new properties
- *(services)* Add `connectedAccounts` to user type
- *(services)* Add `getStarterPacks` for fetching starter packs
- *(warpcast)* Add `getStarterPackUsers` to fetch users list
- *(handlers)* Add `starterPackHandler` for user management
- *(handlers)* Add `starterPackHandler` to daily cron jobs
- *(warpcast)* Add `createStarterPack` service function
- *(warpcast)* Add `getStarterPack` method for starter pack details
- *(warpcast)* Add `updateStarterPack` function
- *(handler)* Enhance starter pack handling logic
- *(handlers)* Add `starterPackHandler` to hourly cron schedule

### 🐛 Bug Fixes

- *(warpcast)* Update `Bio` interface types for mentions

### 🚜 Refactor

- *(handlers)* Modularize starter pack logic

### ⚙️ Miscellaneous Tasks

- *(worker)* Add `LOG_LEVEL` and `NODE_ENV` to configuration

## [1.0.0-alpha.24] - 2025-01-25

### 🐛 Bug Fixes

- *(cache-handler)* Correct time calculation for block range

### 🚜 Refactor

- *(logger)* Enhance logger configuration

### ⚙️ Miscellaneous Tasks

- *(config)* Add `LOG_LEVEL` to wrangler config

## [1.0.0-alpha.23] - 2025-01-25

### 🚜 Refactor

- *(logger)* Simplify logger configuration

## [1.0.0-alpha.22] - 2025-01-21

### 🚜 Refactor

- *(queue-handler)* Replace `console` with `logger`
- *(channel-handler)* Replace `logDebug` with `logger`
- *(scheduled-handler)* Replace `console.log` with `logger.info`

## [1.0.0-alpha.21] - 2025-01-21

### 🚀 Features

- *(ethereum)* Add `getBlockTimestamp` service function
- *(services)* Add `getProposals` function for fetching proposals
- *(utilities)* Add custom `logger` with pino integration
- *(handlers)* Add `proposalHandler` to process proposals
- *(handlers)* Add daily proposal handling at 14:00
- *(warpcast)* Add `getDirectCastConversations` function
- *(handlers)* Add `directCastsHandler` for managing casts
- *(scheduled-handler)* Add `directCastsHandler` cron job
- *(services)* Add `getFollowers` method to fetch user followers
- *(proposal-handler)* Filter recipients by followers list
- *(services)* Add `sendDirectCast` function to Warpcast
- *(queue-handler)* Add support for direct cast tasks

### 🚜 Refactor

- *(cache-handler)* Add logging and improve clarity
- *(proposal-handler)* Rename `subscribers` to `voters`
- *(proposal-handler)* Improve recipient filtering logic

### ⚙️ Miscellaneous Tasks

- *(config)* Add new cron triggers to `wrangler.toml`

## [1.0.0-alpha.20] - 2025-01-21

### ⚙️ Miscellaneous Tasks

- *(config)* Set `workers_dev` to false in `wrangler.toml`

## [1.0.0-alpha.19] - 2025-01-21

### ⚙️ Miscellaneous Tasks

- *(workflows)* Remove deploy and publish workflow

## [1.0.0-alpha.18] - 2025-01-21

### 🚜 Refactor

- *(channel-handler)* Process batches in chunks

## [1.0.0-alpha.17] - 2025-01-21

### ⚙️ Miscellaneous Tasks

- *(workflows)* Remove `pnpm` version specification

## [1.0.0-alpha.16] - 2025-01-20

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.15] - 2025-01-15

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.14] - 2025-01-10

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.13] - 2025-01-04

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.11] - 2024-12-11

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.10] - 2024-12-04

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.9] - 2024-11-25

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.8] - 2024-10-13

### 🐛 Bug Fixes

- Solve some minor issues and update dependencies

## [1.0.0-alpha.7] - 2024-10-07

### ⚙️ Miscellaneous Tasks

- *(wrangler)* Enable Workers Logs observability

## [1.0.0-alpha.6] - 2024-10-01

### 🚀 Features

- *(warpcast)* Add a function to create a new cast

### 🚜 Refactor

- *(cache-handler)* Split cache functions
- *(cache-handler)* Simplify cache key retrieval

## [1.0.0-alpha.5] - 2024-09-28

### 🚀 Features

- *(handlers)* Add pagination to noun feed items
- *(handlers)* Add debug logging and adjust fetching logic

### 🐛 Bug Fixes

- *(neynar)* Limit cast results to 200

### 🚜 Refactor

- *(scheduled-handler)* Remove 5-minute cron job
- *(neynar)* Streamline `fetchFarcasterFeed` logic
- *(channel-handler)* Update to new API methods

## [1.0.0-alpha.4] - 2024-09-28

### 📚 Documentation

- Update project `README` file

### ⚙️ Miscellaneous Tasks

- *(deploy)* Add `NEYNAR_API_KEY` to environment variables

## [1.0.0-alpha.3] - 2024-09-28

### 🚀 Features

- *(queue-handler)* Add reactions processing

## [1.0.0-alpha.2] - 2024-09-28

### 🚀 Features

- *(neynar)* Add `fetchFarcasterFeed` for channel feeds
- *(services)* Add `getMe` function to warpcast service
- *(services)* Add `fetchFarcasterCastReactions` method

### 🐛 Bug Fixes

- *(channel-handler)* Update feed fetching logic

### 🚜 Refactor

- *(services)* Use `const` instead of `let` for `url`
- *(channel-handler)* Optimize cast like processing
- *(channel-handler)* Replace `getCastLikes` with `fetchFarcasterCastReactions`

### 📚 Documentation

- *(README)* Add badges and project warning

### ⚙️ Miscellaneous Tasks

- *(config)* Add `NEYNAR_API_URL` and `NEYNAR_API_KEY`
- *(deploy)* Add `NEYNAR_API_KEY` to secrets

## [1.0.0-alpha.1] - 2024-09-28

### 🚀 Features

- *(warpcast)* Add new services for recasts, likes, and users
- *(nouns)* Add fetching functions for accounts, delegates, and voters
- *(ethereum)* Add functionality to retrieve block number
- *(cache-handler)* Add caching for Nouns data
- *(handlers)* Add `channel-handler` with nouns channel support
- *(scheduled-handler)* Implement cron-based execution

### 🐛 Bug Fixes

- *(scheduler)* Update cron triggers and handlers

### 🚜 Refactor

- *(worker-configuration)* Switch to `Env` interface
- *(channel-handler)* Optimize reaction processing

## [1.0.0-alpha.0] - 2024-09-28

### 🚀 Features

- *(handlers)* Add entry points for queue and scheduled tasks
- *(handlers)* Add `scheduledHandler` for scheduled tasks
- *(queue-handler)* Add initial `queueHandler` function

### 📚 Documentation

- *(templates)* Add issue templates for bugs and features

### 🧪 Testing

- *(cloudflare)* Add tests for scheduled handler

### ⚙️ Miscellaneous Tasks

- *(graphql)* Add GraphQL schema definition for Nouns
- *(ci)* Add `stale.yml` for stale issue automation
- *(ci)* Add funding config for GitHub and custom platform
- *(dependabot)* Add configuration for dependency updates
- *(workflow)* Add build pipeline for CI/CD
- *(workflows)* Add deploy workflow for production releases
- *(git-flow)* Add workflow for automated PR creation
- *(husky)* Add pre-commit hooks for linting and testing
- *(config)* Add .editorconfig for consistent code style
- *(license)* Add Apache License 2.0

<!-- generated by git-cliff -->
