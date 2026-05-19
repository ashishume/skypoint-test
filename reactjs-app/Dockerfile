FROM node:20-alpine AS build

WORKDIR /app

ENV CI=1
ARG VITE_DEMO_HR_EMAIL
ARG VITE_DEMO_HR_PASSWORD
ARG VITE_DEMO_CANDIDATE_EMAIL
ARG VITE_DEMO_CANDIDATE_PASSWORD
ENV VITE_DEMO_HR_EMAIL=$VITE_DEMO_HR_EMAIL \
    VITE_DEMO_HR_PASSWORD=$VITE_DEMO_HR_PASSWORD \
    VITE_DEMO_CANDIDATE_EMAIL=$VITE_DEMO_CANDIDATE_EMAIL \
    VITE_DEMO_CANDIDATE_PASSWORD=$VITE_DEMO_CANDIDATE_PASSWORD

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1
