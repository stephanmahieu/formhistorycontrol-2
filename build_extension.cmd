@echo off

set ZIP_FILE=formhistory_200.zip


rem --(check if xpi exist)-------------------------------------
if not exist %ZIP_FILE% goto continue
echo.
echo -------------------------------------------
echo ZIP file (%ZIP_FILE%) exists!!!
echo -------------------------------------------
echo.
echo Hit CTRL-C to abort, Enter to continue...
pause > nul
del %ZIP_FILE%
:continue

7z.exe a -r %ZIP_FILE% manifest.json _locales background common content contextmenu icons options popup
if errorlevel 1 goto error

goto okay
:error
echo.
echo ===============
echo Error detected!
echo ===============
pause
goto end

:okay
echo.
echo --------
echo Finished
echo --------
echo.
:end