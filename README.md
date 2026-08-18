# PulseWatch

Self-hosted API uptime monitoring with incident tracking, email alerts, public status pages, and Dockerized deployment.

![CI](https://github.com/ozgeegungordu/pulse-watch/actions/workflows/ci.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-4FC08D?logo=vuedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)


PulseWatch is a full-stack monitoring platform for public HTTP endpoints. It continuously checks endpoint availability, tracks response times, records incidents and recoveries, sends email notifications, and exposes public status pages for selected monitors.

## Screenshots

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### Monitor details

![Monitor details](docs/screenshots/monitor-details.png)

### Public status page

![Public status page](docs/screenshots/public-status.png)

### Sign in

![Sign in](docs/screenshots/login.png)

## Features

- JWT-based registration and authentication
- Create, pause, resume, check, and delete monitors
- Automatic background endpoint checks
- UP, DOWN, PAUSED, and pending monitor states
- Response-time history and dashboard metrics
- Incident creation and automatic recovery tracking
- 24-hour uptime and response statistics
- Email notification channels with SMTP
- Public status pages without authentication
- PostgreSQL persistence through Prisma
- SSRF protection for monitor URLs
- Dockerized production deployment with Nginx
- Application and database health checks
- Responsive dashboard and authentication UI
- Automated API and web tests
- GitHub Actions CI pipeline

## Architecture

```mermaid
flowchart LR
    Browser[Browser] --> Nginx[Nginx / Web]
    Nginx --> Vue[Vue 3 Frontend]
    Nginx --> API[NestJS API]
    API --> Prisma[Prisma ORM]
    Prisma --> Postgres[(PostgreSQL)]
    API --> Scheduler[Monitor Scheduler]
    Scheduler --> Targets[Public HTTP Endpoints]
    API --> SMTP[SMTP Provider]
```

The production stack uses Nginx as the public entry point. Frontend traffic is served by the web container, while `/api/*` requests are proxied to the NestJS API.

Additional architecture notes are available in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Tech Stack

### Frontend

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Vitest

### Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT authentication
- Nodemailer
- Swagger / OpenAPI

### Infrastructure

- Docker
- Docker Compose
- Nginx
- GitHub Actions

## Project Structure

```text
pulse-watch/
├── api/
│   ├── prisma/
│   ├── src/
│   └── test/
├── web/
│   ├── public/
│   └── src/
├── docs/
│   └── screenshots/
├── scripts/
├── .github/
│   └── workflows/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.production.example
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 22.12+
- npm
- Docker
- Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/ozgeegungordu/pulse-watch.git
cd pulse-watch
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the development environment

```bash
npm run setup
```

The setup script:

- creates local API and web environment files from their example files
- starts PostgreSQL with Docker Compose
- generates the Prisma client
- applies database migrations

### 4. Start PulseWatch

```bash
npm run dev
```

The web application is available at:

```text
http://localhost:5173
```

The API is available at:

```text
http://localhost:3000/api
```

Swagger documentation is available at:

```text
http://localhost:3000/docs
```

## Development Commands

Start both the API and frontend:

```bash
npm run dev
```

Start only the API:

```bash
npm run dev:api
```

Start only the frontend:

```bash
npm run dev:web
```

Start PostgreSQL:

```bash
npm run db:up
```

Stop PostgreSQL:

```bash
npm run db:down
```

Generate the Prisma client:

```bash
npm run db:generate
```

Apply database migrations:

```bash
npm run db:deploy
```

Open Prisma Studio:

```bash
npm run db:studio
```

## Production with Docker

Create a production environment file from the provided example:

```bash
cp .env.production.example .env.production
```

Update the values in `.env.production` before starting the production stack.

Build and start the application:

```bash
npm run prod:up
```

Check container status:

```bash
npm run prod:ps
```

View production logs:

```bash
npm run prod:logs
```

Stop the production stack:

```bash
npm run prod:down
```

The production web application is available at:

```text
http://localhost:8080
```

The health endpoint is available through Nginx at:

```text
http://localhost:8080/api/health
```

The production startup flow runs database migrations before the API starts.

## Environment Configuration

PulseWatch uses environment variables for database access, authentication, frontend configuration, monitoring behavior, and optional email delivery.

Typical production configuration includes:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
JWT_SECRET=replace-with-a-long-random-secret

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=PulseWatch <notifications@example.com>
```

Never commit real passwords, JWT secrets, SMTP credentials, or production environment files.

Only sanitized example environment files should be committed to the repository.

## Monitoring

PulseWatch periodically checks configured public HTTP endpoints and stores the results in PostgreSQL.

Each check can record information such as:

- endpoint availability
- HTTP status code
- response time
- check timestamp
- failure state

Monitor history is used to calculate uptime statistics and populate response-time charts.

## Incident Tracking

When a monitored endpoint transitions into a failure state, PulseWatch can create an incident.

When the endpoint becomes healthy again, the incident is automatically resolved.

Incident history is visible in both authenticated monitor views and public status pages.

## Email Notifications

PulseWatch supports SMTP-based email notification channels.

Notification channels can be created and tested from the Notifications page.

When SMTP is configured correctly, PulseWatch can deliver status-related notifications through the configured email provider.

For Gmail, use a Google App Password instead of your normal account password.

## Public Status Pages

Individual monitors can expose an optional public status page.

Public pages include:

- current service status
- latest HTTP status code
- 24-hour uptime
- average response time
- latest response time
- response-time chart
- incident history

Public status pages do not require authentication.

## Security

PulseWatch includes protections designed for a monitoring platform that accepts user-provided URLs.

### SSRF Protection

Monitor targets are validated before outbound requests are made.

Unsafe destinations are rejected, including common cases such as:

```text
localhost
127.0.0.1
private network IP ranges
file:// URLs
```

This reduces the risk of using the monitoring service to access local or internal network resources.

### Input Validation

The API uses global validation with whitelisting enabled. Unexpected request fields are rejected before reaching application logic.

### Secret Handling

Real credentials should never be committed to Git.

Files containing local and production secrets are ignored, while sanitized example files document the required configuration.

### Production Runtime

The production Docker flow separates database migration work from the main API runtime and verifies the compiled application before the runtime image is completed.

## Health Check

PulseWatch exposes a health endpoint for checking application and database availability:

```text
GET /api/health
```

Development:

```text
http://localhost:3000/api/health
```

Production through Nginx:

```text
http://localhost:8080/api/health
```

A healthy response indicates that both the PulseWatch API and PostgreSQL connection are available.

## API Documentation

PulseWatch exposes Swagger documentation for the NestJS API.

During development:

```text
http://localhost:3000/docs
```

The documentation includes the API endpoints and bearer authentication configuration.

## Testing

Run all API and web tests:

```bash
npm run test
```

Run lint and type checks:

```bash
npm run lint
```

Run a full production build:

```bash
npm run build
```

All three commands should complete successfully before merging or publishing changes.

## Continuous Integration

The repository includes a GitHub Actions CI workflow.

For pushes to `main` and pull requests, CI:

1. starts PostgreSQL 17
2. installs dependencies
3. generates the Prisma client
4. applies database migrations
5. runs lint checks
6. runs automated tests
7. builds the application

This ensures the API, frontend, Prisma schema, and database migrations are validated together.

## Useful Commands

```bash
npm run setup
npm run dev
npm run dev:api
npm run dev:web
npm run lint
npm run test
npm run build
npm run db:up
npm run db:down
npm run db:generate
npm run db:deploy
npm run db:studio
npm run doctor
npm run prod:up
npm run prod:down
npm run prod:logs
npm run prod:ps
npm run prod:config
```

## Why PulseWatch?

PulseWatch was built as a practical full-stack engineering project rather than a simple CRUD application.

It combines:

- scheduled background work
- HTTP monitoring
- networking and SSRF concerns
- persistent application state
- authentication
- incident lifecycle management
- notification delivery
- public-facing status pages
- API documentation
- automated testing
- CI
- containerized deployment

The goal is to demonstrate how multiple backend, frontend, infrastructure, and security concerns can be combined into a cohesive monitoring platform.

## License

This project is licensed under the MIT License.

Copyright © 2026 Özge Güngördü.

See [`LICENSE`](LICENSE) for details.
