FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production --loglevel=error
COPY . .
EXPOSE 5173
CMD ["npm","run","dev"]
