#!/bin/bash
sed -ri 's/yourtoken/'$TOKEN'/g' /Arukas-API/config.js && \
    sed -ri 's/yoursecret/'$SECRET'/g' /Arukas-API/config.js && \
    sed -ri 's/yourcron/'$IS_CRON'/g' /Arukas-API/config.js

cd /Arukas-API
npm install
npm start
