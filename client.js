var fs = require('fs');
var https = require('https');















var options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    key: fs.readFileSync('./cert/client1-key.pem'),
    cert: fs.readFileSync('./cert/client1-crt.pem'),
    ca: fs.readFileSync('./cert/ca-crt.pem')
};
var req = https.request(options, function(res) {
    res.on('data', function(data) {
        process.stdout.write("test");
    });
});
req.end();

req.on('error', function(e) {
    console.error(e);
});