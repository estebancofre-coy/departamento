# Sistema visual de Ficha 8

## Propósito

La interfaz acompaña una conversación de trabajo sobre el Reglamento General Académico. Debe permitir que cada grupo registre ideas sin distraer de la discusión y que la persona facilitadora vea el avance conjunto. El diseño prioriza lectura clara, controles reconocibles y una estructura sobria apropiada para una reunión institucional.

## Lenguaje visual

- **Tono:** institucional, colaborativo y directo; evitar el aspecto de una planilla administrativa.
- **Jerarquía:** azul marino para la identidad y los títulos; azul para acciones; superficies claras y bordes finos para separar áreas de trabajo.
- **Semáforo:** Mantener usa verde, Revisar ámbar, Modificar naranja e Incorporar violeta. Cada opción conserva su etiqueta textual; el color no es la única señal.
- **Superficies:** fondo gris azulado suave y paneles blancos para los formularios. Usar sombras solo en el acceso del panel de facilitación.
- **Forma:** controles casi cuadrados, con esquinas de 3 px y contornos visibles.

## Tokens

La fuente de verdad es `Styles.html`; el espejo consumible por herramientas está en `.impeccable/design.json`.

### Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--ink` | `#152a3b` | Texto y títulos principales |
| `--ink-soft` | `#435769` | Texto de apoyo |
| `--muted` | `#657789` | Ayudas, metadatos y estados secundarios |
| `--line` | `#d6e0e8` | Separadores |
| `--line-strong` | `#b9c8d4` | Contornos de controles y paneles |
| `--paper` | `#f4f7fa` | Fondo general |
| `--surface` | `#ffffff` | Formularios y paneles |
| `--navy` | `#173852` | Barra superior |
| `--blue` / `--blue-dark` | `#1765c0` / `#104c92` | Acciones y enlaces |
| `--green` / `--green-pale` | `#14764d` / `#e6f5ed` | Mantener y estados abiertos |
| `--amber` / `--amber-pale` | `#9b6308` / `#fff3d6` | Revisar |
| `--orange` / `--orange-pale` | `#a8421d` / `#fff0e9` | Modificar |
| `--purple` / `--purple-pale` | `#6842a4` / `#f1ecfa` | Incorporar |
| `--danger` / `--danger-pale` | `#a12e36` / `#fff0f0` | Errores y acciones destructivas |

### Tipografía y forma

- Familias: `Public Sans` (interfaz y lectura) y `Source Serif 4` (títulos `h1`–`h3`, insignias de grupo y numeración), cargadas desde Google Fonts con alternativas del sistema.
- Base: `16px`; títulos con peso y tamaño fluidos; etiquetas compactas, pero legibles.
- Lectura de párrafos y campos: interlineado de `1.5` a `1.6`; textos extensos pueden envolver palabras.
- Bordes: `3px` de radio en controles, botones, insignias y paneles; los paneles con borde superior de acento (inicio de sesión, editor) no llevan radio.
- Sombras: `0 8px 24px rgba(21, 42, 59, .08)` reservada para el inicio de sesión, el editor de la ficha y el enlace recién creado.

### Espaciado y composición

- Contenido centrado con ancho máximo de `1440px`; márgenes laterales responsivos mediante `clamp()`.
- Cuadrícula de facilitación: lista de grupos y creación de grupos en dos columnas; en pantallas de hasta `640px`, pasa a una columna.
- Ficha grupal: editor principal y respaldos laterales en escritorio; en pantallas de hasta `900px`, se apilan.
- El editor dispone campos en dos columnas cuando hay espacio y los apila en móvil; las cuatro opciones del semáforo pasan de una fila a una cuadrícula de dos columnas hasta `640px`.
- Controles interactivos mantienen un mínimo de `44px` de alto para facilitar el uso táctil.

## Componentes y comportamiento

- **Barra superior:** identidad del reglamento y contexto de la ficha; en escritorio puede incluir estado y cierre de sesión.
- **Portada:** título del reglamento, pregunta orientadora y dos accesos (facilitación con botón; grupos con indicación de usar su enlace), seguidos del ritmo de la reunión y la clave de la Ficha 8. Es la vista por defecto sin sesión ni enlace de grupo; cerrar sesión vuelve a ella.
- **Acceso de facilitación:** tarjeta de código con "Volver al inicio", junto a "Cómo funciona la mesa" (tres pasos); se apila bajo `900px`.
- **Panel facilitador:** indicadores generales, barra apilada con la distribución del semáforo en todos los grupos, filas de grupo con insignia numérica, porcentaje y estado, acciones de acceso y controles para crear grupos.
- **Enlace creado:** aviso a todo el ancho bajo el encabezado con copiar, abrir y ocultar; recibe foco solo al crear o renovar un enlace.
- **Editor Ficha 8:** cuatro opciones del semáforo con punto de color, nombre y descripción breve; seis campos originales y acción explícita de guardar.
- **Respaldos:** enlaces de archivos con nombre y tamaño, junto a una acción clara para adjuntar material al grupo o a una observación.
- **Estados:** estados de guardado y sincronización, errores accionables, avisos de conflicto y ficha cerrada se distinguen de la edición normal.
- **Guía de facilitación:** contenido secundario plegable para consultar el inicio, agenda, priorización, ejes y casos sin competir con el registro.

## Accesibilidad y adaptación

- Usar etiquetas asociadas a controles, semántica HTML y mensajes de estado accesibles; conservar indicadores `:focus-visible`.
- Respetar `prefers-reduced-motion` y mantener contraste legible en etiquetas y controles.
- Las etiquetas del semáforo y los textos de estado siempre acompañan al color.
- Probar en escritorio y móvil; evitar depender de interacciones de hover, mantener objetivos táctiles amplios y permitir que el contenido textual se ajuste al ancho disponible.

## Mantenimiento

Editar primero las variables CSS de `Styles.html` y mantener sincronizado `.impeccable/design.json` y esta guía cuando cambien los tokens o las reglas visuales. Los cambios en componentes deben conservar los nombres y el significado acordados para los cuatro estados del semáforo y los seis campos de la Ficha 8.
