!macro OMUAPPS_OBS_PLUGIN_PATHS
  ReadEnvStr $R0 PROGRAMDATA
  StrCpy $R1 "$R0\obs-studio\plugins\omuapps"
  StrCpy $R2 "$INSTDIR\obs-plugin\omuapps"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  !insertmacro OMUAPPS_OBS_PLUGIN_PATHS
  ${If} ${FileExists} "$R2\bin\64bit\omuapps.dll"
    ClearErrors
    CreateDirectory "$R1\bin\64bit"
    Delete "$R1\bin\64bit\*.old"
    ${If} ${FileExists} "$R1\bin\64bit\omuapps.dll"
      System::Call "kernel32::GetTickCount() i .R3"
      Rename "$R1\bin\64bit\omuapps.dll" "$R1\bin\64bit\omuapps.dll.$R3.old"
    ${EndIf}
    CopyFiles /SILENT "$R2\*" "$R1"
    ${If} ${Errors}
      ExecShellWait "runas" "$SYSDIR\cmd.exe" '/s /c "mkdir "$R1\bin\64bit" & move /y "$R1\bin\64bit\omuapps.dll" "$R1\bin\64bit\omuapps.dll.%RANDOM%.old" & xcopy /e /i /y /q "$R2" "$R1""' SW_HIDE
    ${EndIf}
  ${EndIf}
  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode <> 1
    Push $R0
    Push $R1
    Push $R2
    !insertmacro OMUAPPS_OBS_PLUGIN_PATHS
    RMDir /r "$R1"
    Pop $R2
    Pop $R1
    Pop $R0
  ${EndIf}
!macroend
