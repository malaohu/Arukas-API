var express = require('express');
var superagent = require('superagent');
var async = require('async');
var ejs = require('ejs');
var cronJob = require("cron").CronJob; 
var cache = require('memory-cache');
var config = require('./config');


var app = express();
app.use(express.static(__dirname + '/public'));
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
var args = process.argv.slice(2);
var token = '', secret = '',is_cron,appid='all';


token = config.token;
secret = config.secret;
is_cron = config.is_cron;
is_cache = config.cache;
cache_timeout = config.cache_timeout;

var reg_images = /^[^\/]+\/(ssr?-with-net-speeder||shadowsocksr-docker)(:[^ ]+)?$/i
var max_count = 3;

app.get('/', function (req, res) {
    getit(appid, function (err, data) {
        if (err || !data)
            res.send('没有查询到数据。请检查node启动参数是否正确。更多内容请访问：https://github.com/malaohu/Arukas-API');
        else
            res.render('./index.html', { "data": data || [] });
    })
});

app.get('/:appid', function (req, res) {
    var _appid = req.params.appid;
    get_containers_info(_appid, function (err, data) {
        if (!err)
            return get_ss_data(appid, [data], function (err, data) {
                res.send(data);
            });
        else
            res.send('can not find app_id!');
    })
})

//检查所有APP的状态，发现启动失败的，发送启动命令。
app.get('/check/status/:token', function (req, res) {
    var _token = req.params.token;
    if(_token != token)
        return res.send('非法请求');
    check_status(function(log){
        res.send('<pre><code>' +log.join('<br>')+'</code></pre>');
    })
});

//删除所有APP
app.get('/install/deleteall/:token',function(req,res){
    var _token = req.params.token;
    if(_token != token)
        return res.send('非法请求');
    delete_all_app_info(function(){
        return res.send('命令执行完毕');
    })

});

//创建一个SSR
app.get('/install/ssr/:token',function(req,res){
    var _token = req.params.token;
    if(_token != token)
        return res.send('非法请求');
    build_ssr_app(function(error,data){
        if(error)
            return res.send('创建失败 ' + error);
        else
            return res.send('创建成功');
    });
})

//获取SSR订阅地址
//4.4.0+ 版本
//说明文档：https://github.com/breakwa11/shadowsocks-rss/wiki/Subscribe-%E6%9C%8D%E5%8A%A1%E5%99%A8%E8%AE%A2%E9%98%85%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3
app.get('/ssr/subscribe/:max',function(req,res){
    access_log(req);
    var max = parseInt(req.params.max);
    getit('all',function(e,data){
        var res_arr = [],max_str;
        for(var i = 0; i < data.length; i++)
            if(data[i].protocol)
                res_arr.push(build_ssh(data[i]))
        if(res_arr.length < max)
            max_str = 'MAX=' + res_arr.length;
        else
            max_str = 'MAX=' + max;
        res.send(bulid_base64(max_str + '\n' + res_arr.join('\n')))
    });
});


//启动服务监控每5分钟执行一次
if (is_cron == 1){
    new cronJob('*/2 * * * *', function () { 
        check_status(function(log){
            console.log(log);
        });
    }, null, true, 'Asia/Chongqing');
    console.log('启动服务监控');
}

function getit(appid, callback) {
    get_all_containers_info(function (err, data) {
        if (!err)
            return get_ss_data(appid, data, callback);
        else
            return callback(err, null);
    });
}

//发送API请求
function arukas_request(commond_url, methond, data, callback) {
    commond_url = "https://app.arukas.io/api/" + commond_url;
    var _request = superagent.get;
    switch (methond) {
        case "POST":
            _request = superagent.post;
            break;
        case "DELETE":
            _request = superagent.delete;
            break;
        default:
            _request = superagent.get;
            break;

    }

    _request(commond_url)
        .auth(token, secret, { type: 'auto' })
        .set('Content-Type', 'application/vnd.api+json')
        .set('Accept', 'application/vnd.api+json')
        .send(data)
        .end(function (err, sres) {
            if(err)
                return callback(err,null);
            else
                return callback(err, sres.body.data);
        });
}


