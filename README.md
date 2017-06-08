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
node server.js token secret all 1
```
然后访问：ip:13999 即可


## Docker部署
```
镜像：malaohu/arukas-api
端口:13999 TCP
CMD : node /app/server.js token secret all 1
```

# 参数说明

详细说明一下CMD中的命令参数。

使用密钥方式，访问速度会更快一些。像Github 第三方登录也可以使用。

token 和 secret 获取地址：

https://app.arukas.io/settings/api-keys


appid

appid 参数可以不传，那么就是获取所有APPID且可识别镜像的信息。


你建立的APP都有一个ID。例如：
ID	fd9b708e-9a2c-45a0-b81c-620944369c2d



### 支持识别的镜像

*/ssr-with-net-speeder

*/ss-with-net-speeder

*/shadowsocksr-docker
