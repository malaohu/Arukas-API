# Arukas-API
FROM node:latest
MAINTAINER malaohu <tua@live.cn>
RUN apt-get clean all
RUN apt-get update
RUN apt-get -y install git
RUN git clone https://github.com/malaohu/Arukas-API.git /Arukas-API

ENV IS_CRON 
ENV TOKEN 
ENV SECRET

WORKDIR /Arukas-API
RUN npm install

CMD node /app/server.js $TOKEN $SECRET $IS_CRON 
