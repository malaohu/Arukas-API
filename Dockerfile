FROM readytalk/nodejs
WORKDIR /app
WORKDIR /app/views
WORKDIR /app/public
COPY server.js /app/
COPY package.json /app/
COPY views/index.html /app/views
COPY public/css.css /app/public
RUN npm install
