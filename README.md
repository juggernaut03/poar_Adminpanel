# Pawar Online — Admin Panel

Admin panel for **Pawar Online Retail LLP**. Manage the storefront's products and
website content (CMS). Built with **React + Vite + React Router** (hash routing)
with JWT-based admin authentication.

## Features (Phase 1 — Website)

- **Login** — JWT email/password auth
- **Dashboard** — product stats at a glance
- **Products** — full CRUD, image upload, Amazon URL, pricing, ratings, publish/feature flags
- **Website CMS** — edit site settings, home hero, and about content

The sidebar shows placeholders for upcoming phases (Amazon Shipment, Accounts,
Finance).

## Setup

Requires **Node 18+** and a running backend API.

```bash
cp .env.example .env   # set VITE_API_URL to your backend
npm install
npm run dev            # http://localhost:5174
```

Log in with the admin credentials created by the backend's seed script.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (port 5174) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` |

## Configuration

| Env var | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API (e.g. `http://localhost:4055/api`) |

## Deploy

`npm run build`, then serve `dist/` as a static site. The app uses **hash routing**,
so it works as plain static files without server rewrites.
