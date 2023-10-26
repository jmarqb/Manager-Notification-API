# Base image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Install netcat and dos2unix for the wait-for-it script
RUN apt-get update && apt-get install -y netcat-openbsd dos2unix

# Bundle the rest of app source
COPY . .

# Convert wait-for-it.sh to Unix line endings
RUN dos2unix wait-for-it.sh

# Build the application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD [ "node", "dist/main.js" ]
