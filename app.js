const express = require('express');
var app = express();
const https = require('https');
const bodyParser = require('body-parser');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
const path = require('path');
var fs = require('fs');
var dateFormat = require('dateformat');
// var clientCertificateAuth = require('client-certificate-auth');

app.use(bodyParser.json());
app.use("/static", express.static('./static/'));

var jsonParsed = JSON.parse(fs.readFileSync('fileName.json').toString());
var users = jsonParsed.users;
var id = 0;

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

app.get('/client', function(req, res) {
    res.sendFile(__dirname + '/client.html');
});

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

//EXPL: Front-end app
app.get('/', function(req, res){
    console.log(req.client.authorized);
    console.log(new Date()+' '+
        req.connection.remoteAddress+' '+
        // req.socket.getPeerCertificate().subject.CN+' '+
        req.method+' '+req.url);
    if(req.client.authorized==true){
        // res.sendFile(path.join(__dirname+'/vue.app.html'))
        res.send("hello");
    }
    else{
        res.sendFile(path.join(__dirname+'/server.html'))
    }
});

var options = {
    key: fs.readFileSync('./cert/server-key.pem'),
    cert: fs.readFileSync('./cert/server-crt.pem'),
    ca: fs.readFileSync('C:\\Users\\linh-\\AppData\\Local\\mkcert\\rootCA.pem'),
    requestCert: true,
    rejectUnauthorized: false
};

// app.get('/', (req, res) => {
//     res.send('<a href="authenticated">Log in using client certificate</a>')
// })
//
// var autorized = false;

// app.get('/authenticate', (req, res) => {
//     const cert = req.connection.getPeerCertificate()
//     console.log(req.client.authorized);
//     console.log(cert.subject.O);
//     if (req.client.authorized) {
//         // res.send(`Hello ${cert.subject.CN}, your certificate was issued by ${cert.issuer.CN}!`)
//         autorized = true;
//     } else if (cert.subject) {
//         res.status(403)
//             // .send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`)
//     } else {
//         res.status(401)
//             .send(`Sorry, but you need to provide a client certificate to continue.`)
//     }
//     res.end();
// });
//
app.get('/authenticated', (req, res) => {
    if (autorized) {
        // res.send(`Hello ${cert.subject.CN}, your certificate was issued by ${cert.issuer.CN}!`)
    // } else if (cert.subject) {
    //     res.status(403)
    //     // .send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`)
        res.sendFile(path.join(__dirname+'/vue.app.html'));
        autorized = false;
    } else {
        res.status(401)
            .send(`Sorry, but you need to provide a client certificate to continue.`)
    }
});

var server = https.createServer(options, app);
var io = require('socket.io')(server);
server.listen(3000, function() {
    console.log('server up and running at 3000 port');
});

var messages = [];
var users = [];

io.on('connection', function(socket) {

    socket.on('send-msg', function(data) {
        console.log(data);
        var newMessage = { text : data.message, user : data.user, date : dateFormat(new Date(), 'shortTime') };
        messages.push(newMessage);
        io.emit('read-msg', newMessage);
    });

    socket.on('add-user', function(user){
        users.push({ id: socket.id, name: user });
        io.emit('update-users', users);
    });

    socket.on('disconnect', function() {
        users = users.filter(function(user){
            return user.id != socket.id;
        });
    });
});
