# Arukas-API
FROM node:latest
MAINTAINER malaohu <tua@live.cn>
RUN apt-get clean all
RUN apt-get update
RUN apt-get -y install git
RUN git clone https://github.com/malaohu/Arukas-API.git /Arukas-API

ENV IS_CRON= 
ENV TOKEN=
ENV SECRET=

WORKDIR /Arukas-API
RUN sed -ri 's/yourtoken/'+$TOKEN +'/g' /Arukas-API/config.js && \
    sed -ri 's/yoursecret/'+$SECRET+'/g' /Arukas-API/config.js && \
    sed -ri 's/yourcron/'+$IS_CRON+'/g' /Arukas-API/config.js

RUN npm install

EXPOSE 13999

CMD npm start
