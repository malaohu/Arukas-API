# 重要说明

2017年7月6日提交的代码，不再支持 node server.js token secret 1 方式启动。

需要修改config.js配置文件，填写 token 和 secret

已经兼容到最新版本的SSR订阅格式


# 特别说明

本分支代码不是部署 SSR/SS 

SS： https://github.com/malaohu/ss-with-net-speeder

SSR： https://github.com/malaohu/ssr-with-net-speeder


# 关于项目
本分支是部署一个WEB项目采用Nodejs编码，实时自动获取Arukas的Ip和Port的。

演示地址：http://arukas.somecolor.cc/

演示站点使用的账号已经被冻结无法使用。尽量自己使用，不要轻易分享给其他人。


# 安装部署

## 源码部署
```
git clone https://github.com/malaohu/Arukas-API
cd Arukas-API
npm install
# modify config.js 
node server.js
```
然后访问：ip:13999 即可



## Docker部署
```
docker run -d --name arukas-api -p 13999:13999 malaohu/arukas-api --env TOKEN=token SECRET=secret IS_CRON=1
```


```
镜像：malaohu/arukas-api
端口:13999 TCP
环境变量:TOKEN=token SECRET=secret IS_CRON=1

#也可以使用CMD启动(不推荐)
CMD : node /app/server.js token secret 1
```

## 环境变量(ENV)
TOKEN 和  SECRET 获取地址：https://app.arukas.io/settings/api-keys


IS_CRON 传 0 或者 1
是否启动自动启动服务功能，0是不启动，1是启动。
该服务会定时检测APP运行状态，如果APP没有启动，会发送一个启动命令。


## 功能介绍
* 实时获取IP和端口，以及SS(R)的配置信息
* 检查APP运行情况，没有启动的发送启动命令(支持手动请求)

## 请求地址
* http://ip:13999
* http://ip:13999/check/status 手动检查服务运行状态，没有启动服务，发送启动命令
* http://ip:13999/ssr/subscribe/10 SSR订阅地址

## 可识别的SS(R)镜像

*/ssr-with-net-speeder

*/ss-with-net-speeder

*/shadowsocksr-docker
