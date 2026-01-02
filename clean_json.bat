@echo off
echo Dra och slapp en JSON-fil pa denna bat, eller kor: clean_json.bat fil.json
echo.
if "%~1"=="" (
    echo Ingen fil angiven!
    pause
    exit /b 1
)
python "%~dp0clean_json.py" "%~1"
pause
