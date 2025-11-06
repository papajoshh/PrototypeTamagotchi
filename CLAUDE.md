# 🤖 Guía Claude para Tamagotchi Web Prototype

*Última actualización: 2025-01-05*
*Archivo principal de contexto para agentes de IA*

## 📋 Contexto Rápido del Proyecto

**🎯 Qué es**: Prototipo web del juego Tamagotchi para validación rápida de mecánicas antes de implementarlas en Unity
**🏗️ Tecnología**: TypeScript + Vite + Canvas 2D
**👥 Equipo**: Desarrollo individual con apoyo de IA
**📱 Plataforma**: Web (navegador)
**🔗 Relación**: Prototipo simplificado del proyecto Unity principal (`D:\Repositorios\Michi Games\Tamagotchi`)
**🎯 Propósito**: Experimentar y validar ideas/mecánicas rápidamente antes de su implementación definitiva en Unity

## 🚀 Estado Actual del Proyecto

### ✅ Implementado
- **Sistema Pet Core**: Hambre, aburrimiento, enfermedad, caca, ciclo de vida
  - **Huevo (Egg)**: Estado inerte sin necesidades, no puede comer/jugar/morir. Solo espera ser tapeado para eclosionar.
  - **Baby+**: Pet nace con 1 estrella de hambre y 1 de diversión al eclosionar
- **Sistema de Ingredientes**: Inventario, tiers (1-3), personalidades
  - Tier 1: +1 estrella, Tier 2: +2 estrellas, Tier 3: +3 estrellas
- **Sistema de Comida**: Mochis con combinación de ingredientes
- **Sistema de Habitaciones**: 6 estilos de decoración por personalidad
- **Minijuegos**:
  - **TheButton** (Anxious): Tap rápido con probabilidad decreciente
  - **EdgyBunBun** (Edgy): Plataformer vertical con plataformas procedurales
  - **SimonDice** (Intelectual): Memoria - Repite secuencias de 3 botones únicos que se barajan
  - **Parachute** (Sassy): Recolección - Mueve canasta para recoger objetos buenos y evitar malos
- **UI Main Room**: Interfaz completa con menús desplegables para comida, juego y decoración
- **Sistema de Settings**: Panel completo con configuración de audio, sueño, notificaciones
  - **Sleep System**: Modo automático/manual, horario configurable, pantalla de sueño, despertar temporal
  - **SettingsUI**: Panel independiente con toggles, sliders, popups, warnings
- **Sistema de Notificaciones**: Push notifications para eventos críticos
- **Persistencia**: LocalStorage con serialización/deserialización
- **Simulación Offline**: Calcula progreso cuando el jugador está ausente
- **PWA (Progressive Web App)**: Instalable en móvil, funciona offline, service worker
  - **Desplegado en Vercel**: https://tamagotchi-prototype.vercel.app
  - **Canvas Responsive**: Mantiene aspect ratio 3:4 en todos los dispositivos

### 🚧 En Desarrollo
- Más minijuegos (Higher or Lower)
- Sistema de evolución completo
- Balance económico de ingredientes

## 📁 Estructura del Proyecto

```
tamagotchi-web-prototype/
├── src/
│   ├── core/                    # Lógica de dominio
│   │   ├── Pet.ts              # Entidad principal
│   │   ├── Hunger.ts           # Need: Hambre
│   │   ├── Boring.ts           # Need: Aburrimiento
│   │   ├── Illness.ts          # Need: Enfermedad
│   │   ├── Poop.ts             # Need: Caca
│   │   ├── Ingredient.ts       # Sistema de ingredientes
│   │   ├── IngredientInventory.ts
│   │   ├── Personality.ts      # Sistema de personalidades
│   │   ├── LifeStage.ts        # Ciclo de vida
│   │   ├── Memory.ts           # Sistema de memorias
│   │   ├── MemorySystem.ts
│   │   ├── RoomStyle.ts        # Estilos de habitación
│   │   ├── NotificationSystem.ts
│   │   ├── Settings.ts         # Sistema de configuraciones
│   │   ├── Sleep.ts            # Sistema de sueño
│   │   └── GameLoop.ts         # Loop principal
│   │
│   ├── ui/
│   │   ├── GameUI.ts           # Interfaz gráfica principal
│   │   └── SettingsUI.ts       # Panel de configuraciones
│   │
│   ├── minigames/              # Minijuegos
│   │   └── theButton/
│   │       ├── TheButtonGame.ts    # Lógica del juego
│   │       ├── TheButtonUI.ts      # Renderizado
│   │       └── TheButtonRewards.ts # Sistema de premios
│   │
│   └── main.ts                 # Entry point
│
├── public/
│   └── assets/                 # Sprites y recursos
│       ├── pets/              # Sprites de mascotas por stage/personality
│       ├── rooms/             # Fondos de habitaciones
│       ├── ingredients/       # Iconos de ingredientes
│       ├── styles/            # Iconos de estilos
│       └── minigames/         # Assets de minijuegos
│
├── index.html
├── package.json
├── tsconfig.json
└── CLAUDE.md                   # Este archivo
```