//通过API Token 获取信息
function getit_by_token(appid, callback) {
    superagent.get("https://app.arukas.io/api/containers").auth(token, secret, { type: 'auto' })
    .end(function (err, sres) {
        var data = sres.body.data;
        if (err)
            return callback(err, null);
        else
            return deal_data(appid, sres.body.data, callback);
    });
}

function get_all_app_info(callback){
    arukas_request("apps", "GET",'', function (err, body) {
        return callback(err, body);
    });
}

function delete_all_app_info(callback){
    get_all_app_info(function(error,data){
        async.each(data,function(jsn,cb){
           send_remove_commond(jsn.id,function(err){console.log(err);cb();});
        },function(){
            callback(); 
        });
    });
}

//删除App
function delete_app_info(appid,callback){
    send_remove_commond(appid,callback);
}

function get_all_containers_info(callback) {
    var _body = null;
    if(is_cache)
        _body = cache.get('all_containers_info');
    if(_body){
        console.log('all_containers_info get from cache');
        return callback(null, _body);
    }
    else
        arukas_request("containers", "GET",'', function (err, body) {
            //做缓存处理
            if(!err && is_cache){
                cache.put('all_containers_info', body, cache_timeout, function(key, value) {
                    console.log('put cache key: ['+ key + '] value:' + value);
                });
            }
            console.log('all_containers_info get from api');
            return callback(err, body);
        })
}

function get_containers_info(app_id, callback) {
    arukas_request("containers", "GET",'', function (err, body) {
        for (var i = 0; i < body.length; i++) {
            if (body[i].id == app_id)
                return callback('', body[i])
        }
        return callback('can not find app_id!', null);
    })
}

//发送启动命令
function send_start_command(appid, callback) {
    var commond = 'containers/' + appid + '/power';
    return arukas_request(commond, 'POST','', callback);
}

//发送删除命令
function send_remove_commond(app_id,callback){
    var commond = 'apps/' + app_id;
    return arukas_request(commond, 'DELETE','', callback);
}

//发送创建命令
function send_create_commond(data,callback){
    var commond = 'app-sets'
    return arukas_request(commond, 'POST',data, callback);
}

//创建一个SSR
function build_ssr_app(callback){
    var jsn = 
    {
        data:
        [
            {
                "type": "containers",
                "attributes": {
                    "image_name": "malaohu/ssr-with-net-speeder",
                    "instances": 1,
                    "mem": 512,
                    "cmd": "-s 0.0.0.0 -p 8989 -k RUYO.net -m rc4-md5 -o http_simple -O origin",
                    "envs": [],
                    "ports": [
                        {
                            "number": 8989,
                            "protocol": "tcp"
                        }
                    ],
                    "arukas_domain":"",

                },
            },
            {
                "type": "apps",
                "attributes": {
                    "name": "malaohu/ssr-with-net-speeder"
                }
            }
        ]
    };
    send_create_commond(jsn,callback);

}

function get_app_build_jsn(jsn){
    var jsn = JSON.parse(JSON.stringify(jsn));
    var new_jsn = 
    {
        data :
        [
            {
                "type": jsn.type,
                "attributes": {
                    "image_name" : jsn.attributes.image_name,
                    "instances": jsn.attributes.instances,
                    "mem": jsn.attributes.mem,
                    "envs": jsn.attributes.env,
                    "ports": jsn.attributes.ports,
                    "arukas_domain":""
                }
            },
            {
                 "type": "apps",
                 "attributes": {
                    "name": jsn.attributes.image_name
                }
            }

        ]
    }
    
    return new_jsn;
}


