@echo off
REM ====================================================
REM  Simple CMS reset script for development only
REM  Deletes all uploads and file records safely
REM ====================================================

echo ⚠️  This will DELETE all uploaded files and DB records.
echo Ensure you are in development mode and not touching production!
echo.

REM Run the cleanup script
node utils/cleanUploadsAndDB.js

echo.
echo ✅ Reset script finished.
pause
