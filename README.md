# OhMyGantt

> Project planning on a Gantt chart. Turn GitHub Projects, manual task lists, or Trello boards into interactive timelines.

OhMyGantt is a project-planning tool that renders Gantt timelines from three different data sources: GitHub Projects v2 (via OAuth), hand-created manual projects, and imported Trello boards. It combines an interactive Gantt view with a metrics view (burndown, velocity, status breakdown) and lets you export any timeline as a self-contained HTML file. A small Bun server handles GitHub OAuth and the GraphQL proxy so your access token never reaches the browser.

## Features

- **GitHub Projects v2 Gantt** — sign in with GitHub OAuth, pick a project from your dashboard, and get bars derived from custom fields (status, iteration, dates, milestones, labels, assignees, progress)
- **Interactive timeline** — Gantt rows and bars with progress, dependencies, codes and assignees; filter by status, assignee, iteration, milestone or code
- **Metrics view** — burndown, velocity and status-donut charts per project (Recharts)
- **Manual projects** — create projects with tasks (todo / in progress / done, start and end dates, dependencies), edit them in a dedicated editor, and share them via generated links
- **Trello import** — paste a board URL, and cards are mapped to Gantt items (list names become statuses, due dates become the timeline) and stored in SQLite
- **Export** — download any Gantt as a single self-contained HTML file with no dependencies
- **Security-first OAuth** — GitHub OAuth flow with httpOnly, SameSite=Strict session cookies, an in-memory session store, and a GraphQL proxy that keeps the token server-side; CORS is locked to the configured app origin

## Tech stack

- React 19 + TypeScript (strict)
- Vite
- TailwindCSS v4
- Radix UI primitives (shadcn-style components)
- TanStack Query v5 (server state)
- React Router v7 (routing)
- Recharts (metrics charts)
- Motion (animations)
- Lucide icons
- Bun runtime server (`Bun.serve`) with `bun:sqlite`
- OxLint for linting

## Getting started

Requires [Bun](https://bun.sh). Copy `.env.example` to `.env` and fill in your GitHub OAuth app credentials:

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SESSION_SECRET=...        # random, 32+ chars
PORT=3000
VITE_APP_URL=http://localhost:5173
```

Then start both the server and the client:

```bash
bun install
bun dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server runs the Bun API on port 3000 and the Vite client on 5173, with `/api/*` proxied to the backend.

## Scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `bun dev`              | Run API server and Vite client together  |
| `bun run dev:client`   | Vite dev server only                     |
| `bun run dev:server`   | Bun API server with hot reload           |
| `bun run build`        | Production build to `dist/`              |
| `bun run start`        | Serve the production build with Bun      |
| `bun run typecheck`    | Run `tsc -b`                             |
| `bun run lint`         | Run OxLint on `src/`                     |

---

Part of the OhMy suite: OhMyForms, OhMyDocs, OhMyMail, OhMyGrid, OhMyCharts, OhMyGantt. A family of small, focused productivity tools.
