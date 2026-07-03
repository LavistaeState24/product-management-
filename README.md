# Operations CRM Foundation

Phase 1 foundation for a MERN-based purchase, sales, stock, and accounting CRM.

## Scope

Included in this phase:

- React + Vite frontend shell
- Tailwind theme tokens and reusable UI components
- Responsive sidebar, navbar, footer, dashboard, and error screens
- JWT login flow, auth context, logout, protected routes, and current-user hydration
- Express + MongoDB backend with Mongoose user model
- Role-based access control with seeded boss user

Explicitly excluded in this phase:

- Purchase module
- Sales module
- Stock module
- Payments module
- Reports module

## Project Structure

```text
root/
├── client/
└── server/
```

## Frontend Setup

```bash
cd client
copy .env.example .env
npm install
npm run dev
```

## Backend Setup

```bash
cd server
copy .env.example .env
npm install
npm run seed:boss
npm run dev
```

## Seeded Boss Account

- Email: `boss@operationscrm.com`
- Password: `Boss@12345`

## Default URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health API: `http://localhost:5000/api/health`
