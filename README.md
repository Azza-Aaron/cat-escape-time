# cat-escape-time

Cat Escape game with a TypeScript API and Postgres high-score storage.

## Local development

- Run `npm run dev` from the repo root.
- This starts Postgres + API in Docker and the Vite client locally.
- API health check: `http://127.0.0.1:3001/health`

## Production deployment (Railway)

Deploy this repo as **two Railway services** plus Railway Postgres:

1. `api` service
   - Root directory: `server`
   - Build: Dockerfile (`server/Dockerfile`)
   - Start command is from Dockerfile (`node dist/index.js`)
2. `web` service
   - Root directory: repo root
   - Dockerfile path: `web/Dockerfile`
3. Add a Railway Postgres database

### Required environment variables

`api` service:
- `DATABASE_URL` = Postgres connection string from Railway
- `CORS_ORIGIN` (optional) = web app public URL for stricter CORS

`web` service:
- `API_UPSTREAM` = private URL of the `api` Railway service
  - Example: `http://${{api.RAILWAY_PRIVATE_DOMAIN}}`

Notes:
- The API now self-initializes DB schema (`high_scores` table + index) at startup.
- Client can optionally use `VITE_API_BASE_URL` at build time, but default same-origin `/api` is preferred behind nginx proxy.
