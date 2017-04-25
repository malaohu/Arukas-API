var express = require('express');
var superagent = require('superagent');
var async = require('async');
var ejs = require('ejs');

var app = express();
app.use(express.static(__dirname + '/public'));
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
var args = process.argv.slice(2);
var token = '', secret = '';


token = args[0];
secret = args[1];



appid = args[2] || 'all',
images = ["malaohu/ssr-with-net-speeder", "malaohu/ss-with-net-speeder", "lowid/ss-with-net-speeder"];


app.get('/', function (req, res) {
    getit(appid, function (err, data) {
        if (err || !data)
            res.send('没有查询到数据。请检查node启动参数是否正确。更多内容请访问：https://github.com/malaohu/ssr-with-net-speeder/tree/arukas');
        else
            res.render('./index.html', { "data": data || [] });
    })
});

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
        if (data[i].id == _appid || (_appid == 'all' && images.indexOf(data[i].attributes.image_name.replace(/:[^ ]+/, '')) > -1)) {
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
    get_all_app_info(function (err, data) {
        var log = ['开始检查APP运行情况 : ' + new Date()];

        async.eachSeries(data, function (_data, callback) {
            if (!_data.attributes.is_running) {
                log.push('');
                log.push('[' + _data.id + '] - 没有正常运行');
                send_start_command(_data.id, function (err, body) {
                    if (err)
                        log.push('[' + _data.id + '] - 启动失败：' + err);
                    else
                        log.push('[' + _data.id + '] - 启动成功');
                    callback(null);

                });

            } else
                callback(null);
        }, function (err, result) {
            res.send(log.join('<br>'));
        })
    });

});

app.get('/i', function (req, res) {
    res.send('http://51.ruyo.net');
})

app.listen(3999, function () {
    console.log('Example app listening on port 3999')
})