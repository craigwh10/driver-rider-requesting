FROM node:18

WORKDIR /app

COPY package.json package-lock.json .env index.ts sqs.ts tsconfig.json ./

RUN npm i
# temporary to include ts-node
EXPOSE 8050
ENTRYPOINT ["/usr/local/bin/npm", "run", "start"]
