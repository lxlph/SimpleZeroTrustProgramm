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

let jsonParsed = JSON.parse(fs.readFileSync('fileName.json').toString());
let users = jsonParsed.users;
let messages = [];
let id = 0;
let autho = false;

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

//get message
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

//EXPL: Front-end app
app.get('/', function(req, res){
    // console.log(req.client.authorized);
    // console.log(new Date()+' '+
    //     req.connection.remoteAddress+' '+
    //     // req.socket.getPeerCertificate().subject.CN+' '+
    //     req.method+' '+req.url);
    // if(req.client.authorized){
    //     console.log("autho works");
    //     res.redirect('client?');
    // }
    // else{
    //     console.log("autho does not work");
    //     res.sendFile(path.join(__dirname+'/uploadFiles.html'));
    // }
    res.sendFile(path.join(__dirname+'/uploadFiles.html'));
});
app.get('/client', function(req, res){
    if(req.client.authorized){
        autho = true;
    }else if(autho){
        res.sendFile(path.join(__dirname + '/client.html'));
    }
    else{
        res.status(401)
            .send(`Sorry, but you need to provide a client certificate to continue. 
                    Please go back to "Upload page"`);

    }
});

let options = {
    key: fs.readFileSync('./cert/server-key.pem'),
    cert: fs.readFileSync('./cert/server-crt.pem'),
    ca: fs.readFileSync('C:\\Users\\linh-\\AppData\\Local\\mkcert\\rootCA.pem'),
    requestCert: true,
    rejectUnauthorized: false
};

//change body parser for uploading files with formData
app.use(bodyParser.urlencoded({ extended: true }));
app.use(formidableMiddleware());
app.use("/static", express.static('./static/'));

//uploading files
app.post('/upload', function (req, res) {
    //check whether files were really sent
    if(Object.keys(req.files).length < 2 && req.files.constructor === Object){
        res.sendStatus(400);
    }
    else{
        reqWithKey(req.files.file.path, req.files.file2.path);
        res.sendStatus(200);
    }
});

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

/**
 * start server
 */
const server = https.createServer(options, app);
const io = require('socket.io')(server);
server.listen(3000, function() {
    console.log('server up and running at 3000 port');
});

io.on('connection', function(socket) {

    socket.emit('init-chat', messages);

    socket.on('logmsg', function(msg) {
        console.log(msg);
    });

    socket.on('send-msg', function(data) {
        var newMessage = { text : data.message, user : data.user, date : dateFormat(new Date(), 'shortTime') };
        messages.push(newMessage);
        io.emit('read-msg', newMessage);
    });
});

function reqWithKey(file_path, file2_path){
    let options2 = {
        hostname: 'localhost',
        port: 3000,
        path: '/client',
        method: 'GET',
        // cert: fs.readFileSync('./cert/localhost-client.pem'),
        // key: fs.readFileSync('./cert/localhost-client-key.pem'),
        cert: fs.readFileSync(file_path),
        key: fs.readFileSync(file2_path),
        ca: fs.readFileSync('C:\\Users\\linh-\\AppData\\Local\\mkcert\\rootCA.pem')
    };
    callback = function(res) {
        console.log("Client A statusCode: ", res.statusCode);
        console.log("Client A headers: ", res.headers);
        // console.log("Server Host Name: "+ res.connection.getPeerCertificate());
        // console.log(res.connection.getPeerCertificate().subject.O);
        res.on('data', function(d) {
            process.stdout.write("responddata\n");
            process.stdout.write("");
        });
    };

    var req1 = https.request(options2, callback);
    req1.end();

    req1.on('error', function(e) {
        console.error(e);
    });
}
