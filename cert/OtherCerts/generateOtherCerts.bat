#!/bin/bash
echo ============= Create a CA =============
openssl req -new -x509 -days 9999 -config otherca.cnf -keyout otherca-key.pem -out otherca-crt.pem

echo ============= generate a private key for the server =============
openssl genrsa -out otherserver-key.pem 4096

echo ============= generate the certificate signing request =============
openssl req -new -config otherserver.cnf -key otherserver-key.pem -out otherserver-csr.pem

echo ============= sign the request =============
openssl x509 -req -extfile otherserver.cnf -days 999 -passin "pass:password" -in otherserver-csr.pem -CA otherca-crt.pem -CAkey otherca-key.pem -CAcreateserial -extensions v3_req -out otherserver-crt.pem

echo ============= create clients =============
openssl genrsa -out otherclient1-key.pem 4096
openssl genrsa -out otherclient2-key.pem 4096
openssl req -new -config otherclient1.cnf -key otherclient1-key.pem -out otherclient1-csr.pem
openssl req -new -config otherclient2.cnf -key otherclient2-key.pem -out otherclient2-csr.pem
openssl x509 -req -extfile otherclient1.cnf -days 999 -passin "pass:password" -in otherclient1-csr.pem -CA otherca-crt.pem -CAkey otherca-key.pem -CAcreateserial -out otherclient1-crt.pem
openssl x509 -req -extfile otherclient2.cnf -days 999 -passin "pass:password" -in otherclient2-csr.pem -CA otherca-crt.pem -CAkey otherca-key.pem -CAcreateserial -out otherclient2-crt.pem
pause
