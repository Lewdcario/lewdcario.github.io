FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV SIGNAL_PORT=8787
EXPOSE 8787

CMD ["npm", "run", "start"]
