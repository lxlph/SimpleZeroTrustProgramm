:: Copyright (c) 2019, Xuan Linh Do

:: This file is part of SimpleZeroTrustProgram.

:: SimpleZeroTrustProgram is free software: you can redistribute it and/or modify
:: it under the terms of the GNU General Public License as published by
:: the Free Software Foundation, either version 3 of the License, or
:: (at your option) any later version.

:: SimpleZeroTrustProgram is distributed in the hope that it will be useful,
:: but WITHOUT ANY WARRANTY; without even the implied warranty of
:: MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
:: GNU General Public License for more details.

:: You should have received a copy of the GNU General Public License
:: along with SimpleZeroTrustProgram.  If not, see <https://www.gnu.org/licenses/>.

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
