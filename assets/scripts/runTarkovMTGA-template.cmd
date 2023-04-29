@ECHO OFF
:A
echo Enter MTGA password
set/p "MTGA_PASSWORD=>"
if not "%MTGA_PASSWORD%"=="" (
    echo Running
    rem replace following string
    EXEC_TARKOV_MTGA_COMMAND
) else (
    echo FAILED password is empty
    pause
)

