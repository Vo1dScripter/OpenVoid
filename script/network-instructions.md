# Conexiones fuera de ExpressVPN

OpenCode Proyecto y su Bun/Electron están configurados como Solo VPN en ExpressVPN.
Cuando una tarea de navegación, descarga o ejecución de programas necesite conexión
directa, usa `~/.local/bin/openc-direct <ejecutable> [argumentos...]` desde la
herramienta de terminal. Ejemplos:

```sh
~/.local/bin/openc-direct curl --fail --location https://example.com
~/.local/bin/openc-direct firefox --new-window https://example.com
```

El comando añade una exclusión persistente para ese ejecutable en ExpressVPN;
no desconecta la VPN. Usa el ejecutable real que accede a la red, no un shell,
un lanzador de escritorio o un script intermediario. Si el programa ya estaba
abierto, reinícialo para que aplique su regla; no cierres procesos del usuario
sin autorización. Verifica la salida pública del programa cuando necesites
confirmar su ruta. No afirmes que un navegador o MCP existente cambió de ruta
solo por ejecutar este comando.

El comando rechaza ejecutables que ya tengan una regla Solo VPN. Conserva las
reglas de Bun, Electron y OpenCode. No cambies la ruta del proveedor Zen para
sortear límites gratuitos. No desconectes ExpressVPN ni cambies su configuración
global para ejecutar una tarea directa.
