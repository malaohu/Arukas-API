# Arukas-API
FROM node:latest
MAINTAINER malaohu <tua@live.cn>
RUN apt-get clean all
RUN apt-get update
RUN apt-get -y install git
RUN git clone https://github.com/woodsking2/Arukas-API.git /Arukas-API

#ENV IS_CRON = '3f708297-c197-4d8f-9a56-45ffcaa9a3eb'
#ENV TOKEN = 'wuy5b12gZ2Tr3QhOldmYXDf4CcAPX4EvKBNbvQG1rQwJTM8QYXHfK7lQOQua0Ghv'
#ENV SECRET = '1'

WORKDIR /Arukas-API
RUN sed -ri 's/yourtoken/'$TOKEN'/g' /Arukas-API/config.js && \
    sed -ri 's/yoursecret/'$SECRET'/g' /Arukas-API/config.js && \
    sed -ri 's/yourcron/'$IS_CRON'/g' /Arukas-API/config.js

RUN npm install

EXPOSE 13999

CMD npm start
