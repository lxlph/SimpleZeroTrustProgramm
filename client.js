var fs = require('fs');
var https = require('https');
var options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    key: fs.readFileSync('./cert/localhost-client-key.pem'),
    cert: fs.readFileSync('./cert/localhost-client.pem'),
    ca: fs.readFileSync('C:\\Users\\linh-\\AppData\\Local\\mkcert\\rootCA.pem')
};

var socket = io.connect('http://localhost');
socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', { my: 'data' });
});

var req1 = https.request(options, function(res) {
    console.log("Client A statusCode: ", res.statusCode);
    console.log("Client A headers: ", res.headers);
    // console.log("Server Host Name: "+ res.connection.getPeerCertificate());
    // console.log(res.connection.getPeerCertificate().subject.O);
    res.on('data', function(d) {
        process.stdout.write("hello");
    });
});
req1.end();
req1.on('error', function(e) {
    console.error(e);
});