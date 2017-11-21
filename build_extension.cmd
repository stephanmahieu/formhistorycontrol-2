@echo off

set ZIP_FILE=formhistory_2021.zip
set ZIP_APP=7z.exe

rem --(check if xpi exist)-------------------------------------
if not exist %ZIP_FILE% goto continue
echo.
echo -------------------------------------------
echo ZIP file (%ZIP_FILE%) exists!!!
echo -------------------------------------------
echo.
echo Hit CTRL-C to abort, Enter to delete current zip and continue...
pause > nul
del %ZIP_FILE%
:continue

"%ZIP_APP%" a -r -x@zip_exclude_list.txt %ZIP_FILE%
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
pause