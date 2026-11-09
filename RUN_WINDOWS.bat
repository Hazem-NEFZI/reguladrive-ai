@echo off
setlocal
cd /d "%~dp0"
if not defined REGULADRIVE_MODEL set "REGULADRIVE_MODEL=qwen2.5:3b"
where python >nul 2>&1 || goto missing
where ollama >nul 2>&1 || goto missing
ollama list >nul 2>&1
if errorlevel 1 start "Ollama local" ollama serve
timeout /t 3 /nobreak >nul
ollama show "%REGULADRIVE_MODEL%" >nul 2>&1
if errorlevel 1 (
    echo Premier lancement : telechargement du modele %REGULADRIVE_MODEL%.
    ollama pull "%REGULADRIVE_MODEL%" || goto failed
)
python server.py --open
if errorlevel 1 goto failed
exit /b 0
:missing
echo Installez Python et Ollama, puis rouvrez ce fichier.
pause
exit /b 1
:failed
echo Le lancement a echoue. Consultez le message ci-dessus.
pause
exit /b 1
