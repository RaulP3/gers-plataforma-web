FROM node:22.18-alpine
RUN apk add --no-cache tzdata
ENV TZ=America/Mexico_City
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3001
CMD ["node", "server.js"]
