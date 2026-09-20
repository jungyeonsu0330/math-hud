@echo off
title Gemini Math Live HUD - 정식 공인 HTTPS 터널링
cd /d "%~dp0"
echo ==================================================================
echo   Gemini Math Live HUD - 정식 공인 HTTPS 터널링 (공인 SSL)
echo ==================================================================
echo.
echo [안내] 사설 인증서 경고 및 Wi-Fi 방화벽 없이 정식 HTTPS 주소로 연결합니다.
echo        잠시 후 화면에 출력되는 "url: https://xxxx.loca.lt" 주소로
echo        태블릿 브라우저에서 접속하시면 마이크가 즉시 정상 작동합니다!
echo.
echo 터널 생성 중... 잠시만 기다려주세요.
echo ==================================================================
npx -y localtunnel --port 8085
pause