## 🥚 Ciclo de Vida (LifeStage)

### Etapas del Pet
1. **Egg** (Huevo) - Estado inicial
2. **Baby** (Bebé)
3. **Child** (Niño)
4. **Young** (Joven)
5. **Adult** (Adulto)
6. **ReadyToAscend** (Listo para ascender)
7. **Dead** (Muerto)

### ⚠️ Comportamiento Especial del Huevo (Egg)

El **Egg es un estado inerte** donde la mascota NO tiene necesidades activas:

- ❌ **NO tiene hambre** - No puede comer
- ❌ **NO tiene aburrimiento** - No puede jugar
- ❌ **NO puede enfermar** - No hay caca ni enfermedad
- ❌ **NO puede morir** - Es invulnerable
- ❌ **NO muestra indicadores** - UI oculta necesidades y botones
- ✅ **Solo espera tap** - Único input válido es tapear para eclosionar

**Al eclosionar** (tap en huevo):
- Cambia a `LifeStage.Baby`
- Inicializa necesidades: 1⭐ hambre, 1⭐ diversión
- Activa timers de decaimiento
- Muestra UI completa (necesidades + botones)
- Comienza el juego real

**Implementación**:
- `Pet.update()` - Skip completo si `stage === Egg`
- `Pet.feedWithIngredient()` - Return early si es Egg
- `Pet.play()` - Return early si es Egg
- `GameUI.renderNeedsIndicators()` - Skip si es Egg
- `GameUI.renderActionButtons()` - Skip si es Egg

## 🎮 Arquitectura del Sistema

### Patrón de Diseño
- **No frameworks**: JavaScript/TypeScript vanilla puro
- **Canvas 2D API**: Todo el renderizado en canvas HTML
- **Entity-Component Pattern**: Pet como entidad con needs como componentes
- **Event-driven**: Sistema de notificaciones basado en eventos

### Filosofía de Diseño
1. **Simplicidad**: Código directo sin abstracciones innecesarias
2. **Prototipado rápido**: Favorecer velocidad sobre arquitectura perfecta
3. **Fidelidad al Unity**: Mantener mecánicas idénticas al proyecto principal
4. **Testing manual**: No hay tests automatizados (es un prototipo)
5. **Modularidad**: Evaluar si crear archivos nuevos antes de hacer crecer clases grandes

### ⚠️ Cuándo Crear Archivos Nuevos

**IMPORTANTE**: Antes de agregar código a una clase existente, evalúa si necesitas crear un archivo nuevo.

**Criterios para crear archivo nuevo**:
- ✅ La clase actual tiene **>1500 líneas**
- ✅ El nuevo código es un **sistema completo** con su propia lógica (rendering, state, click handling)
- ✅ Ya existen **precedentes** de archivos separados para sistemas similares (ej: minigames tienen UIs separadas)
- ✅ El nuevo código tiene **múltiples responsabilidades** que se pueden aislar

**Ejemplos**:
- ✅ **Sí crear**: `SettingsUI.ts` - Sistema completo de settings con panel, rendering, popups, click handling (GameUI.ts ya tenía ~2500 líneas)
- ✅ **Sí crear**: `TheButtonUI.ts` - Minijuego completo con su propio rendering y lógica
- ❌ **No crear**: Función helper pequeña de 50 líneas que solo usa una clase
- ❌ **No crear**: Feature simple que no justifica la complejidad de un archivo nuevo

**Beneficios**:
- Código más organizado y mantenible
- Clases no crecen indefinidamente
- Más fácil de testear y modificar independientemente
- Sigue el patrón ya establecido en el proyecto

**Proceso**:
1. Identificar si el nuevo código cumple los criterios
2. Si es sí: Crear archivo nuevo con su propia clase
3. Importar y usar en la clase principal
4. Documentar en CLAUDE.md

## 🔧 Comandos Principales

```bash
# Desarrollo (hot reload)
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 💾 Sistema de Persistencia

### LocalStorage Keys
- `pet-save-data`: Estado completo del pet serializado
- `lastSaveTime`: Timestamp del último guardado

### Serialización
Todos los objetos del dominio implementan:
- `serialize()`: Convierte a objeto plano JSON
- `static deserialize(data)`: Reconstruye desde JSON

### Simulación Offline
Al cargar el juego:
1. Lee `lastSaveTime`
2. Calcula tiempo transcurrido
3. Simula needs progresando durante ese tiempo
4. Aplica consecuencias (muerte, enfermedad, etc.)

## 🎨 Sistema de Renderizado (GameUI)

### Estructura del Canvas
```
Canvas 480x640px
├── Background (Room)
├── Pet Sprite (center)
├── Needs Indicators (top)
├── Growth Bar (bottom)
├── Action Buttons (bottom)
├── State Indicators (poop, illness)
├── Feedback Bubbles (speech)
└── Menus (desplegables)
    ├── Feed Menu (ingredientes + preview)
    ├── Play Menu (minijuegos)
    └── Room Menu (estilos)
