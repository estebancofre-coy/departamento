# departamento

Herramienta web para dirigir la reunión de revisión de la propuesta de Reglamento General Académico y registrar la Ficha 8 por grupo.

## Qué incluye

- Un panel de facilitación protegido por un código separado, para crear grupos, revisar aportes y cerrar o reabrir fichas.
- Un enlace independiente por grupo. Las personas del grupo comparten la misma ficha y pueden completar las observaciones desde sus dispositivos.
- Los seis campos originales de la Ficha 8 y el semáforo Mantener / Revisar / Modificar / Incorporar.
- Archivos generales del grupo o adjuntos a una observación: documentos, imágenes y audio de hasta 25 MB.
- Google Sheets como registro y Google Drive como almacenamiento de los archivos.

El avance mostrado corresponde al porcentaje de campos completos entre las observaciones guardadas. La página consulta cambios nuevos cada 10 segundos. Si dos personas editan simultáneamente la misma observación, la versión más reciente se conserva y se informa del conflicto antes de sobrescribirla.

## Instalación y publicación

1. Abre el libro de Google Sheets cuya ID se configuró en `Code.gs`.
2. Selecciona **Extensiones → Apps Script**. En el proyecto asociado, crea o reemplaza `Code.gs` y agrega los archivos HTML `Index`, `Styles` y `Client` con el contenido de este repositorio.
3. En **Configuración del proyecto**, habilita la visualización del archivo de manifiesto `appsscript.json` y reemplázalo por el de este repositorio.
4. En el editor de Apps Script, selecciona y ejecuta `setupFicha8`. Acepta los permisos de Sheets y Drive. En el registro de ejecución, copia el código de facilitación que se genera la primera vez; no vuelve a mostrarse.
5. Selecciona **Implementar → Nueva implementación → Aplicación web**. Configura **Ejecutar como: yo** y **Quién tiene acceso: cualquier persona** (o la opción anónima equivalente que ofrezca la cuenta). Implementa y copia la URL.
6. Abre la URL e ingresa el código de facilitación. Crea los grupos y comparte a cada uno su enlace independiente.

Si se modifica el código después de publicarlo, crea una nueva versión desde **Implementar → Administrar implementaciones → Editar → Nueva versión**; así la URL `/exec` y los enlaces de grupo se mantienen. Una **Nueva implementación** genera otra URL e invalida los enlaces ya compartidos. Para invalidar un código de facilitación perdido, ejecuta `resetFacilitatorCode` desde el editor y copia el nuevo código del registro de ejecución.

La sesión de facilitación dura 6 horas; después, el panel vuelve a pedir el código.

## Acceso y privacidad

La aplicación no pide inicio de sesión a quienes usan los enlaces de grupo. Cada enlace es una credencial: compártelo solo con el grupo correspondiente. El panel necesita el código de facilitación. Los archivos subidos se comparten en Drive con permiso **cualquier persona con el enlace puede ver**, para que puedan abrirse sin iniciar sesión; quien obtenga el enlace directo al archivo también podrá verlo. La hoja de respuestas y la carpeta de Drive quedan bajo la cuenta que ejecutó la configuración y publicó la aplicación.

La política de Google Workspace puede bloquear el acceso anónimo o el uso compartido público de archivos. Si ocurre, la implementación o la carga mostrará el error; un administrador de Workspace tendrá que autorizar esa modalidad. No cargues datos personales sensibles ni información que no deba quedar accesible mediante un enlace.

## Sistema visual

La guía de diseño de la interfaz está en [`DESIGN.md`](DESIGN.md); sus tokens reutilizables se mantienen en [`.impeccable/design.json`](.impeccable/design.json) y se implementan en `Styles.html`.

## Estructura de datos

`setupFicha8` crea —sin borrar pestañas existentes— las pestañas `Grupos`, `Observaciones` y `Archivos`, además de una carpeta en Drive para los respaldos. Si una pestaña con uno de esos nombres ya tiene encabezados distintos, la configuración se detiene para proteger sus datos. El código de grupo se guarda como hash, no como texto abierto en la hoja.
