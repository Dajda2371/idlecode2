@echo off
setlocal

echo Starting build process for Windows...

:: Ensure dependencies are installed
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

:: Build for Windows
:: --win: Windows (portable exe as configured in package.json)
:: --x64: Intel/AMD 64-bit
:: --arm64: ARM 64-bit
call npx electron-builder --win --x64 --arm64
if %errorlevel% neq 0 exit /b %errorlevel%

:: Note: Building for macOS/Linux on Windows usually requires Docker or WSL.
:: If you have Docker installed, you can uncomment the following line to build for Linux:
:: call npx electron-builder --linux --x64 --arm64

echo Build complete! Artifacts are in the dist/ directory.
endlocal
