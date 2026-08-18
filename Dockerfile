# Production web build served with nginx
FROM node:22-slim AS builder

ENV EXPO_NO_TELEMETRY=1
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx expo export --platform web

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
