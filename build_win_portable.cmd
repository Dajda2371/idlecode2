@echo off

:: Ensure electron-builder is installed
call npm list electron-builder >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing electron-builder...
    call npm install --save-dev electron-builder
)

:: Disable code signing (portable build)
set CSC_IDENTITY_AUTO_DISCOVERY=false

echo Building Windows Portable Executable...
call npm run build:win

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)

echo Build complete! Check 'dist' folder.
