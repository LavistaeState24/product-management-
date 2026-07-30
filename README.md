# Operations CRM

MERN-based purchase, sales, stock, payments, reporting, and accounting CRM.

## Project Structure

```text
root/
  client/   React + Vite frontend
  server/   Express + MongoDB backend
```

## Environment Model

The same codebase runs locally and in production. Do not edit source code when
switching environments; change only environment variables.

Local development:

- `server/.env` contains local backend values.
- `client/.env` contains the local frontend API URL.
- Local Mongo should use a development database such as
  `operations-crm-dev`.

Production:

- Render should provide backend env vars in its dashboard.
- Vercel should provide frontend env vars in its dashboard.
- Production Mongo should use a separate Atlas database or cluster.
- Do not deploy local `.env` files.

## Backend Environment

Copy the local template:

```bash
cd server
copy .env.example .env
```

Required backend variables:

<!-- ```text
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/operations-crm-dev
JWT_SECRET=super-secret-change-me
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
``` -->

For Render production, set at least:

```text
NODE_ENV=production
JWT_SECRET=<strong production secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend.vercel.app
AWS_REGION=<bucket region>
AWS_S3_BUCKET=<bucket name>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
```

`MONGO_URL` is accepted as a compatibility alias, but `MONGO_URI` is preferred.
If your MongoDB Atlas username or password contains special characters, URL
encode them before placing them in `MONGO_URI`.

## Frontend Environment

Copy the local template:

```bash
cd client
copy .env.example .env
```

Local:

```text
VITE_API_BASE_URL=http://localhost:5000/api
```

For Vercel production:

```text
VITE_API_BASE_URL=https://your-render-api.onrender.com/api
```

## Local Setup

Backend:

```bash
cd server
npm install
npm run seed:boss
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

## Seeded Boss Account

For production, set `BOSS_EMAIL` and `BOSS_PASSWORD` before running
`npm run seed:boss`.

## Default Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health API: `http://localhost:5000/api/health`
