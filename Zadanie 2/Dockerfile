FROM node:lts
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
EXPOSE 8082
CMD ["npm", "run", "start"]