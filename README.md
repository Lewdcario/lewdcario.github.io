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

## Unified Docker Stack

- Start all Docker services (Tor + remote signaling + nginx):
    - `yarn docker:up` (or `yarn yarn:docker`)
- Tail all Docker logs:
    - `yarn docker:logs`
- Stop/remove all Docker services started by the unified stack:
    - `yarn docker:down`

## Remote App Streaming PoC

- Start signaling + nginx gateway:
    - `yarn remote:up`
- Start Nuxt with remote defaults:
    - `yarn dev:remote`
- Viewer window:
    - Open the desktop icon `Remote App` (or Start menu -> `Open Remote Stream`)
- Host agent:
    - Open `http://localhost:3000/remote-host` on the machine that will share a window
    - Connect and click `Start sharing`
- Stop services:
    - `yarn remote:down`

By default the app uses WebRTC media and WebSocket signaling (`services/remote-signaling`) with nginx proxying `/signal/ws` on port `8080`.

## Notes

- Nuxt entrypoint is `pages/index.vue`, which renders `src/views/HomeView.vue`.
- Domain configuration reference: <https://gist.github.com/plembo/84f80c920bb5ac6f19e53fe6f8db1ff7>
