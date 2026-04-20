FROM node:22-alpine
# Create app directory
WORKDIR /usr/src/app

RUN mkdir assets

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

RUN npx prisma generate && npm run build

CMD [ "sh", "-c", "set -a && . ./.env && set +a && npx prisma migrate deploy && node dist/main" ]