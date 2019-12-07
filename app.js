const express = require('express');
const app = express();
const https = require('https');
const bodyParser = require('body-parser');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const dateFormat = require('dateformat');
const formidableMiddleware = require('express-formidable');

//array for all messages which where sent
let messages = [];
//every user has an id
let id = 0;
//parse fileName.json which contains all users with their passwords
let jsonParsed = JSON.parse(fs.readFileSync('fileName.json').toString());
//create an array of all users
let users = jsonParsed.users;
//variable which check whether the device is already authenticated
let deviceAutorized = false;

//get userid by email
function getIdByEmail (email){
    var id = -1;
    users.forEach(function (user) {
        if(user.email == email){
            id = user.id;
        }
    });
    return id;
}

//set some configurations for app
app.use("/static", express.static('./static/'));
app.use(bodyParser.json());

//login API supports both, normal auth + 2fa
app.post('/login', function(req, res){
    id = getIdByEmail(req.body.email);
    if(!users[id].twofactor || !users[id].twofactor.secret){ //two factor is not enabled by the user
        //check credentials
		if(req.body.email == users[id].email && req.body.password == users[id].password){
            return res.send('success');
        }
        return res.status(400).send('Invald email or password');
    }
    else {
        //two factor enabled
        if(req.body.email != users[id].email || req.body.password != users[id].password){
            return res.status(400).send('Invald email or password');
        }
		//check if otp is passed, if not then ask for OTP
        if(!req.headers['x-otp']){
            return res.status(206).send('Please enter otp to continue');
        }
        //validate otp
        var verified = speakeasy.totp.verify({
            secret: users[id].twofactor.secret,
            encoding: 'base32',
            token: req.headers['x-otp']
        });
        if(verified){
            return res.send('success');
        } else {
            return res.status(400).send('Invalid OTP');
        }
    }
});

//setup two factor for logged in user
app.post('/twofactor/setup', function(req, res){
    const secret = speakeasy.generateSecret({length: 10});
    QRCode.toDataURL(secret.otpauth_url, (err, data_url)=>{
        //save to logged in user.
        users[id].twofactor = {
            secret: "",
            tempSecret: secret.base32,
            dataURL: data_url,
            otpURL: secret.otpauth_url
        };
        return res.json({
            message: 'Verify OTP',
            tempSecret: secret.base32,
            dataURL: data_url,
            otpURL: secret.otpauth_url
        });
    });
});

//get 2fa details
app.get('/twofactor/setup', function(req, res){
    res.json(users[id].twofactor);
});

//get messages
app.get('/messages', function(req, res){
    res.json(messages);
});

//disable 2fa
app.delete('/twofactor/setup', function(req, res){
    delete users[id].twofactor;
    res.send('success');
});

//before enabling totp based 2fa; it's important to verify, so that we don't end up locking the user.
app.post('/twofactor/verify', function(req, res){
    var verified = speakeasy.totp.verify({
        secret: users[id].twofactor.tempSecret, //secret of the logged in user
        encoding: 'base32',
        token: req.body.token
    });
    if(verified){
        users[id].twofactor.secret = users[id].twofactor.tempSecret;
        return res.send('Two-factor auth enabled');
    }
    return res.status(400).send('Invalid token, verification failed');
});

//ppload page
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname+'/uploadFiles.html'));
});

//client page
app.get('/client', function(req, res){
    const cert = req.connection.getPeerCertificate();
    if(req.client.authorized){
        deviceAutorized = true;
        res.send(`Success! Your certificate was issued by ${cert.issuer.O}!`)
    }
    else if(deviceAutorized){
        res.sendFile(path.join(__dirname + '/client.html'));
        // res.send(`Already authenticated device`)
    }
    else if (cert.subject) {
        console.log(cert);
        res.send(`Sorry, certificates from ${cert.issuer.O} are not welcome here.`)
    }
    else{
        res.send(`Sorry, but you need to provide a client certificate to continue. 
                    Please go back to "Upload page"`);

    }
});

//change body parser for uploading files with formData (needed for upload)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(formidableMiddleware());

//uploading files
app.post('/upload', function (req, res) {
    //check whether files were really sent
    if(Object.keys(req.files).length < 2 && req.files.constructor === Object){
        res.sendStatus(400);
    }
    else{
        function callback(alertInfo){
            return res.status(206).send(alertInfo);
        }
        reqWithKey(req.files.file.path, req.files.file2.path, callback);

    }
});

/**
 * start server
 */
let optionsServer = {
    key: fs.readFileSync('./cert/server-key.pem'),
    cert: fs.readFileSync('./cert/server-crt.pem'),
    ca: fs.readFileSync('./cert/local-root-CA/rootCA.pem'),
    requestCert: true,
    rejectUnauthorized: false
};
const server = https.createServer(optionsServer, app);
const io = require('socket.io')(server);
server.listen(3000, function() {
    console.log('server up and running at 3000 port');
});

//socket connections
io.on('connection', function(socket) {
    //init chat with message which were sent already
    socket.emit('init-chat', messages);

    //if the server receives a message then it saves it in the messages array and inform all clients
    socket.on('send-msg', function(data) {
        var newMessage = { text : data.message, user : data.user, date : dateFormat(new Date(), 'shortTime') };
        messages.push(newMessage);
        io.emit('read-msg', newMessage);
    });
});

//function to start a http request with the uploaded certificate to authenticate the device
function reqWithKey(file_path, file2_path, callback2){
    let optionsClient = {
        hostname: 'localhost',
        port: 3000,
        path: '/client',
        method: 'GET',
        cert: fs.readFileSync(file_path),
        key: fs.readFileSync(file2_path),
        ca: fs.readFileSync('./cert/local-root-CA/rootCA.pem')
        // cert: fs.readFileSync('./cert/localhost-client.pem'),
        // key: fs.readFileSync('./cert/localhost-client-key.pem'),
        // ca: fs.readFileSync('C:\\Users\\linh-\\AppData\\Local\\mkcert\\test\\rootCA.pem')
    };
    callback = function(res) {
        res.on('data', function(data) {
            process.stdout.write(data);
            callback2(data);
        });
    };

    var req1 = https.request(optionsClient, callback);
    req1.end();

    req1.on('error', function(e) {
        console.error(e);
    });
}
