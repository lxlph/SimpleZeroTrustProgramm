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

@echo off
call cleanCerts.bat

@echo on
echo ============= set path of the local root CA =============
set CAROOT=%cd%\local-root-CA

echo ============= install root CA =============
 mkcert -install

echo ============= create server certificate =============
mkcert localhost 127.0.0.1 ::1

echo ============= rename cert and key to server-key.pem and server-crt.pem =============
ren localhost+2.pem server-crt.pem
ren localhost+2-key.pem server-key.pem

echo ============= create client certificates =============
mkcert -client client1

echo ============= rename cert and key to server-key.pem and server-crt.pem =============
ren client1-client.pem client1-crt.pem
ren client1-client-key.pem client1-key.pem

:: echo ============= finished =============
pause

