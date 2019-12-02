const express = require('express');
var app = express();
const https = require('https');
const bodyParser = require('body-parser');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
const path = require('path');
var fs = require('fs');
//var clientCertificateAuth = require('client-certificate-auth');

app.use(bodyParser.json());

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
    res.sendFile(path.join(__dirname+'/vue.app.html'));
});

// app.listen('3000', ()=>{
//     console.log('App running on 3000');
// });

var options = {
    key: fs.readFileSync('./cert/server-key.pem'),
    cert: fs.readFileSync('./cert/server-crt.pem'),
    ca: fs.readFileSync('./cert/ca-crt.pem'),
    requestCert: true,
    rejectUnauthorized: true
};
https.createServer(options,app).listen(3000);

