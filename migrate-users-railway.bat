@echo off
REM Script to run users table migration on Railway MySQL

echo Creating users table in Railway database...
echo.

REM Get Railway MySQL credentials from Railway dashboard
REM Service: MySQL at shortline.proxy.rlwy.net:40690

mysql -h shortline.proxy.rlwy.net -P 40690 -u root -p warehousedb < migrations\create_users_table.sql

echo.
echo Migration completed!
pause
