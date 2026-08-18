# Contributing to catpics

Thank you for your interest in contributing to catpics! Below are instructions on how to set up, develop, and build the project from source.

## Cloning the repository

```bash
git clone https://github.com/WiktorKijek/catpics.git
cd catpics
```

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) (version 20 or higher recommended)
- [pnpm](https://pnpm.io/installation) (version 10 or higher, or enable via `corepack enable`)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the local database

catpics uses Cloudflare D1 (SQLite). Apply migrations locally before starting the app:

```bash
pnpm db:migrate --local
```

> [!NOTE]
> Local migrations create and update a local SQLite database managed by Wrangler under `.wrangler/state/v3/d1`.

### 3. Start the development server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`.

## Development & Building

### Type checking & Validation

Run Svelte and TypeScript validation checks:

```bash
# Run all type checks (Wrangler types, SvelteKit sync, svelte-check, Service Worker types)
pnpm check

# Type checking in watch mode
pnpm check:watch
```

### Code Formatting

Format files using [oxfmt](https://oxc.rs/):

```bash
pnpm fmt
```

### Building for production

To generate Cloudflare worker types and compile the project with Vite:

```bash
pnpm build
```

### Previewing the production build locally

To test the Cloudflare worker bundle locally with Wrangler:

```bash
pnpm preview
```

### Updating Cloudflare Worker types

If you modify Cloudflare bindings or configuration in `wrangler.jsonc`:

```bash
pnpm gen
```

## Cloudflare Remote Deployment

If you are deploying your own remote instance of catpics:

1. **Create the D1 database**:
    ```bash
    pnpm wrangler d1 create catpics
    ```
2. **Update `wrangler.jsonc`**:
   Replace `database_id` under `d1_databases` with the generated UUID.
3. **Create the R2 bucket**:
    ```bash
    pnpm wrangler r2 bucket create catpics
    ```
4. **Apply migrations & deploy**:
    ```bash
    pnpm db:migrate
    pnpm deploy
    ```

# Code Editor setup

We recommend using [Visual Studio Code](https://code.visualstudio.com/) with the following extensions:

- [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) for Svelte 5 component syntax and IntelliSense
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) for Tailwind CSS autocomplete and linting
- [OXC](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode) for fast code formatting with oxfmt

# Techstack

- **Framework**: [SvelteKit 5](https://svelte.dev/) (Svelte 5 runes)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [daisyUI v5](https://daisyui.com/) (with [Catppuccin](https://github.com/catppuccin/daisyui))
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) with [Kysely](https://kysely.dev/) query builder
- **Object Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) for image storage
- **Runtime / Hosting**: [Cloudflare Workers](https://developers.cloudflare.com/workers/) via `@sveltejs/adapter-cloudflare`
- **Tooling**: [Vite](https://vite.dev/), [Wrangler](https://developers.cloudflare.com/workers/wrangler/), [oxfmt](https://oxc.rs/), [Valibot](https://valibot.dev/)
