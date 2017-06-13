var express = require('express');
var superagent = require('superagent');
var async = require('async');
var ejs = require('ejs');
var cronJob = require("cron").CronJob; 

var app = express();
app.use(express.static(__dirname + '/public'));
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
var args = process.argv.slice(2);
var token = '', secret = '',is_croni,appid='all';


token = args[0];
secret = args[1];
is_cron = args[2] || 0;

//兼容旧版本
/*appid = args[2] || 'all';
if (appid == 0 || appid ==1){
    is_cron = appid;
    appid = 'all';
}*/

var reg_images = /^[^\/]+\/(ssr?-with-net-speeder||shadowsocksr-docker)(:[^ ]+)?$/i

app.get('/', function (req, res) {
    getit(appid, function (err, data) {
        if (err || !data)
            res.send('没有查询到数据。请检查node启动参数是否正确。更多内容请访问：https://github.com/malaohu/ssr-with-net-speeder/tree/arukas');
        else
            res.render('./index.html', { "data": data || [] });
    })
});

app.get('/:appid', function (req, res) {
    var _appid = req.params.appid;
    get_app_info(_appid, function (err, data) {
        if (!err)
            return get_ss_data(appid, [data], function (err, data) {
                res.send(data);
            });
        else
            res.send('can not find app_id!');
    })
})

//检查所有APP的状态，发现启动失败的，发送启动命令。
app.get('/check/status', function (req, res) {
    check_status(function(log){
        res.send('<pre><code>' +log.join('<br>')+'</code></pre>');
    })
});


//获取SSR订阅地址
//4.4.0+ 版本
//说明文档：https://github.com/breakwa11/shadowsocks-rss/wiki/Subscribe-%E6%9C%8D%E5%8A%A1%E5%99%A8%E8%AE%A2%E9%98%85%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3
app.get('/ssr/subscribe/:max',function(req,res){
    var max = parseInt(req.params.max);
    getit('all',function(e,data){
        res_arr = [];
        if (max > 0)
            res_arr.push('MAX=' + max);
        console.log(data);
        for(var i = 0; i < data.length; i++)
            if(data[i].protocol)
                res_arr.push(build_ssh(data[i]))
            console.log(res_arr);
        res.send(new Buffer(res_arr.join('\n')).toString('base64'))
    });
});


//启动服务监控每60秒执行一次
if (is_cron == 1){
    new cronJob('*/60 * * * * *', function () { 
        check_status(function(log){
            console.log(log);
        });
    }, null, true, 'Asia/Chongqing');
    console.log('启动服务监控');
}

function getit(appid, callback) {
    if (appid != 'all')
        get_app_info(function (err, data) {
            if (!err)
                return get_ss_data(appid, [data], callback);
            else
                return callback(err, null);
        });
    else
        get_all_app_info(function (err, data) {
            console.log(data);
            if (!err)
                return get_ss_data(appid, data, callback);
            else
                return callback(err, null);
        });
}

//发送API请求
function arukas_request(commond_url, methond, callback) {
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

function get_all_app_info(callback) {
    arukas_request("containers", "GET", function (err, body) {
        return callback(err, body);
    })
}

function get_app_info(app_id, callback) {
    arukas_request("containers", "GET", function (err, body) {
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
    return arukas_request(commond, 'POST', callback);
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
                    var ret_json = {"appid":data[i].id,"server":ip,"server_port":service_port,"method":ss_method};
                    if(ss_protocol && ss_obfs)
                    {
                        ret_json["password"] = Buffer(ss_password).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
                        ret_json["protocol"] = ss_protocol;
                        ret_json["obfs"] = ss_obfs;
                        ret_json["remarks"] = Buffer(data[i].attributes.arukas_domain).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
                        ret_json["group"] = Buffer("Arukas-SSR").toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
                    }else{
                        ret_json["password"] = ss_password;
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
    //1var group_name = 'Arukas-SSR';
    //1var group_name_base64 = 'QXJ1a2FzLVNTUg';
    //1var remark = 'RUYO.net';
    //1var remark_base64 = 'UlVZTy5uZXQ';
    if(!obj)
        return null
    //1var pwd_base64 = new Buffer(obj.password).toString('base64');
	var ssr_add = obj.server + ':' + obj.server_port + ':' + obj.protocol +':' + obj.method + ':' + obj.obfs + ':' + obj.password + '/?obfsparam=&remarks=' + obj.remarks + '&group='+ obj.group;
	var ssr_add_base64 = new Buffer(ssr_add).toString('base64');
    //1return 'ssr://' + obj.server + ':' + obj.server_port + ':' + obj.protocol +':' + obj.method + ':' + obj.obfs + ':' + pwd_base64 + '/?obfsparam=&remarks=' + remark_base64 + '&group='+group_name_base64;
    return 'ssr://' + ssr_add_base64;
    //3return 'ssr://' + Buffer(obj.server + ':' + obj.server_port + ':' + obj.protocol +':' + obj.method + ':' + obj.obfs + ':' + obj.password + '/?obfsparam=&remarks=' + obj.remarks + '&group='+ obj.group).toString('base64');
}
//创建SSR的ssh链接
function build_ssh(obj){
    var group_name = 'Arukas-SSR';
    var group_name_base64 = 'QXJ1a2FzLVNTUg';
    var remark = 'RUYO.net';
    var remark_base64 = 'UlVZTy5uZXQ';
    if(!obj)
        return null
    var pwd_base64 = new Buffer(obj.password).toString('base64');
    return 'ssr://' + obj.server + ':' + obj.server_port + ':' + obj.protocol +':' + obj.method + ':' + obj.obfs + ':' + pwd_base64 + '/?obfsparam=&remarks=' + remark_base64 + '&group='+group_name_base64;
}

function check_status(callback){
    get_all_app_info(function (err, data) {
        var log = ['开始检查APP运行情况 : ' + new Date()];
        async.eachSeries(data, function (_data, cb) {
            if (!_data.attributes.is_running) {
                log.push('');
                log.push('[' + _data.id + '] - 没有正常运行');
                send_start_command(_data.id, function (err, body) {
                    if (err)
                        log.push('[' + _data.id + '] - 启动失败：' + err);
                    else
                        log.push('[' + _data.id + '] - 启动成功');
                    cb(null);

                });

            } else
                cb(null);
        }, 
        function (err, result) {
            callback(log);     
        })
    })
}



app.listen(13999, function () {
    console.log('Example app listening on port 13999')
})