//处理结果信息
function get_ss_data(_appid, data, callback) {
    var ret_list = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i].id == _appid || (_appid == 'all' && reg_images.test(data[i].attributes.image_name))) {
            var jn = data[i];
            if (!jn.attributes.port_mappings)
                continue;
            for (var j = 0; j < jn.attributes.port_mappings.length; j++) {
                var host = jn.attributes.port_mappings[j][0].host;
                var ip = host.substring(6, host.indexOf(".")).replace(/-/g, ".");
                var service_port = jn.attributes.port_mappings[j][0].service_port;
                var container_port = jn.attributes.port_mappings[j][0].container_port;
                var cmd = jn.attributes.cmd;
                var ss_method = '', ss_password = '', ss_port = '', ss_protocol = '', ss_obfs = '';
                //try to get ss method
                if (/-m\s+([^ ]+)/.test(cmd))
                    ss_method = RegExp.$1;
                //try to get ss password
                if (/-k\s+([^ ]+)/.test(cmd))
                    ss_password = RegExp.$1;
                //try to get ss port
                if (/-p\s+([^ ]+)/.test(cmd))
                    ss_port = RegExp.$1;
                //try to get ssr protocol 
                if (/-O\s+([^ ]+)/.test(cmd))
                    ss_protocol = RegExp.$1;
                //try to get ssr obfs 
                if (/-o\s+([^ ]+)/.test(cmd))
                    ss_obfs = RegExp.$1;
                if (ss_port == container_port) {
                    var ret_json = { "appid": data[i].id, "server": ip, "server_port": service_port, "password": ss_password, "method": ss_method };
                    if (ss_protocol && ss_obfs) {
                        ret_json["protocol"] = ss_protocol;
                        ret_json["obfs"] = ss_obfs;
                    }
                    ret_list.push(ret_json);
                }
            }
        }
    }
    return callback(null, ret_list);
}

//创建SSR的ssh链接
function build_ssh(obj){
    var group_name = 'Arukas-SSR';
    var group_name_base64 = 'QXJ1a2FzLVNTUg';
    var remark = 'RUYO.net';
    var remark_base64 = 'UlVZTy5uZXQ';
    if(!obj)
        return null
    var pwd_base64 = bulid_base64(obj.password);
    return 'ssr://' + bulid_base64(obj.server + ':' + obj.server_port + ':' + obj.protocol +':' + obj.method + ':' + obj.obfs + ':' + pwd_base64
         + '/?obfsparam=&remarks=' + remark_base64 + '&group='+group_name_base64);
}

function check_status(callback){
    get_all_containers_info(function (err, data) {
        var log = ['开始检查APP运行情况 : ' + new Date()];
        async.eachSeries(data, function (_data, cb) {
            if (!_data.attributes.is_running) {
                log.push('');
                log.push('[' + _data.id + '] - 没有正常运行');
                var app_key = 'app'+ _data.attributes.app_id;
                var count = cache.get(app_key) || 0;
                count++;
                console.log(app_key + ' ' + count);
                //如果启动次数超过最大值,直接删除APP
                if(count >= max_count)
                {
                    var jsn = get_app_build_jsn(_data);
                    return delete_app_info(_data.attributes.app_id,function(err){
                        send_create_commond(jsn,function(err){
                            log.push('[' + _data.attributes.app_id + '] - 已经删除且重建');
                            cb(null);
                        });                
                    })
                }else{
                    cache.put(app_key,count,(1000 * 60 * 60 * 2) , function(key, value) {
                        console.log('put cache key: ['+ key + '] value:' + value);
                    });
                    send_start_command(_data.id, function (err, body) {
                        //无法启动的APP,直接重建
                        if(err &&  err == 'Error: Unprocessable Entity'){
                            var jsn = get_app_build_jsn(_data);
                            return delete_app_info(_data.attributes.app_id,function(err){
                                send_create_commond(jsn,function(err){
                                log.push('[' + _data.attributes.app_id + '] - 已经删除且重建');
                                cb(null);
                                });                
                            })
                        }
                        if (err)
                            log.push('[' + _data.attributes.app_id + '] - 启动失败：' + err);
                        else
                            log.push('[' + _data.attributes.app_id + '] - 启动命令已发送');
                        cb(null);
                    });
                }

            } else
                cb(null);
        }, 
        function (err, result) {
            callback(log);     
        })
    })
}

function access_log(req)
{
    var getClientIP = function(){
        var ipAddress;
        var headers = req.headers;
        var forwardedIpsStr = headers['x-real-ip'] || headers['x-forwarded-for'];
        forwardedIpsStr ? ipAddress = forwardedIpsStr : ipAddress = null;
        if (!ipAddress){
            ipAddress = req.connection.remoteAddress;
        }
        return ipAddress;
    }
    console.log(new Date() + ' ' + getClientIP() + ' ' + req.url);
}

function bulid_base64(str)
{
    return new Buffer(str).toString('base64').replace(/=+$/,'');
}

app.listen(13999, function () {
    console.log('Example app listening on port 13999');
    console.log('token : ' + token);
    console.log('secret : ' + secret);
    console.log('is_cron : ' + is_cron);
})