```

### Ciclo de Render
```typescript
render() {
  if (activeMinigame) {
    // Modo minijuego: oculta main room
    activeMinigame.render();
  } else {
    // Modo normal: main room completo
    renderRoom();
    renderPet();
    renderNeeds();
    renderButtons();
    renderMenus();

    if (showingRewards) {
      // Recompensas flotan sobre main room
      minigameRewards.render();
    }
  }
}
```

## 🕹️ Minijuegos

### TheButton (Implementado)

**Mecánica**: Tap rápido con probabilidad decreciente

**Fases**:
1. **Transición (2s)**: Huevo negro crece + franja blanca expande vertical
2. **Waiting**: Pantalla con instrucciones + botón "¡Empezar!"
3. **Playing (30s)**: Tap en botón grande, counter aumenta o resetea
4. **Finished**: Muestra score y premios
5. **Rewards**: Ingredientes flotan sobre pet en main room

**Probabilidad**:
```typescript
successChance = 100 - (score * 0.4);
// Score 0: 100% éxito
// Score 40: 84% éxito (máximo esperado)
```

**Premios**:
- **<30% (0-11 puntos)**: 1x Ingrediente Básico (Tier 1)
- **30-70% (12-27 puntos)**: 1x Básico + 1x Medio (Tier 2)
- **≥70% (28+ puntos)**: 1x Básico + 1x Premium (Tier 3)

**Configuración**:
- `maxTime`: 30 segundos
- `maxExpectedScore`: 40 puntos
- Área de click: 300x170px (extendida para facilitar)

### EdgyBunBun (Implementado)

**Personalidad**: Edgy
**Mecánica**: Plataformer vertical - Salta entre plataformas izquierda/derecha subiendo de altura

**Fases**:
1. **Transición (2s)**: Huevo negro crece + franja blanca expande vertical (igual que TheButton)
2. **Waiting**: Pantalla con instrucciones + botón "¡Empezar!"
3. **Playing (30s)**: Salta entre plataformas, evita caer
4. **Finished**: Muestra altura máxima y lista de premios obtenidos + botón "Ver Recompensas"
5. **Rewards**: Ingredientes flotan sobre pet en main room

**Mecánica de Juego**:
- BunBun empieza en posición inferior izquierda (altura 0)
- Tap en **mitad izquierda** → salta a plataforma izquierda (+1 altura)
- Tap en **mitad derecha** → salta a plataforma derecha (+1 altura)
- **Score** = Altura máxima alcanzada durante la partida

**Tipos de Plataformas**:
- 🟦 **Standard** (Platform.png): Plataforma sólida normal
- 🟥 **Stun** (Stun_platform.png): Te aturde 2 segundos (no puedes saltar)
- ⬜ **Soft** (Transparent_platform.png): Transparente, no puedes aterrizar → caes hasta la siguiente plataforma sólida

**Generación de Niveles**:
- Cada nivel tiene **siempre** al menos 1 plataforma (izquierda o derecha, 50/50)
- **20% probabilidad** de segunda plataforma en el lado opuesto
- Primera plataforma siempre es Standard
- Segunda plataforma puede ser: Standard (50%), Stun (25%), Soft (25%)
- Niveles generados proceduralmente infinitos

**Premios** (basados en altura máxima):
- **<30% (0-24 altura)**: 1x Ingrediente Básico (Tier 1)
- **30-70% (25-59 altura)**: 1x Básico + 1x Medio (Tier 2)
- **≥70% (60+ altura)**: 1x Básico + 1x Premium (Tier 3)

**Configuración**:
- `maxTime`: 30 segundos
- `maxExpectedScore`: 85 altura
- `stunTime`: 2 segundos
- Área de tap: mitades de pantalla (240px cada lado)
- Cámara suave: Sigue la posición animada del BunBun durante saltos y caídas

**Assets**:
- `/assets/minigames/EdgyBunBun/Platform.png`
- `/assets/minigames/EdgyBunBun/Stun_platform.png`
- `/assets/minigames/EdgyBunBun/Transparent_platform.png`

### SimonDice (Implementado)

**Personalidad**: Intelectual
**Mecánica**: Memoria - Repite una secuencia de 3 botones (Cloud, Star, Panel) que se barajan cada ronda

**Fases**:
1. **Transición (2s)**: Huevo negro crece + franja blanca expande vertical (igual que TheButton)
2. **Countdown**: "Ojito con los botones de abajo" (2s) → 3, 2, 1, ¡VAMO! (1s cada uno + 0.5s)
3. **Playing (60s)**: Memoriza secuencia → Repite la secuencia tapeando botones
4. **Finished**: Muestra score y lista de premios obtenidos + botón "Ver Recompensas" con animación deslizante
5. **Rewards**: Ingredientes flotan sobre pet en main room

**Mecánica de Juego**:
- Cada ronda genera una **secuencia de 3 botones únicos** (sin repetición): Cloud, Star, Panel
- Los **botones físicos se barajan** (intercambian posiciones) cada ronda con animación (escala, rotación, movimiento)
- El **panel de secuencia** (arriba) muestra los iconos correctos y permanece visible durante el input
- Los **iconos de botones** están ocultos (transparentes) al inicio de cada ronda
- Al presionar un botón correcto, su icono se **revela progresivamente**
- Si completas la secuencia: +1 punto (o x2 con multiplicador) → Nueva secuencia
- Si fallas: Pierdes el multiplicador → Nueva secuencia (diferente)
- **Multiplicador x2** después de 5 secuencias correctas consecutivas

**Animaciones**:
- **Shuffle**: Escala 0.8 + rotación ±180° → Movimiento con overshoot (ease out back) → Escala 1.0 + rotación completa → Bounce final
- **Button press**: Escala 1.2 durante 200ms con ease out back
- **Game Over**: Background slide desde izquierda (100ms) → "TIME'S UP" desde derecha con overshoot (200ms)

**Premios** (basados en score):
- **<30% (0-1 puntos)**: 1x Ingrediente Básico (Tier 1)
- **30-70% (2-3 puntos)**: 1x Básico + 1x Medio (Tier 2)
- **≥70% (4+ puntos)**: 1x Básico + 1x Premium (Tier 3)

**Configuración**:
- `maxTime`: 30 segundos
- `maxExpectedScore`: 5 puntos
- `sequenceDisplayTime`: 0.3s por botón (0.9s total)
- `postShuffleDelay`: 2s para ver nuevas posiciones
- `shuffleDuration`: 0.5s
- `hideIconsDelay`: 0.3s
- `errorPauseDuration`: 1s de pausa tras error
- `successPauseDuration`: 0.2s de pausa tras acierto
- `baseScore`: 1 punto por secuencia
- Área de click: 100x100px por botón
- **Tiempo total por ronda**: ~6s (shuffle 0.5s + post-shuffle 2s + hide 0.3s + sequence 0.9s + input ~2-3s + success 0.2s)

**Assets**:
- `/assets/minigames/SimonDice/Cloud_black.png`
- `/assets/minigames/SimonDice/Star_black.png`
- `/assets/minigames/SimonDice/Panal_black.png`
- `/assets/minigames/SimonDice/BackgroundButton.png`
- `/assets/minigames/SimonDice/Bubble Sequence.png`
- `/assets/minigames/SimonDice/TimesUp_Background.png`
- `/assets/minigames/SimonDice/TIMES UP_letter.png`

### Parachute (Implementado)

**Personalidad**: Sassy
**Mecánica**: Recolección - Mueve una canasta horizontalmente para recoger objetos buenos y evitar malos

**Fases**:
1. **Transición (2s)**: Huevo negro crece + franja blanca expande vertical (igual que TheButton)
2. **Waiting**: Pantalla con instrucciones + botón "¡Empezar!"
3. **Playing (30s)**: Arrastra/mueve el jugador para recoger objetos cayendo
4. **Finished**: Animación Times Up con sprites + score y premios + botón "Ver Recompensas"
5. **Rewards**: Ingredientes flotan sobre pet en main room

**Mecánica de Juego**:
- El jugador (canasta con mascota DEBAJO) se mueve **horizontalmente** en la parte inferior de la pantalla
- **Controles**:
  - **Drag horizontal** con mouse/touch: sigue el cursor/dedo directamente con interpolación rápida (40% por frame)
  - **Flechas izquierda/derecha** para mover con teclado (movimiento continuo mientras se mantiene presionada)
  - Movimiento completamente suave sin saltos ni interrupciones
- Caen objetos desde arriba a diferentes velocidades
- El jugador debe **recoger objetos buenos** y **evitar objetos malos**
- Margen de recogida: 8% del ancho de pantalla
- Altura de recogida: 85% de la altura (rango de detección: 5% de altura alrededor de 0.85)
- **Feedback visual**: Al recoger un objeto, aparece un "+X" (o "-X") que sube y hace fade out en 1 segundo
- **Visual**: La mascota se dibuja DEBAJO de la canasta (no arriba)

**Objetos Buenos** (añaden puntos - más valor = más rápido):
- 💰 **Coin** (Moneda.png): +1 punto, velocidad 320px/s (MÁS LENTO), probabilidad 50%
- ⭐ **Star** (redeem.png): +3 puntos, velocidad 360px/s (MEDIO), probabilidad 30%
- 💎 **Diamond** (savings.png): +5 puntos, velocidad 400px/s (MÁS RÁPIDO), probabilidad 20%

**Objetos Malos**:
- 💩 **Caca**: Stun 2 segundos, velocidad 440px/s, probabilidad 75%
- 💣 **Bomba/Nuke**: Stun 3 segundos + Flash blanco + -5 puntos, **velocidad 533px/s (1.2s de arriba a abajo)**, probabilidad 25%

**Sistema de Spawn**:
- **Good/Bad ratio**: 70% objetos buenos, 30% malos
- **Spawn rate progresivo FRENÉTICO**: Empieza en 0.8s entre objetos, disminuye hasta 0.2s al final del juego
- **Posiciones aleatorias**: Los objetos aparecen en posiciones X aleatorias
- Spawn aumenta linealmente con el progreso del juego (más objetos = más dificultad)
- **Ritmo muy intenso**: Objetos caen 2x más rápido, bombas a velocidad extrema

**Efectos especiales**:
- **Bomba**: Produce un flash blanco con texto "BOOOM!" grande en rojo (0.5s fade out)
- **Stun**: El jugador no puede moverse temporalmente, muestra texto "STUN! (X.Xs)" debajo del jugador
- **Score popup**: Aparece "+X" o "-X" en la posición del objeto recogido, sube 60px y hace fade out en 1s (verde para positivo, rojo para negativo)
- **Times Up animation**: Fondo entra desde izquierda (0.1s), letras desde derecha con overshoot (0.2s), score y premios aparecen tras 0.3s
- **Colisión precisa**: Solo detecta objetos en un rango de 0.05 (5% de altura) para evitar colisiones con objetos invisibles

**Premios** (basados en score):
- **<30% (0-8 puntos)**: 1x Ingrediente Básico (Tier 1)
- **30-70% (9-20 puntos)**: 1x Básico + 1x Medio (Tier 2)
- **≥70% (21+ puntos)**: 1x Básico + 1x Premium (Tier 3)

**Configuración**:
- `maxTime`: 30 segundos
- `maxExpectedScore`: 30 puntos
- `playerSpeed`: 25.0 (0-1 por segundo) - EXTREMADAMENTE rápido
- `keyboardMoveSpeed`: 1.6 (0-1 por segundo) - Movimiento continuo smooth (DOBLE velocidad)
- `collectionMargin`: 0.08 (8% del ancho)
- `collectionHeight`: 0.85 (85% de la altura)
- `initialSpawnDelay`: 0.8s (ritmo FRENÉTICO)
- `minSpawnDelay`: 0.2s (ritmo SUPER FRENÉTICO)
- `bombFallSpeed`: 533px/s (1.2 segundos de arriba a abajo)
- `goodObjectRatio`: 0.7 (70% buenos)
- `scorePopupDuration`: 1s (duración del feedback visual)
- **Control smooth**: Sistema de teclas presionadas para movimiento continuo sin saltos
- Área de control: Toda la pantalla (drag + teclado)

**Assets**:
- `/assets/minigames/Parachute/Canasta.png` (jugador/basket)
- `/assets/minigames/Parachute/Moneda.png` (coin - +1 punto)
- `/assets/minigames/Parachute/redeem.png` (star - +3 puntos)
- `/assets/minigames/Parachute/savings.png` (diamond - +5 puntos)
- `/assets/minigames/Parachute/Caca.png` (poop - stun 2s)
- `/assets/minigames/Parachute/NUKE.png` (bomb - stun 3s + -5 puntos + flash)

## 🍱 Sistema de Comida

### Ingredientes

**Tiers** (estrellas de saciedad):
- **Tier 1**: Básico - Cura 1 estrella de hambre
- **Tier 2**: Medio - Cura 2 estrellas de hambre
- **Tier 3**: Premium - Cura 3 estrellas de hambre (llena completamente)

**Personalidades**: Anxious, Edgy, Geek, Sassy, Intelectual, Neutral

**⚠️ Ingrediente Neutral (caso especial)**:
- Tier 1 - Cura 1 estrella de hambre
- Sin personalidad asociada (no genera recuerdos)
- **Siempre disponible** - No se agota nunca
- **No está en inventario** - Se crea dinámicamente al seleccionar
- **No se consume** - `feedWithIngredient()` lo maneja especialmente

### Inventory API
```typescript
inventory.add(ingredient, quantity);     // Agregar
inventory.consume(identifier);            // Consumir 1
inventory.has(identifier);                // Verificar existencia
inventory.getQuantity(identifier);        // Cantidad
inventory.getAll();                       // Lista completa
```

### Cooking Mochis
1. Usuario selecciona 1 ingrediente
2. Preview muestra personalidad + estrellas de saciedad
3. Click "Cocinar" → Consume ingrediente
4. Pet come → Reduce hambre según tier
5. Si pet enfermo → Rechaza comida con speech bubble

## 🎭 Sistema de Personalidades

**5 Personalidades Base**:
- 😰 **Anxious** - Ansioso
- 🖤 **Edgy** - Rebelde
- 🤓 **Geek** - Geek
- 🎓 **Intelectual** - Intelectual
- 💁 **Sassy** - Descarado

**Neutral**: Ingrediente sin personalidad (siempre disponible)

### Room Styles
Cada personalidad tiene su estilo de habitación asociado:
- `default`: Habitación básica (neutral)
- `anxious`, `edgy`, `geek`, `intelectual`, `sassy`: Estilos temáticos

## 🔔 Sistema de Notificaciones

### Tipos de Notificación
- `attention_low`: Necesidades bajas (amarillo)
- `attention_critical`: Necesidades críticas (rojo)
- `illness`: Mascota enferma
- `near_death`: A punto de morir
- `death`: Mascota muerta
- `evolution`: Evolución completada

### Configuración
- **Permiso**: Solicita al cargar si no está granted
- **Timing**: Evalúa cada 60s en GameLoop
- **Cooldown**: No spam de notificaciones idénticas (60s entre notificaciones del mismo tipo)

### Audio
- **Sonido personalizado**: `/assets/sounds/notification.mp3`
- **Volumen**: 50% por defecto
- Se reproduce al enviar cualquier notificación
- Se reinicia automáticamente si se disparan múltiples notificaciones seguidas

## 🚨 Consideraciones Críticas

### ⚠️ Canvas 2D Only
- **NO hay DOM elements** para la UI del juego
- Todo se dibuja en el canvas
- Sprites cargados como `HTMLImageElement`

### 🎨 Sprites y Assets
- **Ruta base**: `/assets/` (public folder)
- **Formato**: PNG con transparencia
- **Tamaños**: Variables según necesidad
- **Cache**: GameUI precarga y cachea sprites en Maps

### 🐛 Debugging
- Console logs con prefijos: `[Pet]`, `[Inventory]`, `[GameLoop]`
- Dev tools en `main.ts`: `resetPet()`, `killPet()`, `makeIll()`, `addIngredient()`
- Time warp: `setTimeSpeed(multiplier)` para testing rápido

### 📱 Mobile Considerations (Futuro)
Aunque es web, está pensado para móvil:
- Canvas adaptativo
- Click areas grandes (300x170px en TheButton)
- UI con botones grandes y claros

## 🔄 Relación con Proyecto Unity

### 🎯 Propósito del Prototipo Web
Este prototipo existe para **validar mecánicas e ideas rápidamente** antes de implementarlas en el proyecto Unity final. El flujo de trabajo es:

1. **Idear** nueva mecánica o feature
2. **Prototipar** en web (TypeScript, más rápido de iterar)
3. **Validar** jugabilidad y balance
4. **Implementar** en Unity con confianza

### 📂 Acceso al Proyecto Unity
**IMPORTANTE**: Debes tener acceso al proyecto Unity completo en:
```
D:\Repositorios\Michi Games\Tamagotchi
```

Este proyecto contiene:
- Código fuente C# completo (definición de mecánicas)
- Assets gráficos originales
- Implementaciones finales de sistemas
- Documentación de diseño en `~Docs\`

### Assets Compartidos
Los sprites vienen del proyecto Unity:
```
Unity: Assets/Graphics/...
Web:   public/assets/...
```

### Mecánicas Idénticas
- **Fórmulas**: Probability, timing, rewards son las mismas
- **Balance**: Valores idénticos al Unity
- **Comportamiento**: Lógica de dominio replicada

### Divergencias Permitidas
- **UI**: Simplificada para prototipado rápido
- **Animaciones**: Básicas en lugar de DOTween
- **Features**: Solo core mechanics implementadas

### Consulta Obligatoria
Al trabajar en features que ya existen en Unity:
1. Revisar implementación C# en el proyecto Unity
2. Extraer fórmulas, constantes y lógica exacta
3. Replicar comportamiento en TypeScript
4. Mantener fidelidad a las mecánicas originales

## 🛠️ Workflows Típicos

### 🆕 Añadir Nuevo Minigame
1. Crear carpeta en `src/minigames/[nombre]/`
2. Implementar:
   - `[Nombre]Game.ts` - Lógica del juego
   - `[Nombre]UI.ts` - Renderizado
   - `[Nombre]Rewards.ts` - Sistema de premios (opcional)
3. Agregar a `GameUI.minigames` array
4. Integrar en `launchMinigame()` switch

### 🐛 Debuggear Need
1. Abrir console del navegador
2. Usar `pet.hunger`, `pet.boring`, etc.
3. Modificar valores: `pet.hunger.currentValue = 50`
4. Ver efecto inmediato en UI

### 🎨 Añadir Nuevos Sprites
1. Copiar PNG a `public/assets/[categoria]/`
2. Agregar a cache en `GameUI.preloadSprites()`
3. Usar desde cache: `this.spriteCache.get(key)`

### 🔧 Modificar Balanceo
- **Hambre/Aburrimiento**: Editar en `Hunger.ts`, `Boring.ts`
- **Probabilidad minijuego**: Editar en `[Minigame]Game.ts`
- **Premios**: Editar en `calculateRewards()`
- **Tiers de ingredientes**: Editar en `Ingredient.getSatiationStars()`

## 📊 Convenciones de Código

### Naming
- **Classes**: PascalCase (`Pet`, `GameUI`)
- **Files**: PascalCase matching class name
- **Variables/Methods**: camelCase (`currentValue`, `renderPet()`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TIME`)

