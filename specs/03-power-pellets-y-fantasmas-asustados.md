# SPEC 03: Power pellets y fantasmas asustados

**Estado:** Aprobado  
**Fecha:** 2026-10-27  
**Dependencias:** SPEC 01, SPEC 02  
**Objetivo:** Añadir 4 power pellets que otorgan 50 puntos y activan 6 segundos de fantasmas asustados, comestibles con puntuación escalonada.

## Alcance

### En alcance
- Añadir 4 power pellets en las esquinas clásicas: `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`.
- Comer un pellet suma 50 puntos, decrementa `dotsRemaining` y activa el modo asustado.
- Modo asustado de 360 frames: giro de 180°, dirección aleatoria en cada cruce y velocidad `0.05`.
- Comer un fantasma asustado suma 200/400/800/1600 y lo devuelve al pen.
- Dibujo de pellets grandes y de fantasmas azules con parpadeo en el último segundo.
- Cambios acotados a `src/js/maze.js`, `src/js/game.js` y `src/js/render.js`.

### Fuera de alcance
- Modo ojos y retorno al pen cruzando la puerta (requiere reabrir SPEC 02).
- Modo scatter/chase por fases, crucero de Blinky y cambios de IA normales.
- Cambios en la velocidad de Pac-Man, en `main.js`, en la UI o en las pantallas.
- Avisos flotantes de puntuación, sonidos, animaciones de sprite.
- Tests, tooling o actualización de `README.md` / `AGENTS.md`.

## Modelo de datos

### `src/js/maze.js`
Los pellets no son tiles: son entidades con coordenadas propias.

```js
// Power pellets: las 4 esquinas del nivel 1.
const POWER_PELLETS = [
  { x: 1,  y: 3 },
  { x: 26, y: 3 },
  { x: 1,  y: 23 },
  { x: 26, y: 23 },
];
window.POWER_PELLETS = POWER_PELLETS;
```

En `MAZE_STR`, esas 4 celdas pasan de `'.'` a `' '` para que el pellet sea la única comida de la celda:

```js
'# ####.#####.##.#####.#### #', // 3
'# ..##................##.. #', // 23
```

### `src/js/game.js`
Constantes nuevas:

```js
const POWER_PELLET_POINTS = 50;
const FRIGHTENED_FRAMES = 360;        // 6 s a 60 fps
const FRIGHTENED_FLASH_FRAMES = 60;   // ultimo segundo: parpadeo
const FRIGHTENED_SPEED = 0.05;        // mitad de GHOST_SPEED
const GHOST_EAT_POINTS = [ 200, 400, 800, 1600 ];
```

Estado nuevo en `createGame()`:

```js
powerPellets: POWER_PELLETS.map( ( p ) => ( { x: p.x, y: p.y, eaten: false } ) ),
frightened: 0,     // frames restantes de modo asustado (0 = inactivo)
ghostsEaten: 0,    // fantasmas comidos con el pellet actual
```

Cada fantasma gana un flag de inversión pendiente:

```js
reverse: false,    // pide girar 180 en la proxima celda alineada
```

`dotsRemaining` pasa a contar dots y pellets:

```js
dotsRemaining: dots + POWER_PELLETS.length,
```

Convenciones que se mantienen: posiciones en celdas, velocidades en celdas/frame, alineación con tolerancia `1e-3`.

## Plan de implementación

1. **Añadir `POWER_PELLETS` en `src/js/maze.js`**
   Declarar la lista, exportarla con `window.POWER_PELLETS` y cambiar los 4 `'.'` por `' '` en las filas 3 y 23. Verificación manual: cargar `src/index.html`; las 4 esquinas ya no muestran dot y no hay errores en consola.

2. **Inicializar el estado en `src/js/game.js`**
   Añadir las constantes, `powerPellets`, `frightened`, `ghostsEaten` y el flag `reverse`; sumar los pellets a `dotsRemaining`. Verificación manual: iniciar partida y comprobar en consola que `powerPellets.length === 4` y `frightened === 0`.

3. **Comer el pellet**
   En el bloque alineado de `movePacman`, buscar un pellet no comido en la celda de Pac-Man: marcarlo `eaten`, sumar 50, decrementar `dotsRemaining`, poner `frightened = FRIGHTENED_FRAMES`, resetear `ghostsEaten` y marcar `reverse = true` en todos los fantasmas. Verificación manual: comer una esquina y ver `SCORE +50`; la victoria sigue siendo alcanzable.

4. **Comportamiento asustado**
   En `decideGhost`, si `game.frightened > 0 && !g.inPen`, elegir al azar entre las direcciones válidas. En `moveGhost`, consumir `reverse` en la primera celda alineada si `canMove` lo permite y usar `FRIGHTENED_SPEED` fuera del pen. Verificación manual: los fantasmas dan la vuelta, se mueven lento y deambulan 6 segundos.

5. **Temporizador y colisiones**
   Decrementar `frightened` una vez por frame en `update` antes de resolver colisiones; al llegar a 0, resetear `ghostsEaten`. En el bucle de colisión, si hay modo asustado sumar `GHOST_EAT_POINTS[ Math.min( ghostsEaten, 3 ) ]`, incrementar el combo y devolver al fantasma a su `GHOST_STARTS` con `inPen = true`, `exitTimer = 0` y `reverse = false`. Verificación manual: comer 4 fantasmas con un pellet da 200/400/800/1600 y no resta vida.

6. **Reinicio por muerte**
   En `resetPositions`, poner `frightened = 0`, `ghostsEaten = 0` y `reverse = false` por fantasma; los pellets ya comidos siguen comidos. Verificación manual: perder una vida con fantasmas azules y comprobar que vuelven a la normalidad.

