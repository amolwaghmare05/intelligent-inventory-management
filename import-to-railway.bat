@echo off
REM Railway MySQL Import Script
REM Replace these values with your Railway MySQL credentials from the Variables tab

set RAILWAY_HOST=shortline.proxy.rlwy.net
set RAILWAY_PORT=40690
set RAILWAY_USER=root
set RAILWAY_PASSWORD=sVfnfsmjmLOTQpbqqqhjPmXXWRaUyLGL
set RAILWAY_DB=railway

echo Importing database to Railway...
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -h %RAILWAY_HOST% -P %RAILWAY_PORT% -u %RAILWAY_USER% -p%RAILWAY_PASSWORD% %RAILWAY_DB% < warehousedb.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Database imported to Railway!
    echo.
    echo Verifying tables...
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -h %RAILWAY_HOST% -P %RAILWAY_PORT% -u %RAILWAY_USER% -p%RAILWAY_PASSWORD% %RAILWAY_DB% -e "SHOW TABLES;"
) else (
    echo.
    echo ERROR: Import failed. Please check your credentials.
)

pause
