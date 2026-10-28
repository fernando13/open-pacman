# SPEC 02: Salida de los fantasmas del pen con puerta de un solo sentido

**Estado:** Implementado  
**Fecha:** 2026-10-27  
**Dependencias:** SPEC 01  
**Objetivo:** Impedir que los fantasmas vuelvan a entrar al pen después de salir, manteniendo la salida escalonada actual.

## Alcance

### En alcance
- Hacer que la puerta del pen (tile `3`) sea de un solo sentido para los fantasmas: pueden atravesarla hacia arriba (salir) pero no hacia abajo (volver a entrar).
- Mantener la salida escalonada actual (`GHOST_EXIT_TIMERS = [ 0, 60, 120, 180 ]`).
- Mantener las posiciones iniciales de `GHOST_STARTS` y el comportamiento de IA de SPEC 01.
- Mantener a Pac-Man bloqueado por la puerta en ambos sentidos.
- Cambios acotados a `src/js/game.js`.

### Fuera de alcance
- Reingreso legítimo al pen (fantasmas comidos / modo ojos).
- Cambios visuales del pen o de la puerta en `src/js/render.js`.
- Ajustar velocidades o timers de salida.
- Power pellets, fantasmas asustados o modos scatter/chase.
- Cambios en `src/js/maze.js`, `src/js/main.js`, UI, tests o tooling.

## Modelo de datos

Este spec no introduce estructuras nuevas. Reutiliza los campos existentes de cada fantasma (`inPen`, `exitTimer`) y el tile `3` del laberinto.

La única regla nueva es una condición sin estado en `canMove`, que ya recibe la dirección:

```js
// La puerta del pen solo se cruza hacia arriba: los fantasmas salen, no entran.
if ( actor === 'ghost' && dir === 'down' ) {
  const inBounds = ty >= 0 && ty < grid.length && tx >= 0 && tx < grid[ 0 ].length;
  if ( inBounds && grid[ ty ][ tx ] === 3 ) return false;
}
```

Convenciones que se mantienen:

- La puerta solo existe en la fila 12, columnas 13 y 14.
- Pac-Man sigue bloqueado por el tile `3` mediante `isWall`.
- Los fantasmas siguen bloqueados únicamente por paredes (tile `1`), salvo la regla de un solo sentido.

## Plan de implementación

1. **Añadir la regla de un solo sentido en `canMove` (`src/js/game.js`)**
   Bloquear el movimiento de un fantasma cuando la celda destino sea tile `3` y la dirección sea `down`, con comprobación de límites antes de indexar `grid`. Verificación manual: cargar `src/index.html` e iniciar partida; los fantasmas salen del pen como hasta ahora.

2. **Revisar la salida con la nueva regla**
   Confirmar que `moveGhost` sigue funcionando: el ascenso por la puerta (`dir === 'up'`) no se bloquea y los fantasmas marcan `inPen = false` al llegar a la fila 11. Verificación manual: los 4 fantasmas terminan fuera del pen.

3. **Revisar el reinicio por muerte**
   Confirmar que `resetPositions` (que recoloca a los fantasmas dentro con `inPen = true`) sigue permitiendo la salida, porque la regla solo bloquea el descenso. Verificación manual: perder una vida y ver que vuelven a salir escalonados.

4. **Documentar la regla**
   Comentario en español junto a la condición de `canMove`, indicando que es una puerta de un solo sentido y que un futuro modo ojos necesitará su propio spec.

## Criterios de aceptación

- [ ] Al iniciar partida, los 4 fantasmas salen del pen y quedan en el laberinto en 5 segundos o menos.
- [ ] Una vez fuera, ningún fantasma vuelve a entrar al pen en al menos 60 segundos de partida.
- [ ] La salida sigue siendo escalonada: los fantasmas no salen todos en el mismo instante.
- [ ] Pac-Man sigue bloqueado por la puerta: no puede entrar al pen.
- [ ] Tras perder una vida, los fantasmas reaparecen en el pen y vuelven a salir escalonados.
- [ ] Las colisiones, la pérdida de vida, la victoria y la derrota siguen funcionando sin errores en consola.
- [ ] Solo se modifica `src/js/game.js`; no se añaden módulos ni cambia el orden de scripts.

## Decisiones tomadas y descartadas

- **Tomada:** puerta de un solo sentido a nivel de `canMove`, sin estado nuevo. Es la regla más simple que resuelve el reingreso y no depende de `inPen`.
- **Tomada:** mantener los timers escalonados actuales. El problema era el reingreso, no la espera.
- **Tomada:** conservar el cruce ascendente para los fantasmas. Bloquear la puerta por completo les impediría salir.
- **Descartada:** teletransportar a los fantasmas fuera del pen al inicio. Rompe la salida escalonada y se aleja del arcade.
- **Descartada:** condicionar el paso a `inPen`. Añade estado y produce la misma regla.
- **Descartada:** reducir `GHOST_EXIT_TIMERS`. No ataca la causa y cambia el ritmo pedido en SPEC 01.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Un fantasma se atasque fuera si su única opción fuese bajar por la puerta | La fila 11 tiene salidas laterales y `decideGhost` ya permite el giro de 180 en callejones; verificar manualmente los 4 fantasmas. |
| Un futuro modo ojos necesite volver al pen | La regla queda aislada y comentada en `canMove`; se condicionará en su propio spec. |
| Indexar `grid` fuera de límites al comprobar la puerta | La comprobación de límites va antes del acceso a `grid[ ty ][ tx ]`. |

## Lo que **no** está en este spec

- Reingreso al pen para fantasmas comidos o modo ojos.
- Rediseño del pen o cambios de dibujo.
- Ajustes de velocidad, timers o IA de los fantasmas.
- Power pellets y fantasmas asustados.
- Tests automatizados o tooling.