### Comentarios
```typescript
// Comentarios simples para lógica clara

// Secciones grandes con separadores
// ============ SECTION NAME ============

// TODO: Para trabajo pendiente

console.log('[Module] Message'); // Logs con prefijo
```

### Estructura de Clase
```typescript
export class Example {
  // 1. Properties (private first, public after)
  private score: number = 0;
  public readonly maxScore: number = 100;

  // 2. Constructor
  constructor() { }

  // 3. Public methods
  public start(): void { }

  // 4. Private methods
  private update(): void { }

  // 5. Serialization (if needed)
  serialize() { }
  static deserialize(data) { }
}
```

## 🏁 Quick Start para Claude

⚠️ **OBLIGATORIO**: SIEMPRE ejecutar TODOS estos pasos al inicio de cualquier conversación:

1. **Entender contexto**: Leer este archivo (`CLAUDE.md`)
2. **Verificar qué está implementado**: Ver sección "Estado Actual"
3. **Identificar módulo afectado**: ¿Core? ¿UI? ¿Minigame?
4. **Revisar código relevante**: Leer archivos antes de modificar
5. **Consultar documentos de diseño** (si es relevante):
   - Sistema de evolución → `Diseño - Personalidades (1).csv`
   - Balance de tiempos → `Diseño - Tiempos (1).csv`
   - Implementación Unity → Proyecto C# en `D:\Repositorios\Michi Games\Tamagotchi`
