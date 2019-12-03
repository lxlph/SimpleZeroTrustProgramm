var fs = require('fs');
var https = require('https');
var options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    // key: fs.readFileSync('./cert/client1-key.pem'),
    // cert: fs.readFileSync('./cert/client1-crt.pem'),
    ca: fs.readFileSync('./cert/ca-crt.pem')
};

var req1 = https.request(options, function(res) {
    console.log("Client A statusCode: ", res.statusCode);
    console.log("Client A headers: ", res.headers);
    console.log("Server Host Name: "+ res.connection.getPeerCertificate().subject.CN);
    res.on('data', function(d) {
        process.stdout.write(d);
    });
});
req1.end();
req1.on('error', function(e) {
    console.error(e);
});