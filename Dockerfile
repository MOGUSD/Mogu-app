FROM node:22-alpine
WORKDIR /app
COPY . .
RUN node --check /app/server.js && node --check /app/app.js && node --check /app/arcade-games.js
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
