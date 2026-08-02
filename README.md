# Portfolio

Windows XP-style portfolio rewrite with:

- Windows XP startup screen that transitions into login
- Desktop icons, taskbar, start menu, and tabbed window navigation
- Styling inspired by classic Windows XP desktop chrome

## Setup

1. Run `yarn install`
2. Run `yarn dev` to start Nuxt dev server
3. Run `yarn build` for production build
4. Run `yarn lint` to auto-fix lint issues
5. Run `yarn test:unit` for Vitest unit tests
6. Run `yarn test:e2e:dev` for Cypress against Nuxt dev server

## Tor Mode

- One command to start Tor proxy + Nuxt:
  - `yarn dev:tor`
- Manual Tor controls:
  - `yarn tor:up`
  - `yarn tor:logs`
  - `yarn tor:down`

This uses Docker Compose service `tor` from `docker-compose.yml` and routes Tor Browser mode through `socks5://127.0.0.1:9050`.

### Production Tor Renderer

Vercel cannot run the local Tor proxy, so production delegates Tor Browser mode to a Pi-hosted renderer over HTTPS.

1. Set the same secret in Vercel and on the Pi:
   - `TOR_RENDERER_TOKEN=<strong-random-token>`
2. Set this in Vercel:
   - `TOR_RENDERER_URL=https://tor-renderer.okami.codes`
3. On the Pi, run:
   - `docker compose up --build -d`

The compose stack keeps SOCKS bound to localhost/internal Docker, exposes the renderer only through Caddy, and requires the `x-tor-renderer-token` header for `/api/tor/render`.

## Notes

- Nuxt entrypoint is `pages/index.vue`, which renders `src/views/HomeView.vue`.
- Domain configuration reference: <https://gist.github.com/plembo/84f80c920bb5ac6f19e53fe6f8db1ff7>
