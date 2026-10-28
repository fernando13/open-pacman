// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS, POWER_PELLETS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Power pellets y modo asustado.
const POWER_PELLET_POINTS = 50;
const FRIGHTENED_FRAMES = 360;        // 6 s a 60 fps
const FRIGHTENED_FLASH_FRAMES = 60;   // ultimo segundo: parpadeo
const FRIGHTENED_SPEED = 0.05;        // mitad de GHOST_SPEED
const GHOST_EAT_POINTS = [ 200, 400, 800, 1600 ];

// Retrasos escalonados de salida del pen, en frames (0 = sale de inmediato).
const GHOST_EXIT_TIMERS = [ 0, 60, 120, 180 ];

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    // Los pellets tambien son comida: la victoria exige comer los 4.
    dotsRemaining: dots + POWER_PELLETS.length,
    grid,
    powerPellets: POWER_PELLETS.map( ( p ) => ( { x: p.x, y: p.y, eaten: false } ) ),
    frightened: 0,     // frames restantes de modo asustado (0 = inactivo)
    ghostsEaten: 0,    // fantasmas comidos con el pellet actual
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g, i ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      inPen: true, // empieza dentro del cuarto
      exitTimer: GHOST_EXIT_TIMERS[ i ] || 0,
      reverse: false, // pide girar 180 en la proxima celda alineada
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  // Puerta del pen de un solo sentido: los fantasmas la cruzan hacia arriba
  // para salir, pero no pueden bajar por el tile 3 para volver a entrar.
  // El reingreso del futuro modo ojos necesitara su propio spec y condicionar
  // esta regla (por ejemplo, permitir bajar solo si el fantasma va comido).
  if ( actor === 'ghost' && dir === 'down' ) {
    const inBounds = ty >= 0 && ty < grid.length && tx >= 0 && tx < grid[ 0 ].length;
    if ( inBounds && grid[ ty ][ tx ] === 3 ) return false;
  }
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Comer power pellet: activa el susto y pide giro de 180 a los fantasmas.
    const pellet = game.powerPellets.find(
      ( pp ) => !pp.eaten && pp.x === p.x && pp.y === p.y
    );
    if ( pellet ) {
      pellet.eaten = true;
      game.score += POWER_PELLET_POINTS;
      game.dotsRemaining--;
      game.frightened = FRIGHTENED_FRAMES;
      game.ghostsEaten = 0;
      game.ghosts.forEach( ( g ) => {
        g.reverse = true;
      } );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ OPPOSITE[ g.dir ] ];

  // Asustado fuera del pen: deambula al azar, sin objetivo.
  if ( game.frightened > 0 && !g.inPen ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const pd = DIRS[ p.dir ] || { x: 0, y: 0 };
  let target = null;

  if ( g.kind === 'blinky' ) {
    // Persigue la posicion actual de Pac-Man.
    target = { x: px, y: py };
  } else if ( g.kind === 'pinky' ) {
    // Apunta 4 tiles por delante de Pac-Man.
    target = { x: px + pd.x * 4, y: py + pd.y * 4 };
  } else if ( g.kind === 'inky' ) {
    // Objetivo = 2 * (2 tiles por delante de Pac-Man) - posicion de Blinky.
    const blinky = game.ghosts.find( ( other ) => other.kind === 'blinky' );
    if ( blinky ) {
      const aheadX = px + pd.x * 2;
      const aheadY = py + pd.y * 2;
      target = {
        x: aheadX * 2 - Math.round( blinky.x ),
        y: aheadY * 2 - Math.round( blinky.y ),
      };
    }
  } else if ( g.kind === 'clyde' ) {
    const gx = Math.round( g.x );
    const gy = Math.round( g.y );
    const dist = Math.abs( gx - px ) + Math.abs( gy - py );
    if ( dist > 8 ) {
      target = { x: px, y: py }; // persigue como Blinky
    } else {
      target = { x: 0, y: 30 }; // huye hacia la esquina inferior-izquierda
    }
  }

  // Sin objetivo (tipo desconocido o Inky sin Blinky): movimiento aleatorio.
  if ( !target ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );

    if ( g.inPen ) {
      // Espera su turno dentro del cuarto; el timer corre en update().
      if ( g.exitTimer > 0 ) return;
      // Turno cumplido: caminar hasta la columna de la puerta y subir por ella.
      // Los fantasmas no estan bloqueados por el tile 3 (puerta).
      if ( g.x !== 13 && g.x !== 14 ) {
        g.dir = g.x < 13 ? 'right' : 'left';
      } else if ( g.y > 11 ) {
        g.dir = 'up';
      } else {
        g.inPen = false; // ya fuera del pen
        decideGhost( game, g );
      }
      if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
    } else if ( g.reverse ) {
      // Giro de 180 pedido por el pellet: se consume en la primera celda
      // alineada y solo si esa direccion es transitable. No se llama a
      // decideGhost para que el fantasma siga de verdad en sentido contrario.
      g.reverse = false;
      const back = OPPOSITE[ g.dir ];
      if ( canMove( grid, g.x, g.y, back, 'ghost' ) ) g.dir = back;
      if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
    } else {
      decideGhost( game, g );
      if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
    }
  }

  const d = DIRS[ g.dir ];
  // Durante el susto se mueven a mitad de velocidad, pero el pen conserva
  // su ruta y velocidad normales para poder salir.
  const speed = game.frightened > 0 && !g.inPen ? FRIGHTENED_SPEED : GHOST_SPEED;
  g.x += d.x * speed;
  g.y += d.y * speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  // Tras perder una vida se limpian el susto y el combo; los pellets ya
  // comidos siguen comidos.
  game.frightened = 0;
  game.ghostsEaten = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.inPen = true;
    g.exitTimer = GHOST_EXIT_TIMERS[ i ] || 0;
    g.reverse = false;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  // Timers de salida escalonada: solo cuentan mientras el fantasma espera en el pen.
  game.ghosts.forEach( ( g ) => {
    if ( g.inPen && g.exitTimer > 0 ) g.exitTimer--;
  } );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  // El susto dura FRIGHTENED_FRAMES; al agotarse se limpia el combo.
  if ( game.frightened > 0 ) {
    game.frightened--;
    if ( game.frightened === 0 ) game.ghostsEaten = 0;
  }

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      // Fantasma asustado: se lo come y vuelve al pen al instante.
      if ( game.frightened > 0 ) {
        game.score += GHOST_EAT_POINTS[ Math.min( game.ghostsEaten, 3 ) ];
        game.ghostsEaten++;
        const start = GHOST_STARTS.find( ( s ) => s.kind === g.kind );
        g.x = start.x;
        g.y = start.y;
        g.dir = 'up';
        g.inPen = true;
        g.exitTimer = 0;
        g.reverse = false;
        continue;
      }
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
// Umbral de parpadeo compartido con render.js (no duplicar el numero).
window.FRIGHTENED_FLASH_FRAMES = FRIGHTENED_FLASH_FRAMES;