6. **Testing manual**: `npm run dev` y probar en navegador
7. **Verificar assets**: Los sprites deben estar en `public/assets/`

🚨 **NO proceder sin completar los pasos 1-5**. Preguntar al usuario si no está claro.

## 🆘 Problemas Comunes

### "Sprite no se ve"
- ✅ Verificar ruta: `/assets/[categoria]/[nombre].png`
- ✅ Verificar carga: `console.log(sprite.complete, sprite.src)`
- ✅ Verificar cache: `spriteCache.get(key)` no es undefined

### "Canvas en blanco"
- ✅ Verificar que `render()` se llama en loop
- ✅ Verificar que canvas está en DOM
- ✅ Verificar `ctx` no es null

### "Inventario no actualiza"
- ✅ Usar `.add()` no `.addIngredient()`
- ✅ Verificar con `console.log(pet.inventory.getAll())`
- ✅ Verificar serialización si persiste

### "Minijuego no aparece"
- ✅ Verificar `activeMinigame` está seteado
- ✅ Verificar `render()` llama a `activeMinigame.render()`
- ✅ Verificar transición inicia con estado `'transition'`

## 📚 Recursos Adicionales

### Proyecto Unity Principal
- **Ruta**: `D:\Repositorios\Michi Games\Tamagotchi`
- **CLAUDE.md Unity**: Para mecánicas detalladas del juego completo
- **Código C#**: Implementaciones definitivas de todos los sistemas

