FROM node:lts-bullseye-slim AS base
WORKDIR /app
COPY . .
RUN npm install --force
RUN npm run build

WORKDIR /app
EXPOSE 5173
CMD ["npm", "start"]