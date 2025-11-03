# 🎮 Tamagotchi Web Prototype

Prototipo web funcional del Tamagotchi para validar mecánicas del juego de forma rápida.

## 🚀 Inicio Rápido

```bash
npm run dev
```

Abre http://localhost:5173/ en tu navegador.

## 🎯 Objetivo

Validar las mecánicas del Tamagotchi en **minutos/horas** en vez de días/semanas en Unity:

✅ Ciclo completo de vida (Huevo → Bebé → Niño → Joven → Adulto)
✅ Sistema de necesidades (Hambre 3 niveles, Diversión 3 niveles)
✅ Factor de crecimiento x0.5 si hambriento/aburrido
✅ Sistema de personalidades y recuerdos
✅ Caca, Enfermedad, Muerte
✅ Time Warp Mode para testing rápido
✅ Persistencia + Simulación offline

## ⏱️ Time Warp Mode

Controla la velocidad del tiempo desde la consola del navegador:

```javascript
// Tiempo real (ciclo completo: ~14 horas)
setTimeSpeed(1)

// 10x más rápido (ciclo completo: ~1.4 horas)
setTimeSpeed(10)

// 60x más rápido (ciclo completo: ~14 minutos)
setTimeSpeed(60)

// 600x más rápido (ciclo completo: ~1.4 minutos)
setTimeSpeed(600)

// DEBUG: 1000x (ciclo completo: ~50 segundos)
setTimeSpeed(1000)
```

## 🎮 Controles

### Huevo
- **Click en el huevo** → Nace como Bebé

### Pantalla Principal
- **🍙 Alimentar** → Reduce hambre (1 estrella)
- **💊 Medicina** → Cura enfermedad
- **🎮 Jugar** → Reduce aburrimiento (1 estrella)
- **💩 Click en caca** → Limpia la caca

### Indicadores
- **⭐⭐⭐** = Necesidad satisfecha (3 estrellas)
- **⭐⭐☆** = 2 estrellas
- **⭐☆☆** = 1 estrella (⚠️ penalización x0.5 crecimiento)
- **☆☆☆** = 0 estrellas (⚠️ penalización x0.5 crecimiento)

### Iconos de Estado
- **😋** = Tiene hambre
- **😴** = Está aburrido
- **🤒** = Está enfermo
- **💩** = Hay caca (click para limpiar)

## 📊 Tiempos de Juego

### Modo Real Time (1x)
| Etapa | Duración | Ciclo Hambre/Diversión |
|-------|----------|------------------------|
| Bebé  | 60 min   | 50 min                |
| Niño  | 180 min  | 90 min                |
| Joven | 300 min  | 120 min               |
| Adulto| 300 min  | 120 min               |

**Total: ~14 horas**

### Modo Fast (10x)
- Bebé: 6 min
- Niño: 18 min
- Joven: 30 min
- Adulto: 30 min

**Total: ~1.4 horas**

### Modo Very Fast (60x)
- Bebé: 1 min
- Niño: 3 min
- Joven: 5 min
- Adulto: 5 min

**Total: ~14 minutos**

### Modo Instant (600x)
- Bebé: 6 segundos
- Niño: 18 segundos
- Joven: 30 segundos
- Adulto: 30 segundos

**Total: ~1.4 minutos**

### Modo DEBUG (1000x)
**Total: ~50 segundos** (ciclo completo)

## 🎲 Mecánicas Implementadas

### ✅ Sistema de Hambre
- 3 niveles (estrellas)
- Degrada automáticamente según etapa
- Tier de saciedad (1, 1.5, 3 estrellas por comida)
- Muerte si pasa 20-25 horas sin comer

### ✅ Sistema de Diversión
- 3 niveles (estrellas)
- Degrada automáticamente según etapa
- Cada minijuego satisface 1 estrella

### ✅ Sistema de Crecimiento
- Crecimiento automático (1/s base)
- **x0.5 si hambriento O aburrido** ⚠️
- Barra de progreso visual
- Evoluciona automáticamente al completar

### ✅ Sistema de Personalidades
- Recuerdos de comida y minijuegos
- Mezcla de personalidades al evolucionar
- Olvida recuerdos después de evolución

### ✅ Sistema de Caca
- Aparece después de comer (tiempo aleatorio)
- Si no se limpia en 12h → Enfermedad

