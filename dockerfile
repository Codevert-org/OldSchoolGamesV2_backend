FROM node:22-slim
# Create app directory
WORKDIR /usr/src/app

RUN apt-get update -y && apt-get install -y openssl

RUN mkdir assets

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

RUN npx prisma generate && npm run build

CMD [ "sh", "-c", "npx prisma migrate deploy && node dist/main" ]