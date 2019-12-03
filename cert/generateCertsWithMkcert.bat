@echo off
call clean.bat

mkcert -install

mkcert example.com "*.example.com" example.test localhost 127.0.0.1 ::1

echo ============= rename cert and key to server-key.pem and server-crt.pem =============
ren example.com+5.pem server-crt.pem
ren example.com+5-key.pem server-key.pem

echo ============= finished =============
pause