### ✅ Sistema de Enfermedad
- Aparece si hay caca durante 12h
- Si no se cura en 8h → Muerte

### ✅ Persistencia
- Auto-save cada ~1 segundo
- LocalStorage
- Simulación offline (como en Unity)

## 🔧 Desarrollo

### Estructura
```
src/
├── core/           # Lógica del juego
│   ├── Pet.ts     # Mascota principal
│   ├── Hunger.ts  # Sistema de hambre
│   ├── Boring.ts  # Sistema de diversión
│   ├── Poop.ts    # Sistema de caca
│   ├── Illness.ts # Sistema de enfermedad
│   ├── Personality.ts
│   ├── Memory.ts
│   └── GameLoop.ts
├── ui/
│   └── GameUI.ts  # Renderizado Canvas
└── main.ts        # Entry point
```

### Scripts
```bash
npm run dev      # Dev server con hot reload
npm run build    # Build para producción
npm run preview  # Preview del build
```

## 📝 Acceso a Objetos del Juego

Desde la consola del navegador:

```javascript
// Ver estado del pet
pet.stage         // Etapa actual
pet.hunger        // Sistema de hambre
pet.boring        // Sistema de diversión
pet.personality   // Personalidad actual
pet.memories      // Array de recuerdos

// Control manual
pet.feed(1, 'neutral')     // Alimentar (1 estrella, neutral)
pet.play('anxious')        // Jugar (minijuego anxious)
pet.cleanPoop()            // Limpiar caca
pet.cure()                 // Curar enfermedad

// GameLoop
gameLoop.save()            // Guardar ahora
gameLoop.setTimeMultiplier(100)  // Cambiar velocidad
```

## 🎯 Testing del Ciclo Completo

### Test Rápido (modo DEBUG 1000x)
1. Abrir http://localhost:5173/
2. Abrir consola: `setTimeSpeed(1000)`
3. Click en el huevo → Nace
4. **NO HAGAS NADA** → Ver cómo se degrada
5. En ~50 segundos completa Bebé → Niño → Joven → Adulto
6. Observar factor x0.5 cuando hambriento/aburrido

### Test con Interacción (modo 60x)
1. `setTimeSpeed(60)`
2. Click en huevo → Nace
3. Alimentar y jugar periódicamente
4. Ver evoluciones en ~14 minutos
5. Dejar que se ensucie y enferme
6. Probar curación

### Test Realista (modo 10x)
1. `setTimeSpeed(10)`
2. Jugar como usuario real durante ~1.4 horas
3. Validar balance de necesidades
4. Sentir si los tiempos son correctos

## 📊 Valores Validados para Unity

Una vez validado el prototipo, estos son los valores a usar en Unity:

### Tiempos de Hambre/Diversión
- Bebé: 3000s (50 min)
- Niño: 5400s (90 min)
- Joven/Adulto: 7200s (120 min)

### Factor de Crecimiento
- Base: 1/s
- Con hambre o aburrimiento: 0.5/s

### Umbrales de Crecimiento
- Bebé: 3600s
- Niño: 10800s
- Joven: 18000s
- Adulto: 18000s

### Tiempos de Muerte
- Por hambre: 72000-90000s (20-25h)
- Por enfermedad: 28800s (8h)
- Caca → Enfermedad: 43200s (12h)

## 🐛 Debug

Ver en consola del navegador:
- Estados del pet
- Eventos de evolución
- Acciones realizadas
- Errores

## 📦 Próximos Pasos

### Pendiente:
- [ ] Minijuego de Mochi (slide + tap)
- [ ] Minijuego El Botón
- [ ] Exportar sprites de Unity
- [ ] Mejorar visual con assets reales

### Completado:
- [x] Core del Tamagotchi funcional
- [x] Todas las mecánicas principales
- [x] Time Warp Mode
- [x] Persistencia
- [x] UI básica funcional

## 🎉 Resultado

**Prototipo funcional en ~3-4 horas** vs **días/semanas en Unity**

Ahora puedes:
- ✅ Validar el ciclo completo en minutos
- ✅ Ajustar valores de balance fácilmente
- ✅ Ver cómo se siente el juego
- ✅ Decidir qué funciona y qué no antes de implementar en Unity
