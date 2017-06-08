# 特别说明

本分支代码不是部署 SSR/SS 

SS： https://github.com/malaohu/ss-with-net-speeder

SSR： https://github.com/malaohu/ssr-with-net-speeder


# 关于项目
本分支是部署一个WEB项目采用Nodejs编码，实时自动获取Arukas的Ip和Port的。

演示地址：http://arukas.somecolor.cc/



# 安装部署

## 源码部署
```
git clone https://github.com/malaohu/Arukas-API
cd Arukas-API
npm install
node server.js token secret 1
```
然后访问：ip:13999 即可


## Docker部署
```
镜像：malaohu/arukas-api
端口:13999 TCP
CMD : node /app/server.js token secret 1
```

# 参数说明

详细说明一下CMD中的命令参数。
目前参数依次有3个 token secret is_cron

token 和 secret 获取地址：

https://app.arukas.io/settings/api-keys


is_cron 参数是，是否启动自动启动服务功能。
该服务会定时检测APP运行状态，如果APP没有启动，会发送一个启动命令。


### 支持识别的镜像

*/ssr-with-net-speeder

*/ss-with-net-speeder

*/shadowsocksr-docker
