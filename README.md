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

## Notes

- Nuxt entrypoint is `pages/index.vue`, which renders `src/views/HomeView.vue`.
- Domain configuration reference: <https://gist.github.com/plembo/84f80c920bb5ac6f19e53fe6f8db1ff7>
