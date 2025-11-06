// Settings UI System
// Panel completo de configuraciones del juego

import { Settings } from '../core/Settings';

export class SettingsUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: Settings;
  private spriteCache: Map<string, HTMLImageElement> = new Map();

  // Estado del popup de horario
  private showingSleepSchedulePopup: boolean = false;
  private tempSleepHour: number = 22;
  private tempWakeUpHour: number = 7;

  // Coordenadas del panel (para click handling)
  private panelX: number = 0;
  private panelY: number = 0;
  private panelW: number = 0;
  private panelH: number = 0;

  // Hit areas para click handling (se actualizan en render)
  private clickableAreas: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'toggle' | 'button' | 'slider';
    id: string;
  }> = [];

  // Estado del slider de música (para drag)
  private isDraggingMusicSlider: boolean = false;

  constructor(canvas: HTMLCanvasElement, settings: Settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.settings = settings;

    this.preloadSprites();
  }

  // Método público para obtener sprites (usado por GameUI)
  getSprite(filename: string): HTMLImageElement | undefined {
    return this.spriteCache.get(filename);
  }

  private preloadSprites() {
    const sprites = [
      'AlarmaIcon.png',
      'Back.png',
      'Background_Sleep_Options.png',
      'Boton despertar.png',
      'Boton mimir.png',
      'Handler.png',
      'Horario de sueño popup.png',
      'SettingsOpenButton.png',
      'ToggleOff.png',
      'ToogleOn.png',
      'Z.png'
    ];

    sprites.forEach(filename => {
      const img = new Image();
      img.src = `/assets/settings/${filename}`;
      this.spriteCache.set(filename, img);
    });
  }

  // Renderiza SOLO el contenido (sin panel ni overlay)
  // Usado dentro del panel desplegable de GameUI
  renderContent(x: number, y: number, width: number, availableHeight: number, scrollOffset: number) {
    // Limpiar áreas clickeables
    this.clickableAreas = [];

    this.ctx.save();

    // Clip area (para que el scroll funcione)
    this.ctx.beginPath();
    this.ctx.rect(0, y, this.canvas.width, availableHeight);
    this.ctx.clip();

    // Renderizar contenido con offset de scroll
    const contentY = y - scrollOffset;
    this.renderSettingsContent(x, contentY, width, scrollOffset);

    this.ctx.restore();

    // Renderizar popup de horario si está activo (sobre todo)
    if (this.showingSleepSchedulePopup) {
      this.renderSleepSchedulePopup();
    }
  }

  // DEPRECATED: Método antiguo de panel completo (ya no se usa)
  render() {
    this.ctx.save();

    // Overlay oscuro semi-transparente
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Panel principal (casi pantalla completa)
    const panelMargin = 15;
    this.panelX = panelMargin;
    this.panelY = 40;
    this.panelW = this.canvas.width - panelMargin * 2;
    this.panelH = this.canvas.height - this.panelY - 20;

    // Fondo blanco del panel
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(this.panelX, this.panelY, this.panelW, this.panelH);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(this.panelX, this.panelY, this.panelW, this.panelH);

    // Header negro con "CONFIGURACIONES"
    const headerH = 50;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(this.panelX, this.panelY, this.panelW, headerH);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CONFIGURACIONES', this.canvas.width / 2, this.panelY + headerH / 2 + 7);

    // Área de contenido (scrolleable)
    const contentX = this.panelX + 15;
    const contentY = this.panelY + headerH + 15;
    const contentW = this.panelW - 30;

    // Renderizar contenido de settings
    this.renderSettingsContent(contentX, contentY, contentW, 0);

    // Botón "Volver" (flecha) en la parte inferior
    const backButton = this.spriteCache.get('Back.png');
    const backSize = 50;
    const backX = this.canvas.width / 2 - backSize / 2;
    const backY = this.panelY + this.panelH - backSize - 10;

    if (backButton && backButton.complete) {
      this.ctx.drawImage(backButton, backX, backY, backSize, backSize);
    } else {
      // Fallback: círculo con flecha
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(backX + backSize / 2, backY + backSize / 2, backSize / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '30px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('←', backX + backSize / 2, backY + backSize / 2 + 10);
    }

    this.ctx.restore();

    // Renderizar popup de horario si está activo
    if (this.showingSleepSchedulePopup) {
      this.renderSleepSchedulePopup();
    }
  }

  // Calcula la altura total del contenido (para scroll)
  calculateContentHeight(width: number): number {
    let totalHeight = 0;

    // Mascota section
    totalHeight += 30 + 15; // Header
    totalHeight += 35 + 50; // 1 toggle + 1 botón (eliminado inmortalidad)
    // Warning box si dormir automático está desactivado
    if (!this.settings.sleep.isAutomatic) {
      totalHeight += 10 + 170; // Espacio + warning box (aproximado)
    }
    totalHeight += 15 + 15; // Padding

    // Sonido section
    totalHeight += 30 + 15; // Header
    totalHeight += 35 + 30; // Toggle + slider
    totalHeight += 15 + 15; // Padding

    // Vibración section
    totalHeight += 30 + 15; // Header
    totalHeight += 35; // 1 toggle
    totalHeight += 15 + 15; // Padding

    // Notificaciones section
    totalHeight += 30 + 15; // Header
    totalHeight += 35 + 10 + 35 + 35 + 35 + 35; // Toggle general + línea + 4 toggles (hambre, illness, poop, evolution)
    totalHeight += 15 + 15; // Padding

    return totalHeight;
  }

  private renderSettingsContent(x: number, y: number, width: number, scrollOffset: number): number {
    this.ctx.save();
    let currentY = y;

    // ========== Sección MASCOTA ==========
    currentY = this.renderSettingsSection(x, currentY, width, 'Mascota', (sectionX, sectionY) => {
      let offsetY = 0;

      // Toggle: Dormir Automático
      offsetY += this.renderSettingRow(sectionX + 15, sectionY + offsetY, width - 30,
        '😴 Dormir Automático', this.settings.sleep.isAutomatic, scrollOffset, 'sleep-auto');

      // Botón: Horario de sueño
      offsetY += this.renderSettingButton(sectionX + 15, sectionY + offsetY, width - 30,
        'Horario de sueño', '⏰', scrollOffset, 'sleep-schedule');

      // Aviso: Solo si dormir automático está desactivado
      if (!this.settings.sleep.isAutomatic) {
        offsetY += 10; // Espacio antes del aviso
        offsetY += this.renderWarningBox(sectionX + 15, sectionY + offsetY, width - 30,
          'CUIDAO',
          'Si desactivas el dormir automático tendrás que apagar y prender la luz manualmente con el botón de mimir del menu principal para que tu mascota duerma y no se quede desatendida durante la noche.');
      }

      return offsetY;
    });

    currentY += 15;

    // ========== Sección SONIDO ==========
    currentY = this.renderSettingsSection(x, currentY, width, 'Sonido', (sectionX, sectionY) => {
      let offsetY = 0;

      // Música con toggle + slider
      offsetY += this.renderSettingRow(sectionX + 15, sectionY + offsetY, width - 30,
        'Música', this.settings.audio.musicEnabled, scrollOffset, 'music-enabled');

      // Slider de música (SIEMPRE visible, como en Figma)
      offsetY += this.renderSettingSlider(sectionX + 15, sectionY + offsetY, width - 30,
        this.settings.audio.musicVolume, scrollOffset, 'music-volume');

      return offsetY;
    });

    currentY += 15;

    // ========== Sección VIBRACIÓN ==========
    currentY = this.renderSettingsSection(x, currentY, width, 'Vibración', (sectionX, sectionY) => {
      return this.renderSettingRow(sectionX + 15, sectionY, width - 30,
        'Vibración', this.settings.audio.vibrationEnabled, scrollOffset, 'vibration-enabled');
    });

    currentY += 15;

    // ========== Sección NOTIFICACIONES ==========
    currentY = this.renderSettingsSection(x, currentY, width, 'Notificaciones', (sectionX, sectionY) => {
      let offsetY = 0;

      // Toggle general
      offsetY += this.renderSettingRow(sectionX + 15, sectionY + offsetY, width - 30,
        'Activar/Desactivar todas', this.settings.notifications.allEnabled, scrollOffset, 'notif-all');

      // Línea divisoria
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(sectionX + 15, sectionY + offsetY);
      this.ctx.lineTo(sectionX + width - 15, sectionY + offsetY);
      this.ctx.stroke();
      offsetY += 10;

      // Notificaciones individuales
      offsetY += this.renderSettingRow(sectionX + 15, sectionY + offsetY, width - 30,
        'Hambre', this.settings.notifications.hungerEnabled, scrollOffset, 'notif-hunger');

      offsetY += this.renderSettingRow(sectionX + 15, sectionY + offsetY, width - 30,
        'Enfermedad', this.settings.notifications.illnessEnabled, scrollOffset, 'notif-illness');

      offsetY += this.renderSettingRow(sectionX + 15, sectionY + offsetY, width - 30,
        'Caca', this.settings.notifications.poopEnabled, scrollOffset, 'notif-poop');

      offsetY += this.renderSettingRow(sectionX + 15, sectionY + offsetY, width - 30,
        'Evolución próxima', this.settings.notifications.evolutionEnabled, scrollOffset, 'notif-evolution');

      return offsetY;
    });

    this.ctx.restore();
    return currentY;
  }

  // Renderiza una sección con borde redondeado y header
  private renderSettingsSection(x: number, y: number, width: number, title: string, renderContent: (sectionX: number, sectionY: number) => number): number {
    const padding = 15;
    const headerHeight = 30;
    const cornerRadius = 15;

    // Calcular altura del contenido (primera pasada para saber la altura)
    this.ctx.save();
    const contentHeight = renderContent(x, y + headerHeight);
    this.ctx.restore();

    const totalHeight = headerHeight + contentHeight + padding;

    // Fondo blanco de la sección
    this.ctx.fillStyle = '#fff';
    this.roundRect(x, y, width, totalHeight, cornerRadius);
    this.ctx.fill();

    // Borde negro
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.roundRect(x, y, width, totalHeight, cornerRadius);
    this.ctx.stroke();

    // Título (header de la sección)
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(title, x + padding, y + 20);

    // Renderizar contenido real (segunda pasada)
    this.ctx.save();
    renderContent(x, y + headerHeight);
    this.ctx.restore();

    return y + totalHeight;
  }

  // Renderiza una fila de setting (label + toggle)
  private renderSettingRow(x: number, y: number, width: number, label: string, isOn: boolean, scrollOffset: number, id: string): number {
    const rowHeight = 35;

    // Label
    this.ctx.fillStyle = '#000';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(label, x, y + 20);

    // Toggle a la derecha
    const toggleX = x + width - 45;
    const toggleY = y + 10;
    this.renderToggle(toggleX, toggleY, isOn);

    // Registrar área clickeable GENEROSA (toda la fila completa)
    this.clickableAreas.push({
      x: x,  // Desde el inicio de la fila
      y: y,  // Ya está en coordenadas de pantalla (con scroll aplicado)
      w: width,  // Todo el ancho de la fila
      h: rowHeight,  // Toda la altura de la fila
      type: 'toggle',
      id: id
    });

    return rowHeight;
  }

  // Renderiza un botón de setting
  private renderSettingButton(x: number, y: number, width: number, label: string, icon: string, scrollOffset: number, id: string): number {
    const buttonHeight = 40;
    const cornerRadius = 10;

    // Fondo del botón
    this.ctx.fillStyle = '#f0f0f0';
    this.roundRect(x, y, width, buttonHeight, cornerRadius);
    this.ctx.fill();

    // Borde
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.roundRect(x, y, width, buttonHeight, cornerRadius);
    this.ctx.stroke();

    // Icono
    this.ctx.fillStyle = '#000';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(icon, x + 10, y + 27);

    // Label
    this.ctx.font = '14px Arial';
    this.ctx.fillText(label, x + 40, y + 25);

    // Registrar área clickeable (coordenadas ya están en posición visual correcta)
    this.clickableAreas.push({
      x: x,
      y: y,  // Ya está en coordenadas de pantalla (con scroll aplicado)
      w: width,
      h: buttonHeight,
      type: 'button',
      id: id
    });

    return buttonHeight + 10;
  }

  // Renderiza un slider
  private renderSettingSlider(x: number, y: number, width: number, value: number, scrollOffset: number, id: string): number {
    const sliderHeight = 30;

    this.renderSlider(x, y + sliderHeight / 2, width, value);

    // Registrar área clickeable/draggeable del slider (coordenadas ya están en posición visual correcta)
    this.clickableAreas.push({
      x: x,
      y: y,  // Ya está en coordenadas de pantalla (con scroll aplicado)
      w: width,
      h: sliderHeight,
      type: 'slider',
      id: id
    });

    return sliderHeight;
  }

  private renderToggle(x: number, y: number, isOn: boolean) {
    const toggleOn = this.spriteCache.get('ToogleOn.png');
    const toggleOff = this.spriteCache.get('ToggleOff.png');
    const sprite = isOn ? toggleOn : toggleOff;

    if (sprite && sprite.complete) {
      this.ctx.drawImage(sprite, x, y - 10, 40, 20);
    } else {
      // Fallback: dibujar toggle simple
      this.ctx.fillStyle = isOn ? '#4CAF50' : '#ccc';
      this.ctx.fillRect(x, y - 10, 40, 20);
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(x + (isOn ? 30 : 10), y, 8, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderSlider(x: number, y: number, width: number, value: number) {
    const sliderHeight = 6;
    const handleRadius = 10;

    // Barra de fondo
    this.ctx.fillStyle = '#ddd';
    this.ctx.fillRect(x, y - sliderHeight / 2, width, sliderHeight);

    // Barra de progreso
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fillRect(x, y - sliderHeight / 2, width * value, sliderHeight);

    // Handle
    const handleX = x + width * value;
    const handler = this.spriteCache.get('Handler.png');
    if (handler && handler.complete) {
      this.ctx.drawImage(handler, handleX - handleRadius, y - handleRadius, handleRadius * 2, handleRadius * 2);
    } else {
      this.ctx.fillStyle = '#333';
      this.ctx.beginPath();
      this.ctx.arc(handleX, y, handleRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // Renderiza un cuadro de advertencia/aviso
  private renderWarningBox(x: number, y: number, width: number, title: string, text: string): number {
    const padding = 15;
    const cornerRadius = 10;
    const lineHeight = 16;
    const titleHeight = 25;

    // Calcular altura necesaria para el texto
    this.ctx.font = '12px Arial';
    const maxWidth = width - padding * 2;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    // Romper texto en líneas
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    const textHeight = lines.length * lineHeight;
    const totalHeight = titleHeight + textHeight + padding * 2;

    // Fondo blanco
    this.ctx.fillStyle = '#fff';
    this.roundRect(x, y, width, totalHeight, cornerRadius);
    this.ctx.fill();

    // Borde negro
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.roundRect(x, y, width, totalHeight, cornerRadius);
    this.ctx.stroke();

    // Título en bold
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(title, x + padding, y + padding + 12);

    // Texto explicativo
    this.ctx.font = '12px Arial';
    let textY = y + padding + titleHeight;
    for (const line of lines) {
      this.ctx.fillText(line, x + padding, textY);
      textY += lineHeight;
    }

    return totalHeight;
  }

  // Utilidad para dibujar rectángulos con bordes redondeados
  private roundRect(x: number, y: number, width: number, height: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  // ============ SLEEP SCHEDULE POPUP ============

  private renderSleepSchedulePopup() {
    this.ctx.save();

    // Fondo oscuro semitransparente
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Popup sprite (ya tiene todo: título, labels, arrows, buttons)
    const popupW = 360;
    const popupH = 380;
    const popupX = (this.canvas.width - popupW) / 2;
    const popupY = (this.canvas.height - popupH) / 2;

    const popupBg = this.spriteCache.get('Horario de sueño popup.png');
    if (popupBg && popupBg.complete) {
      this.ctx.drawImage(popupBg, popupX, popupY, popupW, popupH);
    }

    // Solo renderizar las horas (el sprite ya tiene todo lo demás)
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';

    // Hora de dormir (en el centro del primer hour picker)
    const sleepHourY = popupY + 145;
    this.ctx.fillText(`${this.tempSleepHour}:00 hrs`, this.canvas.width / 2, sleepHourY);

    // Hora de despertar (en el centro del segundo hour picker)
    const wakeHourY = popupY + 245;
    this.ctx.fillText(`${this.tempWakeUpHour}:00 hrs`, this.canvas.width / 2, wakeHourY);

    this.ctx.restore();
  }

  // ============ CLICK HANDLING ============

  // Método para almacenar las coordenadas del panel (llamado desde GameUI)
  setPanelBounds(x: number, y: number, w: number, h: number) {
    this.panelX = x;
    this.panelY = y;
    this.panelW = w;
    this.panelH = h;
  }

  handleClick(x: number, y: number): boolean {
    // PRIORIDAD 1: Popup de horario (si está abierto)
    if (this.showingSleepSchedulePopup) {
      this.handleSleepSchedulePopupClick(x, y);
      return true; // Consumido
    }

    // PRIORIDAD 2: Verificar clicks en áreas registradas
    for (const area of this.clickableAreas) {
      if (x >= area.x && x <= area.x + area.w &&
          y >= area.y && y <= area.y + area.h) {

        if (area.type === 'toggle') {
          this.handleToggleClick(area.id);
          return true;
        } else if (area.type === 'button') {
          this.handleButtonClick(area.id);
          return true;
        } else if (area.type === 'slider') {
          // Los sliders se manejan con drag, pero también responden a clicks
          const relativeX = x - area.x;
          const newValue = Math.max(0, Math.min(1, relativeX / area.w));
          this.handleSliderChange(area.id, newValue);
          return true;
        }
      }
    }

    // PRIORIDAD 3: Si el click está dentro del panel, consumir (no cerrar)
    // Solo cerrar si está fuera del panel (en el overlay oscuro)
    if (y >= this.panelY) {
      return true; // Click dentro del panel, consumir
    }

    return false; // Click fuera (overlay), cerrar panel
  }

  private handleToggleClick(id: string) {
    console.log(`[SettingsUI] Toggle clicked: ${id}`);

    switch (id) {
      case 'sleep-auto':
        this.settings.sleep.toggleMode();
        this.settings.save();
        console.log(`[Settings] Sleep auto: ${this.settings.sleep.isAutomatic}`);
        break;
      case 'music-enabled':
        this.settings.audio.musicEnabled = !this.settings.audio.musicEnabled;
        this.settings.save();
        console.log(`[Settings] Music enabled: ${this.settings.audio.musicEnabled}`);
        break;
      case 'vibration-enabled':
        this.settings.audio.vibrationEnabled = !this.settings.audio.vibrationEnabled;
        this.settings.save();
        console.log(`[Settings] Vibration enabled: ${this.settings.audio.vibrationEnabled}`);
        break;
      case 'notif-all':
        this.settings.notifications.allEnabled = !this.settings.notifications.allEnabled;
        // Si desactivamos todas, desactivar las individuales también
        if (!this.settings.notifications.allEnabled) {
          this.settings.notifications.hungerEnabled = false;
          this.settings.notifications.illnessEnabled = false;
          this.settings.notifications.poopEnabled = false;
          this.settings.notifications.evolutionEnabled = false;
        } else {
          // Si activamos todas, activar las individuales
          this.settings.notifications.hungerEnabled = true;
          this.settings.notifications.illnessEnabled = true;
          this.settings.notifications.poopEnabled = true;
          this.settings.notifications.evolutionEnabled = true;
        }
        this.settings.save();
        console.log(`[Settings] All notifications: ${this.settings.notifications.allEnabled}`);
        break;
      case 'notif-hunger':
        this.settings.notifications.hungerEnabled = !this.settings.notifications.hungerEnabled;
        // Si desactivamos alguna individual, desactivar el toggle general también
        if (!this.settings.notifications.hungerEnabled) {
          this.settings.notifications.allEnabled = false;
        }
        this.settings.save();
        console.log(`[Settings] Hunger notifications: ${this.settings.notifications.hungerEnabled}`);
        break;
      case 'notif-illness':
        this.settings.notifications.illnessEnabled = !this.settings.notifications.illnessEnabled;
        if (!this.settings.notifications.illnessEnabled) {
          this.settings.notifications.allEnabled = false;
        }
        this.settings.save();
        console.log(`[Settings] Illness notifications: ${this.settings.notifications.illnessEnabled}`);
        break;
      case 'notif-poop':
        this.settings.notifications.poopEnabled = !this.settings.notifications.poopEnabled;
        if (!this.settings.notifications.poopEnabled) {
          this.settings.notifications.allEnabled = false;
        }
        this.settings.save();
        console.log(`[Settings] Poop notifications: ${this.settings.notifications.poopEnabled}`);
        break;
      case 'notif-evolution':
        this.settings.notifications.evolutionEnabled = !this.settings.notifications.evolutionEnabled;
        if (!this.settings.notifications.evolutionEnabled) {
          this.settings.notifications.allEnabled = false;
        }
        this.settings.save();
        console.log(`[Settings] Evolution notifications: ${this.settings.notifications.evolutionEnabled}`);
        break;
    }
  }

  private handleButtonClick(id: string) {
    console.log(`[SettingsUI] Button clicked: ${id}`);

    switch (id) {
      case 'sleep-schedule':
        this.openSleepSchedulePopup();
        break;
    }
  }

  private handleSliderChange(id: string, value: number) {
    console.log(`[SettingsUI] Slider changed: ${id} = ${value}`);

    switch (id) {
      case 'music-volume':
        this.settings.audio.musicVolume = value;
        this.settings.save();
        console.log(`[Settings] Music volume: ${value}`);
        break;
    }
  }

  private handleSleepSchedulePopupClick(x: number, y: number) {
    const popupW = 360;
    const popupH = 380;
    const popupX = (this.canvas.width - popupW) / 2;
    const popupY = (this.canvas.height - popupH) / 2;

    // Flechas del sleep hour picker (primer picker)
    const sleepPickerCenterY = popupY + 145;
    this.handleHourPickerClick(x, y, sleepPickerCenterY, (newHour) => {
      this.tempSleepHour = newHour;
    });

    // Flechas del wake up hour picker (segundo picker)
    const wakePickerCenterY = popupY + 245;
    this.handleHourPickerClick(x, y, wakePickerCenterY, (newHour) => {
      this.tempWakeUpHour = newHour;
    });

    // Botones (basados en el sprite)
    const buttonY = popupY + 320;
    const buttonW = 140;
    const buttonH = 40;
    const buttonGap = 10;

    // Cancelar (izquierda)
    const cancelX = popupX + 45;
    if (x >= cancelX && x <= cancelX + buttonW &&
        y >= buttonY && y <= buttonY + buttonH) {
      // Cancelar: restaurar valores originales
      this.tempSleepHour = this.settings.sleep.sleepHour;
      this.tempWakeUpHour = this.settings.sleep.wakeUpHour;
      this.showingSleepSchedulePopup = false;
      return;
    }

    // Confirmar (derecha)
    const confirmX = popupX + 45 + buttonW + buttonGap;
    if (x >= confirmX && x <= confirmX + buttonW &&
        y >= buttonY && y <= buttonY + buttonH) {
      // Confirmar: aplicar cambios
      this.settings.sleep.setSchedule(this.tempSleepHour, this.tempWakeUpHour);
      this.settings.save();
      this.showingSleepSchedulePopup = false;
      console.log('[Settings] Sleep schedule updated');
      return;
    }
  }

  private handleHourPickerClick(x: number, y: number, centerY: number, onHourChange: (newHour: number) => void) {
    // Dimensiones del hour picker en el sprite
    const popupW = 360;
    const popupX = (this.canvas.width - popupW) / 2;
    const pickerW = 270; // Ancho del hour picker box en el sprite
    const pickerX = popupX + 45;
    const pickerH = 40;

    // Áreas clickeables para las flechas (basadas en el sprite)
    const arrowClickW = 50;

    // Flecha izquierda (left arrow)
    const leftArrowArea = {
      x: pickerX,
      y: centerY - pickerH / 2,
      w: arrowClickW,
      h: pickerH
    };

    if (x >= leftArrowArea.x && x <= leftArrowArea.x + leftArrowArea.w &&
        y >= leftArrowArea.y && y <= leftArrowArea.y + leftArrowArea.h) {
      // Decrementar hora
      const popupY = (this.canvas.height - 380) / 2;
      const isSleepPicker = Math.abs(centerY - (popupY + 145)) < 10;
      const currentHour = isSleepPicker ? this.tempSleepHour : this.tempWakeUpHour;
      const newHour = currentHour === 0 ? 23 : currentHour - 1;
      onHourChange(newHour);
      return;
    }

    // Flecha derecha (right arrow)
    const rightArrowArea = {
      x: pickerX + pickerW - arrowClickW,
      y: centerY - pickerH / 2,
      w: arrowClickW,
      h: pickerH
    };

    if (x >= rightArrowArea.x && x <= rightArrowArea.x + rightArrowArea.w &&
        y >= rightArrowArea.y && y <= rightArrowArea.y + rightArrowArea.h) {
      // Incrementar hora
      const popupY = (this.canvas.height - 380) / 2;
      const isSleepPicker = Math.abs(centerY - (popupY + 145)) < 10;
      const currentHour = isSleepPicker ? this.tempSleepHour : this.tempWakeUpHour;
      const newHour = currentHour === 23 ? 0 : currentHour + 1;
      onHourChange(newHour);
      return;
    }
  }

  // Método público para abrir el popup de horario
  openSleepSchedulePopup() {
    this.tempSleepHour = this.settings.sleep.sleepHour;
    this.tempWakeUpHour = this.settings.sleep.wakeUpHour;
    this.showingSleepSchedulePopup = true;
  }
}
