@echo off
title Gemini Math Live HUD - 통합 서버
cd /d "%~dp0"
echo ==================================================================
echo   Gemini Math Live HUD - 통합 서버 (HTTP & HTTPS)
echo ==================================================================
echo.
echo 서버 실행 중... 잠시만 기다려주세요.
echo ==================================================================
python server.py
pause
