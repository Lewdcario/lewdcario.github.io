# Portfolio

Windows XP/98-style portfolio rewrite with:

- Boot splash that types logs and requires pressing `continue`
- Desktop icons, taskbar, start menu, and tabbed window navigation
- Styling inspired by `https://vmfunc.re/`

## Setup

1. Run `yarn install`
2. Run `yarn dev` to start the dev server
3. Run `yarn build` for production build + type check
4. Run `yarn lint` to auto-fix lint issues
5. Run `yarn test:unit` for Vitest unit tests
6. Run `yarn test:e2e:dev` for Cypress against local dev server

## Notes

- `public/98.css` is vendored from the reference design stack so the retro shell styles are local.
- Main implementation lives in `src/views/HomeView.vue`.
- Domain configuration reference: <https://gist.github.com/plembo/84f80c920bb5ac6f19e53fe6f8db1ff7>
