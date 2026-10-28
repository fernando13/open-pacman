# SPEC 01: Cuatro fantasmas con comportamientos clásicos

**Estado:** Aproved  
**Fecha:** 2026-10-27  
**Dependencias:** Ninguna  
**Objetivo:** Añadir 4 fantasmas al estilo clásico de Pac-Man con comportamientos distintos, con Blinky persiguiendo agresivamente a Pac-Man y salida escalonada desde el cuarto de los fantasmas.

## Alcance

### En alcance
- Añadir 4 fantasmas: Blinky (rojo), Pinky (rosa), Inky (cian), Clyde (naranja).
- Asignarles comportamientos clásicos diferenciados.
- Hacer que Blinky persiga agresivamente a Pac-Man (objetivo = posición actual de Pac-Man).
- Colocarlos en celdas distintas dentro del cuarto de los fantasmas al iniciar partida.
- Implementar salida escalonada desde el cuarto (no todos al mismo tiempo).
- Mantener colisiones con Pac-Man, pérdida de vida, reinicio de posiciones y condiciones de victoria/derrota.
- Seguir la arquitectura actual (globals, orden de scripts, sin módulos). Cambios mínimos en `src/js/maze.js`, `src/js/game.js`, `src/js/render.js`.

### Fuera de alcance
- Modo scatter/chase por fases con temporizadores globales complejos.
- Poderes (power pellets), fantasmas asustados/azules/retornando.
- Animaciones especiales de salida o caminos alternativos.
- Cambios en `main.js` o en la interfaz salvo lo estrictamente necesario.
- Añadir tests o tooling.

## Modelo de datos

### `src/js/maze.js`
Actualizar `GHOST_STARTS` para tener 4 entradas con nombres/tipos clásicos:

```js
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'blinky' }, // rojo - perseguidor agresivo
  { x: 14, y: 14, kind: 'pinky'  }, // rosa - emboscador
  { x: 12, y: 14, kind: 'inky'   }, // cian - flanqueador
  { x: 15, y: 14, kind: 'clyde'  }, // naranja - vagabundo
];
```

Las posiciones se colocan en el interior del cuarto de los fantasmas (coherentes con la geometría actual). Se verifica que sean transitables para fantasmas.

### `src/js/game.js`
Ampliar el estado de cada fantasma para soportar salida escalonada:

```js
ghosts: GHOST_STARTS.map( ( g, i ) => ( {
  x: g.x,
  y: g.y,
  dir: 'up',
  speed: GHOST_SPEED,
  kind: g.kind,
  inPen: true,        // empieza dentro del cuarto
  exitTimer: 0,       // frames/según lógica; se inicializa con retraso escalonado
} ) ),
```

Valores sugeridos para `exitTimer` (escalonados, en frames o en unidades acordes al bucle): por ejemplo `blinky: 0` (sale primero o inmediatamente), `pinky: 60`, `inky: 120`, `clyde: 180` (valores aproximados; ajustar si se prefiere otra cadencia). Los timers se inicializan en `createGame()` y se resetean en `resetPositions()`.

Comportamientos por tipo en `decideGhost(game, g)`:

- **blinky**: Objetivo = posición actual de Pac-Man redondeada `(Math.round(p.x), Math.round(p.y))`. Elegir entre direcciones válidas (sin volver atrás, aplicando regla de callejón si no hay opciones) la que minimice distancia Manhattan al objetivo.
- **pinky**: Objetivo = 4 tiles por delante de Pac-Man en la dirección actual de Pac-Man: `(px + 4*dx_p, py + 4*dy_p)`. Elegir dirección que minimice distancia Manhattan a ese objetivo.
- **inky**: Objetivo = 2* (tile delante de Pac-Man) - posición de Blinky. Para calcularlo: obtener posición de Blinky en `game.ghosts` (buscar por `kind === 'blinky'`), calcular tile 2 pasos por delante de Pac-Man `(px + 2*dx_p, py + 2*dy_p)`, objetivo = `(2*ahead.x - blinky.x, 2*ahead.y - blinky.y)`. Elegir dirección que minimice distancia Manhattan a ese objetivo. (Implementación simplificada pero fiel al espíritu clásico.)
- **clyde**: Calcular distancia Manhattan entre Clyde y Pac-Man. Si `dist > 8`, perseguir como Blinky (hacia posición actual de Pac-Man). Si `dist <= 8`, dirigirse hacia la esquina inferior-izquierda del laberinto (objetivo scatter, e.g. `(0, 30)` o la esquina válida más cercana) eligiendo la dirección que minimice distancia Manhattan a esa esquina.

Salida escalonada:
- Mientras `g.inPen && g.exitTimer > 0`: decrementar timer (en `moveGhost` o en `update`), no forzar salida inmediata.
- Cuando `g.exitTimer <= 0` y está en el pen: permitir salir hacia fuera del área del pen atravesando la puerta (los fantasmas no están bloqueados por tile 3). Una vez fuera, `g.inPen = false`. El movimiento sigue las reglas normales de fantasmas.

