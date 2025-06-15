# Discord Regex REST API

This is a REST API service built with [Hono](https://hono.dev/), a small, simple, and ultrafast web framework for the Edge.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (recommended package manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/discord-regex.git
cd discord-regex
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy the environment variables file:
```bash
cp apps/rest/.env.example apps/rest/.env
```

4. Configure the environment variables in `.env` file according to your setup.

## Development

To start the development server:

```bash
pnpm --filter rest dev
```

The server will start on `http://localhost:3000` by default.

## Production

To build the application for production:

```bash
pnpm --filter rest build
```

To start the production server:

```bash
pnpm --filter rest start
```

## Docker

You can also run the application using Docker:

```bash
docker compose up rest
```

## License

MIT