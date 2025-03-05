# The Bot

This bot uses [DISCORD.JS](https://discord.js.org/docs/packages/discord.js/14.18.0) with Typescript to ensure maximum typesafety and clean codebase.

## Use these environment variables as needed

```sh
# Discord Bot Token
TOKEN=
# Thumbnail for embedded messages
THUMBNAIL=
# Timeout for memcache
CACHE_TTL=
# Max retry count for task Quee
DEFAULT_RETRIES=
# Delay between each retries for task Queue
DEFAULT_DELAY=

# Only Required if Dynamolocal is used
REGION=
ENDPOINT=
ACCESS_KEY_ID=
SECRET_ACCESS_KEY=
```

You will also see a `env.example` file in this directory.

## How to use

To run as development environment type in `pnpm dev` and hit enter. The dev server will boot up.

Run `pnpm build` to do production build.

And to start the production server run `pnpm start`

## Docker

This project comes with a `Dockerfile` which contains the production configuration for [Turborepo](https://turbo.build/) with [PNPM Workspace](https://pnpm.io/workspaces)

---

_Made with ❤️ by [Rakibul Yeasin](https://github.com/dreygur) from Bangladesh_
