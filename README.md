# catpics

Social platform for sharing cat pictures, keeping daily streaks, and commenting.

Built with SvelteKit 5 and runs serverless on Cloudflare Workers. Uses Cloudflare D1 (SQLite) for database persistence and Cloudflare R2 for photo storage.

## Features

- Infinite scrolling photo feed
- Cat photo uploads with client-side cropping
- Likes, bookmarks, comments, and user profiles
- Daily post streak tracking

## Development

Needs [Node.js](https://nodejs.org/) (v20+) and [pnpm](https://pnpm.io/).

```bash
# Install dependencies
pnpm install

# Apply local D1 database migrations
pnpm db:migrate --local

# Start development server
pnpm dev
```

The app will run locally at `http://localhost:5173`. Local migrations apply to a local SQLite database managed by Wrangler under `.wrangler/state/v3/d1`.

## Deployment

Deployed to Cloudflare Workers using `@sveltejs/adapter-cloudflare`.

### 1. Cloudflare Resources Setup

If deploying to your own Cloudflare account for the first time, create the D1 database and R2 bucket:

```bash
# 1. Create the remote D1 database
pnpm wrangler d1 create catpics

# 2. Create the R2 bucket for photo storage
pnpm wrangler r2 bucket create catpics
```

Copy the generated `database_id` from the command output and update it in [`wrangler.jsonc`](wrangler.jsonc):

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "catpics",
    "database_id": "<YOUR_D1_DATABASE_ID>"
  }
]
```

### 2. Apply Migrations & Deploy

```bash
# Apply database migrations to remote D1
pnpm db:migrate

# Build and deploy worker
pnpm deploy
```

To test the production worker locally before deploying:

```bash
pnpm preview
```

## Contributing

If you want to contribute to the project, start by reading the [contributing guide](.github/CONTRIBUTING.md).
