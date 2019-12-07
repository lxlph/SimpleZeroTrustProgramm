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

cd cert\
call generateCertsWithMkcert.bat
cd OtherCerts\
call generateOtherCerts.bat

pause
