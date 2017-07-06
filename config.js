var config = {
    token       : 'yourtoken', 
    secret      : 'yoursecret',
    is_cron     : yourcron,
    
    cache   :   true,//启动缓存
    cache_timeout: 1000 * 60 * 10,//缓存时间单位毫秒 

}
module.exports = config;