7. **Dibujo en `src/js/render.js`**
   Añadir `drawPowerPellets` (radio 6, `DOT_COLOR`, salta los comidos), pasar `frightened` y `flash` a `drawGhost` y pintar azul `#2121ff` o blanco parpadeante. Exportar `window.FRIGHTENED_FLASH_FRAMES` desde `game.js` para no duplicar el umbral. Verificación manual: pellets visibles y fantasmas azules con parpadeo final.

## Criterios de aceptación

- [ ] La página carga sin errores en consola.
- [ ] Se ven 4 pellets grandes en `(1,3)`, `(26,3)`, `(1,23)` y `(26,23)`, y ninguna de esas celdas muestra dot.
- [ ] Comer un pellet suma exactamente 50 puntos y reduce `dotsRemaining` en 1.
- [ ] Comer un pellet vuelve azules a los 4 fantasmas y les invierte la marcha en su siguiente celda alineada.
- [ ] El modo asustado dura unos 6 segundos y parpadea entre azul y blanco en el último segundo.
- [ ] Durante el modo asustado los fantasmas se mueven a `0.05` celdas/frame y eligen dirección al azar en cada cruce.
- [ ] Tocar un fantasma asustado no resta vida.
- [ ] Las cuatro comidas de un mismo pellet suman 200, 400, 800 y 1600.
- [ ] El fantasma comido reaparece en su celda de `GHOST_STARTS` dentro del pen y vuelve a salir.
- [ ] Un segundo pellet reinicia el temporizador a 360 frames y el combo a 200.
- [ ] Al terminar el modo asustado los fantasmas recuperan color y comportamiento normal.
- [ ] Tocar un fantasma no asustado sigue restando una vida.
- [ ] Tras perder una vida se limpian modo asustado y combo; los pellets comidos siguen comidos.
- [ ] La victoria exige comer todos los dots y los 4 pellets.
- [ ] Los fantasmas del pen se ven azules pero salen por la puerta con ruta y velocidad normales.
- [ ] Solo se modifican `maze.js`, `game.js` y `render.js`; no cambian el orden de scripts ni los módulos.

## Decisiones tomadas y descartadas

- **Tomada:** lista `POWER_PELLETS` en `maze.js` en vez de un tile nuevo. El grid queda solo para geometría y dots; el estado "comido" vive en `game.powerPellets`.
- **Tomada:** quitar el dot de las 4 celdas en `MAZE_STR` y sumar 4 a `dotsRemaining`. Evita doble comida y doble puntuación en la misma celda.
- **Tomada:** 50 puntos por pellet y 200/400/800/1600 por fantasma. Es la escala del arcade y hace que el riesgo compense.
- **Tomada:** 360 frames y velocidad `0.05`. Da margen para cruzar el laberinto sin volver el modo asustado trivial.
- **Tomada:** sin flag por fantasma para el susto; `game.frightened > 0` implica que todos lo están. Menos estado que sincronizar y se limpia solo al llegar a 0.
- **Tomada:** el giro de 180 se aplica en la siguiente celda alineada y solo si `canMove` lo permite. Evita que un fantasma recién salido baje por la puerta del pen, regla de SPEC 02.
- **Tomada:** los fantasmas del pen se ven azules pero salen con ruta y velocidad normales. Evita que queden dando vueltas dentro.
- **Tomada:** el fantasma comido reaparece al instante en su `GHOST_STARTS` con `exitTimer = 0`. No requiere tocar la puerta de un solo sentido ni añadir modo ojos.
- **Tomada:** un segundo pellet reinicia duración y combo. Se lee como jugada nueva, no como acumulación.
- **Tomada:** los pellets comidos persisten al perder una vida; solo se limpian el susto y el combo.
- **Descartada:** tile `4` en `MAZE_STR`. Obligaría a ampliar `parseTile`, `isWall` y `drawDots` y mezclaría comida con geometría.
- **Descartada:** modo ojos con retorno al pen. Exige estado `eaten`, reabrir la puerta de SPEC 02 y más dibujo; merece su propio spec.
- **Descartada:** acumular duración y combo con varios pellets. Alarga el susto sin control.
- **Descartada:** cambiar la velocidad de Pac-Man durante el susto. No se pidió y altera el equilibrio actual.
- **Descartada:** puntuación flotante o aviso al comer un fantasma. El HUD actual basta.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Un fantasma se atasque al invertir la marcha en un callejón | La inversión usa `canMove`; si no es posible se descarta el flag y `decideGhost` resuelve el siguiente movimiento. |
| La inversión meta a un fantasma en el pen por la puerta | Se consume en celda alineada y `canMove` bloquea bajar por tile `3` (SPEC 02). |
| Doble puntuación en las celdas de esquina | Las 4 celdas pasan a `' '` en `MAZE_STR`; el pellet no es tile `2`. |
| La velocidad `0.05` rompa la alineación | `0.05` = 1/20; con tolerancia `1e-3` alinea cada 20 frames. |
| El combo quede alto al terminar el susto | `ghostsEaten` se resetea al llegar a 0 frames y al comer un pellet. |
| El parpadeo dependa de un umbral distinto al del juego | El umbral se exporta como `window.FRIGHTENED_FLASH_FRAMES`; `render.js` solo compara. |

## Lo que **no** está en este spec

- Modo ojos y retorno al pen cruzando la puerta.
- Modo scatter/chase, crucero de Blinky o cambios de IA normal.
- Cambios de velocidad de Pac-Man, UI, sonidos o animaciones de sprite.
- Tests automatizados, tooling o actualización de `README.md` / `AGENTS.md`.
