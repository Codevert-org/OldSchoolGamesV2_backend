FROM node:22-slim
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

# If you are building your code for production
# RUN npm ci --omit=dev

CMD [ "npm", "run", "init" ]