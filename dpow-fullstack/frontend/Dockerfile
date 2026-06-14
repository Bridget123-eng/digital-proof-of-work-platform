FROM node:20-alpine

WORKDIR /app

COPY package*.json tsconfig.json next.config.mjs postcss.config.js tailwind.config.js ./
COPY src ./src

RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
