@echo off

:: Ensure electron-builder is installed
call npm list electron-builder >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing electron-builder...
    call npm install --save-dev electron-builder
)

echo Building Windows Portable Executable...
call npm run build:win

echo Build complete! Check 'dist' folder.
