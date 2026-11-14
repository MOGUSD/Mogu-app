FROM node:22-alpine
WORKDIR /app
RUN npm install --global serve@14
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s /app -l tcp://0.0.0.0:${PORT:-8080}"]
