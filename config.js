//config file
var config = {
    debug   :   true,
    port    :   13999,
    cache   :   true,//启动缓存
    cache_timeout: 1000 * 60 * 10,//缓存时间单位毫秒 

    token       : '8feb8511-fd02-47e0-af62-29885692eb10', 
    secret      : 'oGLg8Qgk6UdQOZs1fnYZR9hxGKETjD7t1TxcDSb2o799fxREdMcegyuVrlpLp10A',
    is_cron     : true
}
module.exports = config;
