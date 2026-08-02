FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack prepare yarn@4.7.0 --activate && yarn install --immutable

COPY . .
RUN yarn build

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
