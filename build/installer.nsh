; Cotizaciones — NSIS: cierre de la app y desinstalación en actualizaciones automáticas
; Evita "Installer integrity check has failed" en instaladores generados desde macOS
CRCCheck off

!macro customCloseApp
  DetailPrint "Cerrando ${PRODUCT_NAME}..."
  nsExec::ExecToLog 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  Sleep 2500
!macroend

!macro customUnInstallCheck
  ; Sin comprobación extra (evita falsos positivos con el proceso aún liberando archivos)
!macroend

!macro customRemoveFiles
  DetailPrint "Eliminando versión anterior..."
  RMDir /r "$INSTDIR"
!macroend