### 📖 Documentación de Diseño
**Ubicación**: `D:\Repositorios\Michi Games\Tamagotchi\~Docs\Diseño Notion\`

Esta carpeta contiene todos los documentos de diseño del juego. **Consulta obligatoria** cuando trabajes en:
- Sistema de evolución
- Balance de personalidades
- Tiempos de mecánicas (hambre, aburrimiento, etc.)
- Árbol evolutivo
- Mecánicas de gameplay

### 🔥 Documentos Críticos

#### 1. Diseño - Personalidades (1).csv
**Ruta**: `D:\Repositorios\Michi Games\Tamagotchi\~Docs\Diseño Notion\Diseño - Personalidades (1).csv`

Contiene el **árbol evolutivo completo** de personalidades:
- Etapas evolutivas (Baby, Child, Teen, Adult)
- Condiciones de evolución
- Personalidades por etapa
- Relaciones entre formas
- **CRÍTICO**: Consultar este archivo cuando trabajes en sistema de evolución

#### 2. Diseño - Tiempos (1).csv
**Ruta**: `D:\Repositorios\Michi Games\Tamagotchi\~Docs\Diseño Notion\Diseño - Tiempos (1).csv`

Define todos los **tiempos del juego**:
- Velocidad de decaimiento de needs (hambre, aburrimiento)
- Duración de etapas evolutivas
- Cooldowns de acciones
- Timing de eventos
- **CRÍTICO**: Consultar para cualquier ajuste de balance temporal

### ⚠️ Consulta Antes de Implementar
**SIEMPRE** revisa estos documentos de diseño antes de:
- Implementar sistema de evolución
- Ajustar tiempos o balance
- Añadir nuevas personalidades
- Modificar mecánicas core del pet

---

## 📱 PWA (Progressive Web App)

### ✅ Estado: Implementado y Desplegado

El proyecto es una **PWA completa** instalable en móviles como app nativa.

### 🌐 URL de Producción

```
https://tamagotchi-prototype.vercel.app
```

### 🎯 Características PWA

1. **Instalable en Móvil**
   - Android: Chrome → Menú (⋮) → "Instalar app"
   - iOS: Safari → Compartir → "Añadir a pantalla de inicio"
   - Se comporta como app nativa (sin barra del navegador)

2. **Service Worker (Offline-First)**
   - Ubicación: `public/sw.js`
   - Estrategia: Cache First con Network Fallback
   - Versión: `tamagotchi-v1` (cambiar para forzar actualización)
   - Cachea: Assets estáticos (JS, CSS, imágenes, sprites)
   - Funciona sin internet después de primera visita

3. **Manifest PWA**
   - Ubicación: `public/manifest.json`
   - Orientación: Portrait (forzada)
   - Display: Standalone (fullscreen sin browser UI)
   - Theme color: #ffffff
   - Iconos: 192x192 y 512x512 (`public/icon-*.png`)

4. **Canvas Responsive (Aspect Ratio 3:4)**
   - Dimensiones fijas: 480x640px
   - En móvil: Escala con letterboxing (barras negras)
   - Mantiene ratio 3:4 **SIEMPRE**
   - Formula: `width: min(100vw, calc(100vh * 0.75))`
   - Desktop: Centrado con bordes redondeados

5. **Meta Tags Móvil**
   - iOS: `apple-mobile-web-app-capable`, status bar, touch icon
   - Android: `theme-color`, viewport sin zoom
   - Prevención de bounce, tap highlight, text selection
   - Soporte para notch de iPhone (`safe-area-inset`)

### 🚀 Deployment en Vercel

**CLI Rápido**:
```bash
cd "D:\Repositorios\Michi Games\TamagotchiPrototype"
vercel --prod
```

**Features**:
- ✅ HTTPS automático (obligatorio para PWA)
- ✅ CDN global (rápido desde cualquier lugar)
- ✅ Zero-config para Vite (detección automática)
- ✅ Deploy en ~30 segundos
- ✅ URL permanente: `tamagotchi-prototype.vercel.app`

### 📂 Archivos PWA Clave

```
public/
├── manifest.json          # Configuración PWA (nombre, iconos, display)
├── sw.js                  # Service Worker (cache offline)
├── icon-192.png          # Icono PWA 192x192
└── icon-512.png          # Icono PWA 512x512

