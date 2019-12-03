#!/bin/bash
echo ============= Create a CA =============
openssl req -new -x509 -days 9999 -config ca.cnf -keyout ca-key.pem -out ca-crt.pem

echo ============= generate a private key for the server =============
openssl genrsa -out server-key.pem 4096

echo ============= generate the certificate signing request =============
openssl req -new -config server.cnf -key server-key.pem -out server-csr.pem

echo ============= sign the request =============
openssl x509 -req -extfile server.cnf -days 999 -passin "pass:password" -in server-csr.pem -CA ca-crt.pem -CAkey ca-key.pem -CAcreateserial -extensions v3_req -out server-crt.pem



pause
