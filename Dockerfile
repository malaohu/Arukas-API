# Arukas-API
FROM node:latest
MAINTAINER malaohu <tua@live.cn>
RUN apt-get clean all
RUN apt-get update
RUN apt-get -y install git
RUN git clone https://github.com/malaohu/Arukas-API.git /Arukas-API
RUN chmod +x /Arukas-API/entrypoint.sh
EXPOSE 13999
ENTRYPOINT ["/Arukas-API/entrypoint.sh"]
