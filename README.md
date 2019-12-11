# SimpleZeroTrustProgramm

1. install mckert and openssl:
https://github.com/FiloSottile/mkcert
https://www.openssl.org/source/

2. Generate certificates with generateCerts.bat in the project folder
> **Warning**: the `rootCA-key.pem` file that mkcert automatically generates gives complete power to intercept secure requests from your machine. Do not share it.

3. Nodejs should be installed! Then you should install the dependencies 
in the local node_modules folder. You can do that by opening the command line, 
navigating to the project folder path and run following command:
npm install

4. After all dependencies are installed, start your server in the command line with:
node app.js

5. Open in your chrome browser:
https://localhost:3000


For the realization of the otp authentication following project was used: 
https://github.com/rahil471/2fa-demo