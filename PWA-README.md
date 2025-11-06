# 📱 PWA Setup - Tamagotchi

## ✅ Ya está implementado

La app ahora es una **PWA (Progressive Web App)** completamente funcional con:

- ✅ Canvas responsive que mantiene aspect ratio 3:4
- ✅ Manifest.json configurado
- ✅ Service Worker con cache offline
- ✅ Meta tags para iOS y Android
- ✅ Loading screen
- ✅ Soporte para notch de iPhone
- ✅ Prevención de bounce en iOS

## 🎨 Falta: Crear Iconos

Necesitas crear 2 iconos y ponerlos en `public/`:

### Icon 192x192 (`public/icon-192.png`)
- Tamaño: **192x192 píxeles**
- Formato: PNG con transparencia
- Contenido: Logo/sprite del Tamagotchi

### Icon 512x512 (`public/icon-512.png`)
- Tamaño: **512x512 píxeles**
- Formato: PNG con transparencia
- Contenido: El mismo logo, versión grande

**Consejo**: Usa un sprite del huevo o del Baby como icono.

---

## 🚀 Cómo Instalar en Móvil

### En desarrollo local (para probar):

1. **Exponer tu localhost a internet temporalmente**:
   ```bash
   npx localtunnel --port 5173
   ```
   Te dará una URL pública temporal (ej: `https://xyz.loca.lt`)

2. **Abrir esa URL en tu móvil**

3. **Instalar la PWA**:
   - **iOS**: Safari → Compartir → "Añadir a pantalla de inicio"
   - **Android**: Chrome → Menú (⋮) → "Instalar app" o "Añadir a pantalla de inicio"

---

## 🌐 Desplegar en Producción (Vercel - Gratis)

### Opción 1: CLI (Rápido)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Desplegar (primera vez)
vercel

# Desplegar actualizaciones
vercel --prod
```

### Opción 2: GitHub + Vercel (Automático)

1. **Subir código a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "PWA ready"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/tamagotchi.git
   git push -u origin main
   ```

2. **Conectar con Vercel**:
   - Ve a https://vercel.com
   - "New Project" → Importar tu repo de GitHub
   - Framework: Vite
   - Deploy

3. **¡Listo!** Tendrás:
   - URL pública (ej: `tamagotchi.vercel.app`)
   - HTTPS automático
   - PWA instalable
   - Auto-deploy en cada push a GitHub

---

## 📲 Funcionalidades PWA

### ✅ Funciona Offline
- Los assets se cachean automáticamente
- Si pierdes internet, sigue funcionando
- El progreso se guarda en localStorage

### ✅ Notificaciones Push
- Ya están implementadas
- Funcionan en Android y en Desktop
- En iOS 16.4+ también funcionan

### ✅ Instalable
- Se comporta como app nativa
- Icono en home screen
- Sin barra de navegador del browser
- Splash screen automático

### ✅ Actualización Automática
- Detecta nuevas versiones
- Pregunta al usuario si quiere actualizar
- Se actualiza sin perder datos

---

## 🔧 Testing Local

Para probar la PWA en tu máquina:

1. **Build de producción**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Abrir DevTools**:
   - Chrome/Edge: F12 → Tab "Application" → "Service Workers"
   - Verifica que el SW esté registrado y activo

3. **Probar offline**:
   - DevTools → Network → ☑️ "Offline"
   - Recargar página → Debería seguir funcionando

---

## 📝 Notas Técnicas

### Estrategia de Cache
- **Cache First**: Assets estáticos (JS, CSS, imágenes)
- **Network First**: HTML (para actualizaciones rápidas)
- **Fallback**: Si falla la red, sirve desde cache

### Versión del Cache
- Cambiar `CACHE_VERSION` en `public/sw.js` para forzar actualización
- Formato: `tamagotchi-v2`, `tamagotchi-v3`, etc.

### Viewport
- Aspect ratio **3:4** (480x640) mantenido siempre
- Móvil: Fullscreen con letterboxing
- Desktop: Centrado con bordes redondeados

---

## 🐛 Troubleshooting

### "No se instala la app"
- Verifica HTTPS (obligatorio para PWA)
- Verifica que existan los iconos
- Revisa la consola del navegador

### "Service Worker no se registra"
- Verifica que `sw.js` esté en `public/`
- HTTPS es obligatorio (localhost es excepción)
- Revisa la consola: `[PWA] Service Worker registrado`

### "No funciona offline"
- Abre DevTools → Application → Service Workers
- Verifica que esté "Activated and running"
- Verifica que haya recursos en Cache Storage

### "Los cambios no se reflejan"
- Cambiar `CACHE_VERSION` en `sw.js`
- Hard refresh: Ctrl+Shift+R (o Cmd+Shift+R)
- DevTools → Application → Clear storage

---

## 🎉 ¡Ya está todo listo!

Solo falta:
1. Crear los 2 iconos (192x192 y 512x512)
2. Desplegar en Vercel
3. ¡Instalar en tu móvil!

**Disfruta de tu Tamagotchi PWA** 🥚✨