src/
└── main.ts               # Registro del Service Worker (líneas 246-297)

index.html                # Meta tags PWA, manifest link, viewport
```

### 🔄 Actualizar Service Worker

Cuando hagas cambios que requieran invalidar cache:

1. **Cambiar versión en `public/sw.js`**:
   ```javascript
   const CACHE_VERSION = 'tamagotchi-v2'; // Incrementar
   ```

2. **Redesplegar**:
   ```bash
   vercel --prod
   ```

3. **El SW preguntará al usuario** si quiere actualizar (confirm dialog automático)

### 🐛 Testing PWA Local

1. **Build de producción**:
   ```bash
   npm run build
   npm run preview
   ```

2. **DevTools → Application**:
   - Service Workers: Verificar estado "Activated"
   - Manifest: Ver configuración y iconos
   - Cache Storage: Ver assets cacheados

3. **Probar offline**:
   - DevTools → Network → ☑️ "Offline"
   - Recargar → Debería funcionar

### 📝 Notas Técnicas

- **Service Worker solo funciona con HTTPS** (localhost es excepción)
- **Canvas NO se estira**: Usa `object-fit: contain` + cálculos de ratio
- **Loading screen**: `#loading` (oculto tras 500ms)
- **Updates automáticos**: Polling cada 60s, prompt al usuario
- **LocalStorage persiste**: Funciona offline, sincroniza online

### 🎨 Aspect Ratio Fix (Importante)

El canvas mantiene **siempre** 480x640px (3:4):

```css
/* Móvil: Escalar manteniendo ratio */
#app {
  width: min(100vw, calc(100vh * 0.75));  /* 0.75 = 3/4 */
  height: min(100vh, calc(100vw * 1.333)); /* 1.333 = 4/3 */
}

#game-canvas {
  object-fit: contain; /* No deformar */
}
```

**Resultado**:
- Móvil vertical → Barras arriba/abajo
- Móvil horizontal → Barras izquierda/derecha
- Desktop → Centrado con bordes

---

*Este archivo es el punto de entrada principal para agentes de IA trabajando en el prototipo web. Mantenerlo actualizado es CRÍTICO para el flujo de trabajo eficiente.*