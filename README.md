# Text Tools

Visual pipeline editor for text transforms. Chain JavaScript steps, reorder them with drag-and-drop, and keep pipelines in localStorage.

**Live:** [text-tools.w-ilyas.site](https://text-tools.w-ilyas.site)

## Features

- Multiple named pipelines (`/` and `/pipeline/:id`)
- Sortable transformation steps (mute, reorder, library templates)
- Monaco editor with helpers (`upper`, `lower`, `trim`, …)
- Client-side only — state persisted in localStorage

## Stack

pnpm, Vite, React 19, React Router 8, Monaco, @dnd-kit, Framer Motion, Tailwind CSS.

## Run locally

```bash
cd frontend
pnpm install
pnpm dev
```

## Deploy

Push to `master` builds the Vite app and deploys over SSH, then reloads the Caddy site config.

Agent notes: see [`CLAUDE.md`](./CLAUDE.md).
