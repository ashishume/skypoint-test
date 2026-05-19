FROM node:20-alpine

WORKDIR /app

ENV CI=1

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "--port", "5173"]