`resetPositions(game)`: reposicionar cada fantasma según `GHOST_STARTS[i]`, resetear `dir` a `up`, resetear `inPen = true`, reasignar `exitTimer` con los valores escalonados correspondientes.

### `src/js/render.js`
Sin cambios estructurales obligatorios. Mantener el mapeo actual de colores por índice (`GHOST_COLORS[i]`) que ya provee los 4 colores clásicos en orden. Con los 4 tipos asignados a las 4 entradas de `GHOST_STARTS` en el orden rojo/rosa/cian/naranja, los colores coincidirán. Si fuera necesario, se puede ajustar el mapeo, pero lo ideal es no cambiar `render.js` salvo que sea imprescindible.

## Plan de implementación

1. **Actualizar `src/js/maze.js`**  
   Reemplazar `GHOST_STARTS` con 4 entradas (`blinky`, `pinky`, `inky`, `clyde`) en posiciones distintas dentro del pen.

2. **Ampliar estado de fantasmas en `src/js/game.js`**  
   Modificar `createGame()` para añadir `inPen` y `exitTimer` por fantasma con valores escalonados. Añadir lógica de timers en `moveGhost()` o `update()`.

3. **Implementar IA por tipo en `src/js/game.js`**  
   Reescribir/expandir `decideGhost()` para soportar `blinky`, `pinky`, `inky`, `clyde` con los objetivos descritos. Mantener la regla de no volver atrás y el comportamiento en callejón.

4. **Implementar salida escalonada**  
   Añadir lógica para salir del pen cuando el timer expira (los fantasmas pueden cruzar la puerta). Marcar `inPen = false` al salir.

5. **Actualizar `resetPositions()`**  
   Resetear `inPen` y `exitTimer` al reiniciar tras perder vida.

6. **Verificación manual**  
   Cargar `src/index.html`, iniciar partida, comprobar que hay 4 fantasmas con colores distintos, que Blinky persigue activamente, que salen por turnos con retraso, que las colisiones funcionan y que no hay errores en consola.

## Criterios de aceptación

- [ ] `GHOST_STARTS` tiene exactamente 4 entradas con tipos `blinky`, `pinky`, `inky`, `clyde`.
- [ ] Al iniciar una partida hay exactamente 4 fantasmas en `game.ghosts`.
- [ ] Blinky (rojo) elige direcciones que tienden a acercarse a la posición actual de Pac-Man (persecución agresiva).
- [ ] Pinky (rosa) apunta hacia una posición por delante de Pac-Man.
- [ ] Inky (cian) usa la posición de Blinky y la posición por delante de Pac-Man para calcular su objetivo.
- [ ] Clyde (naranja) alterna entre perseguir y huir hacia la esquina inferior-izquierda según la distancia a Pac-Man (>8 persigue, <=8 huye).
- [ ] Los 4 fantasmas aparecen dentro del cuarto de los fantasmas al inicio.
- [ ] La salida es escalonada (no todos salen al mismo tiempo; hay retrasos distintos).
- [ ] Los fantasmas pueden atravesar la puerta del pen al salir (no bloqueados por tile 3).
- [ ] Las colisiones entre Pac-Man y cualquier fantasma restan vida y reinician posiciones correctamente.
- [ ] El juego sigue funcional (ganar/perder, reinicio) sin errores en consola.
- [ ] Solo se modifican `src/js/maze.js`, `src/js/game.js` y, si fuera estrictamente necesario, `src/js/render.js`. No se añaden módulos ni se cambia el orden de scripts.

## Decisiones tomadas y descartadas

- **Tomada:** Comportamientos clásicos (Blinky/Pinky/Inky/Clyde). Se elige por ser reconocible y dar 4 personalidades distintas.
- **Tomada:** Blinky persigue agresivamente la posición actual de Pac-Man (objetivo directo). Coherente con la petición de "perseguir agresivamente".
- **Tomada:** Salida escalonada con timers por fantasma. Más fiel al clásico que salida simultánea.
- **Tomada:** Mantener arquitectura vanilla (globals). Se ajusta a las convenciones del proyecto.
- **Descartada:** Modo scatter/chase con ciclos temporales globales. Añade complejidad y queda fuera del alcance para este cambio.
- **Descartada:** Power pellets/fantasmas asustados. No solicitados.
- **Descartada:** Lógica compleja de "cruise elroy" para Blinky. Se implementa persecución directa simple y efectiva.

## Riesgos identificados

- **Cálculo de Inky:** Requiere acceso a la instancia de Blinky en `game.ghosts`. Si Blinky no existe (error de inicialización), hay que tener un fallback (comportarse como random).
- **Salida del pen:** La puerta es tile 3; los fantasmas no están bloqueados por ella, lo cual es correcto. Hay que asegurar que la lógica de `canMove` no impida salir.
- **Timers y reinicio:** Al perder una vida se llama `resetPositions()`; hay que resetear `inPen` y `exitTimer` correctamente para que vuelvan a salir escalonadamente.
- **Posiciones iniciales:** Verificar que las celdas elegidas en el pen sean transitables para fantasmas (no muros). El interior del pen actual es mayoritariamente espacio vacío (tile 0).
