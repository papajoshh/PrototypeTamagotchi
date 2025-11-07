import { Pet } from '../core/Pet';
import { LifeStage } from '../core/LifeStage';
import { EvolutionTree } from '../core/EvolutionTree';
import { TIME_MODES } from '../core/GameLoop';
import { TheButtonUI } from '../minigames/theButton/TheButtonUI';
import { TheButtonRewards } from '../minigames/theButton/TheButtonRewards';
import { EdgyBunBunUI } from '../minigames/edgyBunBun/EdgyBunBunUI';
import { GuessTheHigherUI } from '../minigames/guessTheHigher/GuessTheHigherUI';
import { SimonDiceUI } from '../minigames/simonDice/SimonDiceUI';
import { ParachuteUI } from '../minigames/parachute/ParachuteUI';
import { MochiCookingUI } from '../minigames/mochiCooking/MochiCookingUI';
import { Ingredient } from '../core/Ingredient';
import { Settings } from '../core/Settings';
import { SettingsUI } from './SettingsUI';
import { FeedingRewards } from './FeedingRewards';

export class GameUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pet: Pet;
  private settings: Settings;
  private settingsUI: SettingsUI;
  private timeMultiplier: number = 1;

  // Callbacks
  onFeed?: () => void;
  onPlay?: () => void;
  onCleanPoop?: () => void;
  onCure?: () => void;
  onTimeChange?: (multiplier: number) => void;
  onTapEgg?: () => void;
  onFeedWithIngredient?: (ingredientId: string) => void;
  onPlayMinigame?: (minigameId: string, personality: string) => void;
  onStartCookingMinigame?: (ingredientId: string, tier: number) => void;

  // Estado de UI
  private currentMenu: 'feed' | 'play' | 'room' | 'settings' | null = null;
  private menuAnimationProgress: number = 0;
  private readonly MENU_ANIMATION_DURATION = 300; // ms
  private menuAnimationStartTime: number = 0;
  private isMenuClosing: boolean = false;

  // Estado de scroll para settings
  private settingsScrollOffset: number = 0;
  private isDraggingSettings: boolean = false;
  private settingsDragStartY: number = 0;
  private settingsDragStartScrollOffset: number = 0;
  private settingsMaxScroll: number = 0;

  // Touch tracking para distinguir tap de drag
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;

  // Settings UI state
  private settingsCache: Map<string, HTMLImageElement> = new Map();
  private showingSleepSchedulePopup: boolean = false;
  private showingInitialSetupPopup: boolean = false;
  private tempSleepHour: number = 22;
  private tempWakeUpHour: number = 7;
  private sleepScreen: boolean = false; // True cuando está en pantalla de sleep

  // Sistema de feedback visual
  private feedbackType: string | null = null;
  private feedbackTimer: number = 0;
  private feedbackStartTime: number = 0;
  private readonly FEEDBACK_DURATION = 2000; // 2 segundos en ms

  // Sprite loading
  private spriteCache: Map<string, HTMLImageElement> = new Map();
  private roomCache: Map<string, HTMLImageElement> = new Map();
  private mochiCache: Map<string, HTMLImageElement> = new Map();
  private ingredientCache: Map<string, HTMLImageElement> = new Map();
  private personalityIconCache: Map<string, HTMLImageElement> = new Map();
  private styleIconCache: Map<string, HTMLImageElement> = new Map();

  // Estado de la interfaz de comida
  private selectedIngredient: string | null = null; // ID del ingrediente seleccionado (solo uno)
  private previewMochi: {personality: string, stars: number} | null = null;
  private ingredientScrollX: number = 0; // Scroll horizontal del grid de ingredientes
  private isDraggingIngredients: boolean = false;
  private dragStartX: number = 0;
  private dragStartScrollX: number = 0;

  // Estado de la interfaz de minijuegos
  private selectedMinigame: string | null = 'theButton'; // ID del minijuego seleccionado (default: El Botón)
  private minigames = [
    { id: 'theButton', name: 'El Botón', personality: 'anxious', stars: 1 },
    { id: 'edgyBunBun', name: 'EdgyBunBun', personality: 'edgy', stars: 1 },
    { id: 'higherOrLower', name: 'Higher or Lower', personality: 'geek', stars: 1 },
    { id: 'simonDice', name: 'Simón Dice', personality: 'intelectual', stars: 1 },
    { id: 'parachute', name: 'Parachute', personality: 'sassy', stars: 1 },
  ];

  // Estado del minijuego activo
  private activeMinigame: TheButtonUI | EdgyBunBunUI | SimonDiceUI | GuessTheHigherUI | ParachuteUI | MochiCookingUI | null = null;
  private minigameRewards: TheButtonRewards | null = null;
  private showingRewards: boolean = false;

  // Feeding rewards
  private feedingRewards: FeedingRewards;
  private showingFeedingRewards: boolean = false;

  constructor(canvas: HTMLCanvasElement, pet: Pet, settings: Settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.pet = pet;
    this.settings = settings;
    this.settingsUI = new SettingsUI(canvas, settings);
    this.feedingRewards = new FeedingRewards(canvas);

    // Aplicar filtro blanco y negro al canvas (compatible con móvil)
    this.canvas.style.filter = 'grayscale(100%)';

    // Setup event listeners
    this.setupEventListeners();

    // Preload sprites
    this.preloadSprites();

    // El popup de horario solo se abre desde settings, no automáticamente
  }

  private preloadSprites() {
    // Preload child sprites (solo base personalities)
    const childPersonalities = ['anxious', 'edgy', 'geek', 'intelectual', 'sassy', 'neutral'];
    childPersonalities.forEach(personality => {
      const key = `child-${personality}`;
      const img = new Image();
      img.src = `/assets/pets/child/${personality}.png`;
      this.spriteCache.set(key, img);
    });

    // Preload young sprites (arquetipos específicos + base)
    const youngSprites = [
      'AbsolutoEdgy', 'CerebroGalaxia', 'Cosplayer',
      'El villano que en realidad es buen tipo', 'ElPersonajeProdigioso',
      'ElVillanoDeTuSerieFavorita', 'Emo', 'Fanatico', 'Ingeniero',
      'JugadorDeRol', 'Nerd', 'Otaku', 'OtakuCringe', 'Overthinker',
      'Showman',
      // Base personalities como fallback
      'anxious', 'edgy', 'geek', 'intelectual', 'sassy', 'neutral'
    ];
    youngSprites.forEach(sprite => {
      const key = `young-${sprite}`;
      const img = new Image();
      img.src = `/assets/pets/young/${sprite}.png`;
      this.spriteCache.set(key, img);
    });

    // Preload adult sprites (personalidades finales específicas + base)
    const adultSprites = [
      'Bowser', 'Drácula', 'Dungeon Master', 'Edgar Allan Poe', 'Eggman',
      'Elsa', 'Frodo', 'Gerard Way', 'Glados', 'Hackerman', 'Kira', 'Kojima',
      'L', 'Lovecraft', 'Lucifer', 'Megamente', 'Mewtwo', 'Milenial', 'Neo',
      'R2D2', 'Reddit', 'Sasuke', 'Shadow', 'Sheldon Cooper', 'Shinji', 'Tails',
      // Base personalities como fallback
      'anxious', 'edgy', 'geek', 'intelectual', 'sassy', 'neutral',
      // Placeholder para sprites faltantes
      'placeholder'
    ];
    adultSprites.forEach(sprite => {
      const key = `adult-${sprite}`;
      const img = new Image();
      img.src = `/assets/pets/adult/${sprite}.png`;
      this.spriteCache.set(key, img);
    });

    // Preload special sprites
    const eggImg = new Image();
    eggImg.src = '/assets/pets/special/egg.png';
    this.spriteCache.set('egg', eggImg);

    const babyImg = new Image();
    babyImg.src = '/assets/pets/special/baby.png';
    this.spriteCache.set('baby', babyImg);

    // Preload room sprites
    const rooms = ['anxious', 'edgy', 'geek', 'intelectual', 'sassy', 'default'];
    rooms.forEach(room => {
      const img = new Image();
      img.src = `/assets/rooms/${room}.png`;
      this.roomCache.set(room, img);
    });

    // Preload mochi sprites
    const mochiPersonalities = ['anxious', 'edgy', 'geek', 'intelectual', 'neutral', 'sassy'];
    mochiPersonalities.forEach(personality => {
      const img = new Image();
      img.src = `/assets/mochis/mochi_${personality}.png`;
      this.mochiCache.set(personality, img);
    });

    // Preload ingredient sprites
    const ingredientPersonalities = ['Anxious', 'Edgy', 'Geek', 'Intelectual', 'Sassy'];
    const tiers = ['Basic', 'Medium', 'Premium'];
    ingredientPersonalities.forEach(personality => {
      tiers.forEach((tier, index) => {
        const img = new Image();
        img.src = `/assets/ingredients/${personality}${tier}.jpg`;
        // Key format: "anxious_1", "anxious_2", "anxious_3"
        this.ingredientCache.set(`${personality.toLowerCase()}_${index + 1}`, img);
      });
    });

    // No ingredient sprite
    const noIngImg = new Image();
    noIngImg.src = '/assets/ingredients/NoIngredient.jpg';
    this.ingredientCache.set('none', noIngImg);

    // Preload personality icons
    const personalityIcons = {
      'anxious': 'Nerviosillo_Icon.png',
      'edgy': 'Edgy_Icon.png',
      'geek': 'Friji_icon.png',
      'intelectual': 'Intelectual_Icon.png',
      'sassy': 'Sassy_Icon.png'
    };

    Object.entries(personalityIcons).forEach(([personality, filename]) => {
      const img = new Image();
      img.src = `/assets/personalities/${filename}`;
      this.personalityIconCache.set(personality, img);
    });

    // Preload style icons (for room decoration tab)
    const styles = ['default', 'anxious', 'edgy', 'geek', 'intelectual', 'sassy'];
    styles.forEach(style => {
      const img = new Image();
      img.src = `/assets/styles/${style}.png`;
      this.styleIconCache.set(style, img);
    });

    // Preload settings sprites
    const settingsSprites = [
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

    settingsSprites.forEach(filename => {
      const img = new Image();
      img.src = `/assets/settings/${filename}`;
      this.settingsCache.set(filename, img);
    });
  }

  private getSpriteForPet(): HTMLImageElement | null {
    // Special sprites for Egg and Baby
    if (this.pet.stage === LifeStage.Egg) {
      return this.spriteCache.get('egg') || null;
    }

    if (this.pet.stage === LifeStage.Baby) {
      return this.spriteCache.get('baby') || null;
    }

    // Use emojis for ReadyToAscend, Dead
    if (this.pet.stage === LifeStage.ReadyToAscend ||
        this.pet.stage === LifeStage.Dead) {
      return null; // Use emoji rendering
    }

    // Map stage to folder
    const stageFolder = {
      [LifeStage.Child]: 'child',
      [LifeStage.Young]: 'young',
      [LifeStage.Adult]: 'adult',
    }[this.pet.stage];

    if (!stageFolder) return null;

    // Get sprite filename using EvolutionTree
    // Handles exact names like "Glados", "Ingeniero", etc.
    if (!this.pet.personality) return null;

    const spriteFilename = EvolutionTree.getSpriteFilename(this.pet.personality.name);

    // Si es descuidado o patata, usar emoji
    if (spriteFilename === 'neutral' &&
        (this.pet.personality.name.toLowerCase().includes('descuidado') ||
         this.pet.personality.name.toLowerCase().includes('patata'))) {
      return null; // Use emoji rendering
    }

    // Try to get exact sprite first
    const specificKey = `${stageFolder}-${spriteFilename}`;
    let sprite = this.spriteCache.get(specificKey);

    // Fallback 1: try base personality sprites
    if (!sprite || !sprite.complete) {
      const basePersonalities = ['anxious', 'edgy', 'geek', 'intelectual', 'sassy'];
      for (const base of basePersonalities) {
        if (this.pet.personality.name.toLowerCase().includes(base)) {
          const fallbackKey = `${stageFolder}-${base}`;
          sprite = this.spriteCache.get(fallbackKey);
          if (sprite && sprite.complete) break;
        }
      }
    }

    // Fallback 2: placeholder para adult (sprites faltantes)
    if ((!sprite || !sprite.complete) && this.pet.stage === LifeStage.Adult) {
      sprite = this.spriteCache.get('adult-placeholder');
      console.log(`[GameUI] Using placeholder for Adult "${this.pet.personality.name}"`);
    }

    // Fallback 3: neutral como último recurso
    if (!sprite || !sprite.complete) {
      sprite = this.spriteCache.get(`${stageFolder}-neutral`);
    }

    if (sprite && sprite.complete) {
      return sprite;
    }

    // Fallback to neutral
    const neutralKey = `${stageFolder}-neutral`;
    return this.spriteCache.get(neutralKey) || null;
  }

  setupEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.handleClick(x, y);
    });

    // Drag para scroll horizontal de ingredientes y scroll vertical de settings
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.currentMenu === 'feed') {
        const panelHeight = 310;
        const panelY = this.canvas.height - panelHeight * this.menuAnimationProgress;
        const contentStartY = panelY + 10;
        const previewHeight = 90;
        const gridStartY = contentStartY + previewHeight + 15 + 15; // +15 para el título
        const gridHeight = 2 * (70 + 10);

        if (y >= gridStartY && y <= gridStartY + gridHeight) {
          this.isDraggingIngredients = true;
          this.dragStartX = x;
          this.dragStartScrollX = this.ingredientScrollX;
        }
      } else if (this.currentMenu === 'settings') {
        const panelHeight = 500;
        const panelY = this.canvas.height - panelHeight * this.menuAnimationProgress;
        const headerHeight = 50;
        const closeBarHeight = 40;
        const contentY = panelY + headerHeight;
        const contentHeight = panelHeight - headerHeight - closeBarHeight;

        // Solo permitir drag en el área de contenido (no en header ni en barra de cierre)
        if (y >= contentY && y <= contentY + contentHeight) {
          this.isDraggingSettings = true;
          this.settingsDragStartY = y;
          this.settingsDragStartScrollOffset = this.settingsScrollOffset;
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDraggingIngredients) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const deltaX = this.dragStartX - x;
        this.ingredientScrollX = this.dragStartScrollX + deltaX;
      } else if (this.isDraggingSettings) {
        const rect = this.canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const deltaY = this.settingsDragStartY - y;
        this.settingsScrollOffset = this.settingsDragStartScrollOffset + deltaY;
        // Clamp se hace en renderSettingsContent
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDraggingIngredients = false;
      this.isDraggingSettings = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDraggingIngredients = false;
      this.isDraggingSettings = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Guardar posición y tiempo inicial del touch
      this.touchStartX = x;
      this.touchStartY = y;
      this.touchStartTime = Date.now();

      if (this.currentMenu === 'feed') {
        const panelHeight = 310;
        const panelY = this.canvas.height - panelHeight * this.menuAnimationProgress;
        const contentStartY = panelY + 10;
        const previewHeight = 90;
        const gridStartY = contentStartY + previewHeight + 15 + 15; // +15 para el título
        const gridHeight = 2 * (70 + 10);

        if (y >= gridStartY && y <= gridStartY + gridHeight) {
          this.isDraggingIngredients = true;
          this.dragStartX = x;
          this.dragStartScrollX = this.ingredientScrollX;
          e.preventDefault();
        }
      } else if (this.currentMenu === 'settings') {
        const panelHeight = 500;
        const panelY = this.canvas.height - panelHeight * this.menuAnimationProgress;
        const headerHeight = 50;
        const closeBarHeight = 40;
        const contentY = panelY + headerHeight;
        const contentHeight = panelHeight - headerHeight - closeBarHeight;

        // Solo permitir drag en el área de contenido (no en header ni en barra de cierre)
        if (y >= contentY && y <= contentY + contentHeight) {
          this.isDraggingSettings = true;
          this.settingsDragStartY = y;
          this.settingsDragStartScrollOffset = this.settingsScrollOffset;
          e.preventDefault();
        }
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.isDraggingIngredients) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const deltaX = this.dragStartX - x;
        this.ingredientScrollX = this.dragStartScrollX + deltaX;
        e.preventDefault();
      } else if (this.isDraggingSettings) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const y = touch.clientY - rect.top;
        const deltaY = this.settingsDragStartY - y;
        this.settingsScrollOffset = this.settingsDragStartScrollOffset + deltaY;
        e.preventDefault();
      }
    });

    this.canvas.addEventListener('touchend', (e) => {
      const wasDragging = this.isDraggingIngredients || this.isDraggingSettings;

      this.isDraggingIngredients = false;
      this.isDraggingSettings = false;

      // Si no estaba dragging, es un tap → llamar handleClick()
      if (!wasDragging && e.changedTouches && e.changedTouches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Verificar que el touch no se movió mucho (máximo 10px)
        const distance = Math.sqrt(
          Math.pow(x - this.touchStartX, 2) +
          Math.pow(y - this.touchStartY, 2)
        );

        // Verificar que fue rápido (máximo 300ms)
        const duration = Date.now() - this.touchStartTime;

        // Si es un tap (poco movimiento y rápido), llamar handleClick
        if (distance < 10 && duration < 300) {
          this.handleClick(x, y);
          e.preventDefault(); // Prevenir click duplicado
        }
      }
    });
  }

  openMenu(menu: 'feed' | 'play' | 'room' | 'settings') {
    this.currentMenu = menu;
    this.menuAnimationStartTime = Date.now();
    this.menuAnimationProgress = 0;
    this.isMenuClosing = false;

    // Si abrimos el menú de comida y no hay nada seleccionado, seleccionar neutral por defecto
    if (menu === 'feed' && this.selectedIngredient === null) {
      this.selectedIngredient = 'neutral';
    }

    // Resetear scroll de settings al abrir
    if (menu === 'settings') {
      this.settingsScrollOffset = 0;
    }
  }

  closeMenu() {
    if (this.currentMenu && !this.isMenuClosing) {
      // Iniciar animación de cierre
      this.isMenuClosing = true;
      this.menuAnimationStartTime = Date.now();
    }
  }

  handleClick(x: number, y: number) {
    // PRIORIDAD 0: Si hay minijuego activo, NO procesar clicks del main room
    if (this.activeMinigame) {
      return;
    }

    // PRIORIDAD 1: Settings panel (si está abierto)
    if (this.currentMenu === 'settings') {
      // Verificar si click en barra de volver (TODA la barra horizontal, no solo la flecha)
      const panelHeight = 500;
      const closeBarHeight = 40;
      const panelY = this.canvas.height - panelHeight * this.menuAnimationProgress;
      const closeBarY = panelY + panelHeight - closeBarHeight;

      // Área clickeable: TODA la barra horizontal (ancho completo del canvas)
      if (y >= closeBarY && y <= closeBarY + closeBarHeight) {
        // Click en barra de volver: cerrar panel
        this.closeMenu();
        return;
      }

      // Si no es en la flecha, delegar a SettingsUI
      const consumed = this.settingsUI.handleClick(x, y);
      if (!consumed) {
        // Si SettingsUI no consume el click (click fuera del panel), cerrar
        this.closeMenu();
      }
      return;
    }

    // PRIORIDAD 2: Pantalla de sleep
    if (this.settings.sleep.isSleeping) {
      // Click en botón despertar (izquierda, misma posición que mimir)
      const wakeButton = this.settingsCache.get('Boton despertar.png');
      const wakeX = 15;
      const wakeY = this.canvas.height * 0.35;

      // Calcular tamaño con aspect ratio mantenido
      let wakeW = 55;
      let wakeH = 55;
      if (wakeButton && wakeButton.complete) {
        const spriteAspect = wakeButton.width / wakeButton.height;
        wakeH = 55;
        wakeW = wakeH * spriteAspect;
      }

      if (x >= wakeX && x <= wakeX + wakeW &&
          y >= wakeY && y <= wakeY + wakeH) {
        this.settings.sleep.wakeUp();
        console.log('[Settings] Pet woken up');

        // Si está en modo automático, mostrar aviso de que se volverá a dormir
        if (this.settings.sleep.isAutomatic) {
          this.showFeedback('wake_auto_warning');
        }
      }
      return;
    }

    // PRIORIDAD 3: Botones especiales en main room
    // Botón Settings (arriba a la derecha)
    const settingsX = this.canvas.width - 70;
    const settingsY = 20;
    const settingsSize = 50;

    if (x >= settingsX && x <= settingsX + settingsSize &&
        y >= settingsY && y <= settingsY + settingsSize) {
      this.openMenu('settings');
      return;
    }

    // Botón Mimir (izquierda, más arriba, solo en modo manual)
    if (this.settings.sleep.isManual && !this.settings.sleep.isSleeping) {
      const mimirButton = this.settingsCache.get('Boton mimir.png');
      const mimirX = 15;
      const mimirY = this.canvas.height * 0.35;

      // Calcular tamaño con aspect ratio mantenido
      let mimirW = 55;
      let mimirH = 55;
      if (mimirButton && mimirButton.complete) {
        const spriteAspect = mimirButton.width / mimirButton.height;
        mimirH = 55;
        mimirW = mimirH * spriteAspect;
      }

      if (x >= mimirX && x <= mimirX + mimirW &&
          y >= mimirY && y <= mimirY + mimirH) {
        this.settings.sleep.sleep();
        console.log('[Settings] Pet went to sleep (manual mode)');
        return;
      }
    }

    // Tap en el huevo
    if (this.pet.stage === LifeStage.Egg) {
      if (this.onTapEgg) {
        this.onTapEgg();
      }
      return;
    }

    // Tap en la calavera (muerto) -> reiniciar
    if (this.pet.stage === LifeStage.Dead) {
      // Click en el área central donde está la calavera
      const centerX = this.canvas.width / 2;
      const centerY = 300;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

      if (distance < 100) { // Radio de 100px alrededor de la calavera
        if (this.onTapEgg) {
          this.onTapEgg(); // Reutilizar el callback para reiniciar
        }
      }
      return;
    }

    // Si hay un menú abierto
    if (this.currentMenu) {
      // No permitir interacción durante la animación de cierre
      if (this.isMenuClosing) {
        return;
      }

      // Altura del panel (desde el fondo hacia arriba) - solo 2 filas de ingredientes
      const panelHeight = 310;
      const tabHeight = 50;
      const panelY = this.canvas.height - panelHeight * this.menuAnimationProgress;

      // Click en pestañas
      const tabsY = panelY - tabHeight;
      if (y >= tabsY && y < panelY) {
        const tabs: ('feed' | 'play' | 'room' | 'settings')[] = ['feed', 'play', 'room', 'settings'];
        const tabWidth = this.canvas.width / tabs.length;
        const tabIndex = Math.floor(x / tabWidth);
        if (tabIndex >= 0 && tabIndex < tabs.length) {
          // Solo cambiar el menú actual, sin reiniciar la animación
          this.currentMenu = tabs[tabIndex];
        }
        return;
      }

      // Click en overlay (fuera del panel y pestañas) -> cerrar
      if (y < tabsY) {
        this.closeMenu();
        return;
      }

      // Click dentro del panel -> manejar según el menú
      this.handleMenuPanelClick(x, y, panelY);
      return;
    }

    // Botones de menú inferior - ahora son 3 botones (sin medicina)
    const buttonY = 560;
    const buttonWidth = 160; // 480px / 3 botones
    const buttonHeight = 60;

    if (y >= buttonY && y <= buttonY + buttonHeight) {
      if (x >= 0 && x < buttonWidth) {
        this.openMenu('feed');
      } else if (x >= buttonWidth && x < buttonWidth * 2) {
        this.openMenu('play');
      } else if (x >= buttonWidth * 2 && x < buttonWidth * 3) {
        this.openMenu('room');
      }
      return;
    }

    // Limpiar caca
    if (this.pet.poop.hasPoopedNow()) {
      // Area de la caca (centro-derecha)
      if (x >= 300 && x <= 400 && y >= 300 && y <= 400) {
        if (this.onCleanPoop) this.onCleanPoop();
      }
    }

    // Curar enfermedad - click en la criatura
    if (this.pet.illness.isCurrentlyIll()) {
      // Area de la criatura (centro)
      const centerX = this.canvas.width / 2;
      const centerY = 300;
      const clickRadius = 100; // Radio de 100px alrededor de la criatura

      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (distance < clickRadius) {
        if (this.onCure) this.onCure();
      }
    }
  }

  handleMenuPanelClick(x: number, y: number, panelY: number) {
    const contentStartY = panelY + 10; // Inicio del contenido

    if (this.currentMenu === 'feed') {
      // Panel superior de preview (imagen del mochi + info)
      const previewHeight = 90;

      // Botón "Cocinar" en el preview
      const cookButtonX = this.canvas.width - 100;
      const cookButtonY = panelY + 10 + 50;
      const cookButtonW = 80;
      const cookButtonH = 30;

      if (x >= cookButtonX && x <= cookButtonX + cookButtonW &&
          y >= cookButtonY && y <= cookButtonY + cookButtonH) {
        // Verificar si está enfermo antes de cocinar
        if (this.pet.illness.isCurrentlyIll()) {
          this.closeMenu();
          this.showFeedback('refuse_food_sick');
          return;
        }

        // Verificar si está lleno antes de cocinar
        if (this.pet.hunger.isFullySatiated()) {
          this.closeMenu();
          this.showFeedback('refuse_food');
          return;
        }

        // Cocinar mochi solo si hay ingrediente seleccionado
        if (this.selectedIngredient && this.onStartCookingMinigame) {
          console.log('[UI] Iniciando minijuego de cocinar mochi con ingrediente:', this.selectedIngredient);

          // Obtener el tier del ingrediente
          let tier = 1;
          if (this.selectedIngredient === 'neutral') {
            tier = 1;
          } else {
            const inventory = this.pet.inventory.getAll();
            const item = inventory.find(i => i.ingredient.identifier === this.selectedIngredient);
            if (item) {
              tier = item.ingredient.tier;
            }
          }

          const ingredientToUse = this.selectedIngredient;
          this.closeMenu(); // Cerrar menú ANTES de lanzar
          this.onStartCookingMinigame(ingredientToUse, tier);
        }
        return;
      }

      // Grid de ingredientes con scroll (2 filas)
      const gridStartY = contentStartY + previewHeight + 15 + 15; // +15 para el título
      const inventory = this.pet.inventory.getAll();
      const cellSize = 70;
      const cellGap = 10;
      const rows = 2;
      const separatorWidth = 2;
      const separatorGap = 10;

      // Organizar por tier
      const neutral = { ingredient: { identifier: 'neutral', tier: 0, personality: 'neutral', name: 'Neutral' }, quantity: Infinity };
      const tier1Items = inventory.filter(i => i.ingredient.tier === 1);
      const tier2Items = inventory.filter(i => i.ingredient.tier === 2);
      const tier3Items = inventory.filter(i => i.ingredient.tier === 3);

      const tier1Cols = Math.ceil((tier1Items.length + 1) / rows);
      const tier2Cols = Math.ceil(tier2Items.length / rows);
      const tier3Cols = Math.ceil(tier3Items.length / rows);

      const tier1Width = tier1Cols * (cellSize + cellGap);
      const tier2Width = tier2Cols > 0 ? tier2Cols * (cellSize + cellGap) : 0;
      const tier3Width = tier3Cols > 0 ? tier3Cols * (cellSize + cellGap) : 0;

      // Función helper para verificar click en ingrediente
      const checkIngredientClick = (item: any, col: number, row: number, baseX: number): boolean => {
        const cellX = baseX + col * (cellSize + cellGap) - this.ingredientScrollX + 10;
        const cellY = gridStartY + row * (cellSize + cellGap);

        if (x >= cellX && x <= cellX + cellSize &&
            y >= cellY && y <= cellY + cellSize) {
          const ingId = item.ingredient.identifier;
          // No permitir deseleccionar - siempre debe haber algo seleccionado
          if (this.selectedIngredient !== ingId) {
            this.selectedIngredient = ingId;
            console.log('[UI] Ingrediente seleccionado:', this.selectedIngredient);
          }
          return true;
        }
        return false;
      };

      let currentX = 0;

      // Tier 1 (neutral + tier 1)
      const allTier1 = [neutral, ...tier1Items];
      for (let i = 0; i < allTier1.length; i++) {
        const col = Math.floor(i / rows);
        const row = i % rows;
        if (checkIngredientClick(allTier1[i], col, row, currentX)) return;
      }

      currentX += tier1Width + (tier2Cols > 0 ? separatorGap * 2 + separatorWidth : 0);

      // Tier 2
      for (let i = 0; i < tier2Items.length; i++) {
        const col = Math.floor(i / rows);
        const row = i % rows;
        if (checkIngredientClick(tier2Items[i], col, row, currentX)) return;
      }

      currentX += tier2Width + (tier3Cols > 0 ? separatorGap * 2 + separatorWidth : 0);

      // Tier 3
      for (let i = 0; i < tier3Items.length; i++) {
        const col = Math.floor(i / rows);
        const row = i % rows;
        if (checkIngredientClick(tier3Items[i], col, row, currentX)) return;
      }
    } else if (this.currentMenu === 'play') {
      const previewHeight = 120;

      // Botón de jugar en el preview panel
      const buttonW = 150;
      const buttonH = 40;
      const buttonX = this.canvas.width - buttonW - 20;
      const buttonY = contentStartY + previewHeight - buttonH - 10;

      if (x >= buttonX && x <= buttonX + buttonW && y >= buttonY && y <= buttonY + buttonH) {
        // Verificar si está enfermo antes de jugar
        if (this.pet.illness.isCurrentlyIll()) {
          this.closeMenu();
          this.showFeedback('refuse_play_sick');
          return;
        }

        // Verificar si tiene hambre antes de jugar
        if (this.pet.hunger.isHungry()) {
          this.closeMenu();
          this.showFeedback('refuse_play_hungry');
          return;
        }

        // Jugar el minijuego seleccionado
        if (this.selectedMinigame) {
          const minigame = this.minigames.find(m => m.id === this.selectedMinigame);
          if (minigame) {
            console.log('[UI] Lanzar minijuego:', minigame.name);
            this.launchMinigame(minigame.id, minigame.personality);

            // También llamar al callback si existe (para estadísticas, etc.)
            if (this.onPlayMinigame) {
              this.onPlayMinigame(minigame.id, minigame.personality);
            }
          }
        }
        this.closeMenu();
        return;
      }

      // Clicks en el grid de minijuegos
      const gridStartY = contentStartY + previewHeight + 20;
      const cellSize = 80;
      const cellGap = 10;
      const gridPadding = 10;
      const cols = 5; // Todos en una sola fila

      this.minigames.forEach((minigame, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cellX = gridPadding + col * (cellSize + cellGap);
        const cellY = gridStartY + row * (cellSize + cellGap);

        if (x >= cellX && x <= cellX + cellSize &&
            y >= cellY && y <= cellY + cellSize) {
          // Seleccionar este minijuego
          if (this.selectedMinigame === minigame.id) {
            // Si ya está seleccionado, no hacer nada (siempre debe haber uno seleccionado)
          } else {
            this.selectedMinigame = minigame.id;
          }
          console.log('[UI] Minijuego seleccionado:', this.selectedMinigame);
        }
      });
    } else if (this.currentMenu === 'room') {
      // Grid de estilos de habitación
      const styles = [
        { id: 'style1', name: 'Básico' },
        { id: 'anxious', name: 'Anxious' },
        { id: 'edgy', name: 'Edgy' },
        { id: 'geek', name: 'Geek' },
        { id: 'intelectual', name: 'Intelectual' },
        { id: 'sassy', name: 'Sassy' },
      ];

      const cellSize = 70;
      const gridPadding = 20;
      const cellGap = 10;
      const cols = 3;
      const gridStartY = contentStartY + 20;

      styles.forEach((style, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cellX = gridPadding + col * (cellSize + cellGap);
        const cellY = gridStartY + row * (cellSize + cellGap);

        if (x >= cellX && x <= cellX + cellSize &&
            y >= cellY && y <= cellY + cellSize) {
          this.pet.currentRoom = style.id;
          this.closeMenu();
          console.log(`[UI] Changed room to ${style.name}`);
        }
      });
    }
    // Settings se maneja al inicio de handleClick()
  }

  // Mostrar feedback temporal
  showFeedback(type: string) {
    this.feedbackType = type;
    this.feedbackStartTime = Date.now();
  }

  // Actualizar feedback (llamar en cada frame)
  private updateFeedback() {
    if (this.feedbackType) {
      const elapsed = Date.now() - this.feedbackStartTime;
      if (elapsed >= this.FEEDBACK_DURATION) {
        this.feedbackType = null;
      }
    }
  }

  // Actualizar animación del menú
  private updateMenuAnimation() {
    if (this.currentMenu) {
      const elapsed = Date.now() - this.menuAnimationStartTime;
      const progress = Math.min(elapsed / this.MENU_ANIMATION_DURATION, 1);

      if (this.isMenuClosing) {
        // Animación de cierre: de 1 a 0
        this.menuAnimationProgress = 1 - progress;

        // Cuando termine la animación de cierre, cerrar definitivamente
        if (progress >= 1) {
          this.currentMenu = null;
          this.menuAnimationProgress = 0;
          this.isMenuClosing = false;
        }
      } else {
        // Animación de apertura: de 0 a 1
        this.menuAnimationProgress = progress;
      }
    }
  }

  render() {
    // Actualizar feedback timer
    this.updateFeedback();

    // Actualizar animación del menú
    this.updateMenuAnimation();

    // Si hay un minijuego activo, SOLO renderizar el minijuego (oculta el main room)
    if (this.activeMinigame) {
      const minigame = this.activeMinigame; // Guardar referencia antes de update

      // Update minigame logic
      if ('update' in minigame) {
        (minigame as any).update(1/60); // Aproximadamente 60 FPS
      }

      // Verificar que el minigame sigue activo después del update
      if (this.activeMinigame) {
        this.activeMinigame.render();
      }
      return; // No renderizar nada más
    }

    // Si está durmiendo, mostrar pantalla de sleep
    if (this.settings.sleep.isSleeping) {
      this.renderSleepScreen();
      return; // No renderizar nada más
    }

    // Renderizar interfaz principal (main room)
    // Renderizar fondo de room
    this.renderRoom();

    // Renderizar pet
    this.renderPet();

    // Renderizar indicadores de necesidades
    this.renderNeedsIndicators();

    // Renderizar barra de crecimiento
    this.renderGrowthBar();

    // Renderizar botones de acción
    this.renderActionButtons();

    // Renderizar debug panel
    this.renderDebugPanel();

    // Renderizar botón de settings DESPUÉS del debug (para que esté encima)
    this.renderSettingsButton();

    // Renderizar botón mimir (solo en modo manual)
    this.renderMimirButton();

    // Renderizar estados
    this.renderStateIndicators();

    // Renderizar caca si existe (solo si NO está muerto)
    if (this.pet.poop.hasPoopedNow() && this.pet.stage !== LifeStage.Dead) {
      this.renderPoop();
    }

    // Renderizar feedback si existe
    if (this.feedbackType) {
      this.renderFeedback();
    }

    // Renderizar menú desplegable si está activo
    if (this.currentMenu) {
      this.renderMenuPanel();
    }

    // Renderizar recompensas flotantes SOBRE el main room (si se están mostrando)
    if (this.showingRewards && this.minigameRewards) {
      this.minigameRewards.render();
    }

    // Renderizar recompensas de alimentación SOBRE el main room (si se están mostrando)
    if (this.showingFeedingRewards) {
      this.feedingRewards.render();
    }

    // Los popups de settings ahora se renderizan dentro de SettingsUI
  }

  renderRoom() {
    this.ctx.save();

    // Limpiar canvas completamente
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Determinar qué sprite cargar (style1 usa 'default')
    const spriteKey = this.pet.currentRoom === 'style1' ? 'default' : this.pet.currentRoom;
    const roomSprite = this.roomCache.get(spriteKey);

    if (roomSprite && roomSprite.complete && roomSprite.naturalHeight > 0) {
      // Fondo blanco primero
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Renderizar room manteniendo aspect ratio (modo "contain")
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      // Calcular dimensiones para que quepa en el canvas manteniendo aspect ratio
      const canvasAspect = this.canvas.width / this.canvas.height;
      const imageAspect = roomSprite.naturalWidth / roomSprite.naturalHeight;

      let renderWidth, renderHeight, offsetX, offsetY;

      if (imageAspect > canvasAspect) {
        // Imagen más ancha: ajustar por ancho del canvas
        renderWidth = this.canvas.width;
        renderHeight = renderWidth / imageAspect;
        offsetX = 0;
        offsetY = (this.canvas.height - renderHeight) / 2;
      } else {
        // Imagen más alta: ajustar por alto del canvas
        renderHeight = this.canvas.height;
        renderWidth = renderHeight * imageAspect;
        offsetX = (this.canvas.width - renderWidth) / 2;
        offsetY = 0;
      }

      // Subir la imagen 50px para que no choque con la barra de progreso
      offsetY -= 50;

      this.ctx.drawImage(roomSprite, offsetX, offsetY, renderWidth, renderHeight);
    } else {
      // Fallback a fondo blanco si no carga
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.restore();
  }

  renderRoomSelector() {
    // Fondo oscuro semi-transparente
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Panel central
    const panelX = 40;
    const panelY = 100;
    const panelWidth = 400;
    const panelHeight = 400;

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Título
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Selecciona Decoración', panelX + 20, panelY + 30);

    // Botón cerrar
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText('X', panelX + panelWidth - 40, panelY + 30);

    // Listar rooms disponibles
    const rooms = [
      { id: 'style1', name: 'Estilo 1 (Básico)' },
      { id: 'anxious', name: 'Anxious Room' },
      { id: 'edgy', name: 'Edgy Room' },
      { id: 'geek', name: 'Geek Room' },
      { id: 'intelectual', name: 'Intelectual Room' },
      { id: 'sassy', name: 'Sassy Room' },
    ];
    const startY = panelY + 50;
    const itemHeight = 50;

    this.ctx.font = '14px Arial';
    rooms.forEach((room, index) => {
      const itemY = startY + index * itemHeight;

      // Fondo del item (invertido si está seleccionado)
      if (room.id === this.pet.currentRoom) {
        this.ctx.fillStyle = '#000';
      } else {
        this.ctx.fillStyle = '#fff';
      }
      this.ctx.fillRect(panelX + 20, itemY, panelWidth - 40, itemHeight - 5);

      // Texto de la room
      this.ctx.fillStyle = room.id === this.pet.currentRoom ? '#fff' : '#000';
      this.ctx.fillText(room.name, panelX + 30, itemY + 25);

      // Borde
      this.ctx.strokeStyle = '#000';
      this.ctx.strokeRect(panelX + 20, itemY, panelWidth - 40, itemHeight - 5);
    });
  }

  renderIngredientSelector() {
    // Fondo oscuro semi-transparente
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Panel central
    const panelX = 40;
    const panelY = 100;
    const panelWidth = 400;
    const panelHeight = 400;

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Título
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Selecciona Ingrediente', panelX + 20, panelY + 30);

    // Botón cerrar
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText('X', panelX + panelWidth - 40, panelY + 30);

    // Listar ingredientes del inventario
    const inventory = this.pet.inventory.getAll();
    const startY = panelY + 50;
    const itemHeight = 50;

    this.ctx.font = '14px Arial';
    inventory.forEach((item, index) => {
      const itemY = startY + index * itemHeight;

      // Fondo del item: blanco
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(panelX + 20, itemY, panelWidth - 40, itemHeight - 5);

      // Texto del ingrediente
      this.ctx.fillStyle = '#000';
      const tierStars = '⭐'.repeat(item.ingredient.tier);
      this.ctx.fillText(
        `${item.ingredient.name} ${tierStars}`,
        panelX + 30,
        itemY + 20
      );

      // Cantidad
      this.ctx.fillStyle = '#000';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(
        `x${item.quantity} | ${item.ingredient.personality}`,
        panelX + 30,
        itemY + 38
      );
      this.ctx.font = '14px Arial';

      // Borde
      this.ctx.strokeStyle = '#000';
      this.ctx.strokeRect(panelX + 20, itemY, panelWidth - 40, itemHeight - 5);
    });

    // Mensaje si no hay ingredientes
    if (inventory.length === 0) {
      this.ctx.fillStyle = '#000';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('No hay ingredientes disponibles', this.canvas.width / 2, panelY + 200);
      this.ctx.fillText('¡Juega minijuegos para conseguir!', this.canvas.width / 2, panelY + 230);
    }
  }

  renderPet() {
    this.ctx.save();

    // Centro del canvas
    const centerX = this.canvas.width / 2;
    const centerY = 300;

    // Try to get sprite
    const sprite = this.getSpriteForPet();

    if (sprite && sprite.complete && sprite.naturalHeight > 0) {
      // Render sprite manteniendo aspect ratio
      const maxSize = 200; // Tamaño máximo (width o height)
      const aspectRatio = sprite.naturalWidth / sprite.naturalHeight;

      let renderWidth, renderHeight;
      if (aspectRatio > 1) {
        // Más ancho que alto
        renderWidth = maxSize;
        renderHeight = maxSize / aspectRatio;
      } else {
        // Más alto que ancho, o cuadrado
        renderHeight = maxSize;
        renderWidth = maxSize * aspectRatio;
      }

      this.ctx.drawImage(
        sprite,
        centerX - renderWidth / 2,
        centerY - renderHeight / 2,
        renderWidth,
        renderHeight
      );
    } else {
      // Fallback to emojis
      this.ctx.font = '80px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const stageEmojis = {
        [LifeStage.Egg]: '🥚',
        [LifeStage.Baby]: '🐣',
        [LifeStage.Child]: '🐥',
        [LifeStage.Young]: '🦆',
        [LifeStage.Adult]: '🦢',
        [LifeStage.ReadyToAscend]: '✨',
        [LifeStage.Dead]: '💀',
      };

      this.ctx.fillText(stageEmojis[this.pet.stage], centerX, centerY);
    }

    this.ctx.restore();
  }

  renderNeedsIndicators() {
    // No mostrar necesidades si es Egg (el huevo no tiene hambre ni aburrimiento)
    if (this.pet.stage === LifeStage.Egg) return;

    this.ctx.save();

    const x = 20;
    const startY = 20;
    let y = startY;

    // Calcular altura del panel
    let panelHeight = 70; // Hambre + Diversión + Recuerdos
    if (this.pet.personality) panelHeight += 25;
    const memoryCount = this.pet.memorySystem.getMemoryCount();
    if (memoryCount > 0) {
      panelHeight += 20 + (this.pet.memorySystem.getMemoryDistribution().size * 18);
    }

    // Renderizar panel blanco semi-transparente
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.fillRect(x - 5, startY - 15, 250, panelHeight);
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 5, startY - 15, 250, panelHeight);

    // Reset text properties
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';

    // Hambre
    this.ctx.font = '14px Arial';
    this.ctx.fillStyle = '#000';
    const hungerStars = Math.ceil(this.pet.hunger.getStars());
    this.ctx.fillText(`Hambre: ${'⭐'.repeat(hungerStars)}${'☆'.repeat(3 - hungerStars)}`, x, y);
    y += 25;

    // Aburrimiento
    const boringStars = Math.ceil(this.pet.boring.getStars());
    this.ctx.fillText(`Diversión: ${'⭐'.repeat(boringStars)}${'☆'.repeat(3 - boringStars)}`, x, y);
    y += 25;

    // Personalidad
    if (this.pet.personality) {
      this.ctx.fillText(`Personalidad: ${this.pet.personality.name}`, x, y);
      y += 25;
    }

    // Recuerdos
    this.ctx.fillText(`Recuerdos: ${memoryCount}`, x, y);
    y += 20;

    // Mostrar distribución de recuerdos
    if (memoryCount > 0) {
      this.ctx.font = '12px Arial';
      this.ctx.fillStyle = '#000';
      const distribution = this.pet.memorySystem.getMemoryDistribution();
      distribution.forEach((percentage, personality) => {
        this.ctx.fillText(`  ${personality}: ${percentage.toFixed(0)}%`, x, y);
        y += 18;
      });
    }

    this.ctx.restore();
  }

  renderGrowthBar() {
    if (this.pet.stage === LifeStage.Egg || this.pet.stage >= LifeStage.ReadyToAscend) return;

    const barX = 40;
    const barY = 520;
    const barWidth = 360; // Reducido para dejar espacio al hexágono
    const barHeight = 24;
    const radius = barHeight / 2; // Radio para bordes redondeados

    // Barra con bordes redondeados (cápsula)
    this.ctx.save();

    // Nombre de la criatura encima de la barra
    const centerX = this.canvas.width / 2;
    const nameY = barY - 10; // 10px encima de la barra

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';

    // Nombre de etapa + personalidad en una línea
    const stageNames = ['Huevo', 'Bebé', 'Niño', 'Joven', 'Adulto', 'Ascensión', 'Muerto'];
    let fullName = stageNames[this.pet.stage];

    if (this.pet.personality) {
      fullName += ` ${this.pet.personality.name}`;
    }

    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(fullName, centerX, nameY);

    // Fondo blanco con bordes redondeados
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.moveTo(barX + radius, barY);
    this.ctx.lineTo(barX + barWidth - radius, barY);
    this.ctx.arc(barX + barWidth - radius, barY + radius, radius, -Math.PI/2, Math.PI/2);
    this.ctx.lineTo(barX + radius, barY + barHeight);
    this.ctx.arc(barX + radius, barY + radius, radius, Math.PI/2, -Math.PI/2);
    this.ctx.closePath();
    this.ctx.fill();

    // Progreso en negro (clipeado para respetar bordes redondeados)
    const progress = this.pet.getGrowthProgress();
    if (progress > 0) {
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.moveTo(barX + radius, barY);
      const progressWidth = barWidth * progress;
      if (progressWidth < radius * 2) {
        // Si el progreso es muy pequeño, solo dibujar el círculo izquierdo parcial
        this.ctx.arc(barX + radius, barY + radius, radius, -Math.PI/2, Math.PI/2);
      } else if (progressWidth >= barWidth - radius) {
        // Progreso completo o casi completo
        this.ctx.lineTo(barX + barWidth - radius, barY);
        this.ctx.arc(barX + barWidth - radius, barY + radius, radius, -Math.PI/2, Math.PI/2);
        this.ctx.lineTo(barX + radius, barY + barHeight);
      } else {
        // Progreso parcial
        this.ctx.lineTo(barX + progressWidth, barY);
        this.ctx.lineTo(barX + progressWidth, barY + barHeight);
        this.ctx.lineTo(barX + radius, barY + barHeight);
      }
      this.ctx.arc(barX + radius, barY + radius, radius, Math.PI/2, -Math.PI/2);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Borde negro de la barra
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(barX + radius, barY);
    this.ctx.lineTo(barX + barWidth - radius, barY);
    this.ctx.arc(barX + barWidth - radius, barY + radius, radius, -Math.PI/2, Math.PI/2);
    this.ctx.lineTo(barX + radius, barY + barHeight);
    this.ctx.arc(barX + radius, barY + radius, radius, Math.PI/2, -Math.PI/2);
    this.ctx.closePath();
    this.ctx.stroke();

    // Hexágono para el multiplicador
    const hexX = barX + barWidth + 10;
    const hexY = barY + barHeight / 2;
    const hexRadius = 22;

    // Dibujar hexágono
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = hexX + hexRadius * Math.cos(angle);
      const y = hexY + hexRadius * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    // Borde del hexágono
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Texto del multiplicador dentro del hexágono
    const multiplier = this.pet.getGrowthMultiplier();
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`x${multiplier.toFixed(1)}`, hexX, hexY);

    this.ctx.restore();
  }

  renderActionButtons() {
    // No mostrar botones de acción si es Egg (el huevo no puede comer, jugar, etc.)
    if (this.pet.stage === LifeStage.Egg) return;

    const y = 560;
    const buttonWidth = 160; // 3 botones: 480px / 3 = 160px
    const buttonHeight = 60;

    const buttons = [
      { id: 'feed' as const, label: '🍙', name: 'Alimentar' },
      { id: 'play' as const, label: '🎮', name: 'Jugar' },
      { id: 'room' as const, label: '🏠', name: 'Decoración' },
    ];

    buttons.forEach((button, index) => {
      const x = index * buttonWidth;

      // Determinar si este botón está activo
      const isActive = this.currentMenu === button.id;

      // Si NO hay menú abierto: todos blancos
      // Si hay menú: el activo blanco, resto negro
      const shouldBeWhite = !this.currentMenu || isActive;

      // Fondo
      this.ctx.fillStyle = shouldBeWhite ? '#fff' : '#000';
      this.ctx.fillRect(x, y, buttonWidth, buttonHeight);

      // Icono
      this.ctx.font = '30px Arial';
      this.ctx.textAlign = 'center';

      // Si el fondo es negro, añadir un círculo blanco detrás del emoji
      if (!shouldBeWhite) {
        const centerX = x + buttonWidth / 2;
        const centerY = y + 30;
        const radius = 22;

        // Círculo blanco de fondo
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Emoji en negro sobre el círculo blanco
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(button.label, centerX, y + 35);
      } else {
        // Fondo blanco: emoji en negro normal
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(button.label, x + buttonWidth / 2, y + 35);
      }

      // Borde del botón
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
    });
  }

  renderSettingsButton() {
    // Botón Settings (arriba a la derecha)
    const settingsButton = this.settingsCache.get('SettingsOpenButton.png');
    const settingsX = this.canvas.width - 70;
    const settingsY = 20;
    const settingsSize = 50;

    if (settingsButton && settingsButton.complete) {
      this.ctx.drawImage(settingsButton, settingsX, settingsY, settingsSize, settingsSize);
    } else {
      // Fallback: círculo con emoji
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(settingsX + settingsSize / 2, settingsY + settingsSize / 2, settingsSize / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.font = '30px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('⚙️', settingsX + settingsSize / 2, settingsY + settingsSize / 2 + 10);
    }
  }

  renderMimirButton() {
    // Botón Mimir (solo en modo manual cuando está despierto)
    if (this.settings.sleep.isManual && !this.settings.sleep.isSleeping) {
      const mimirButton = this.settingsCache.get('Boton mimir.png');

      // Posición izquierda, más arriba (~35% desde el tope)
      const mimirX = 15;
      const mimirY = this.canvas.height * 0.35;

      if (mimirButton && mimirButton.complete) {
        // Mantener aspect ratio
        const spriteAspect = mimirButton.width / mimirButton.height;
        const targetHeight = 55;
        const targetWidth = targetHeight * spriteAspect;

        this.ctx.drawImage(mimirButton, mimirX, mimirY, targetWidth, targetHeight);
      } else {
        // Fallback
        const mimirSize = 55;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(mimirX, mimirY, mimirSize, mimirSize);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(mimirX, mimirY, mimirSize, mimirSize);
        this.ctx.font = '35px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('😴', mimirX + mimirSize / 2, mimirY + mimirSize / 2 + 12);
      }
    }
  }

  renderDebugPanel() {
    this.ctx.save();

    const x = this.canvas.width - 180;
    const startY = 20;
    let y = startY;

    // Calcular altura del panel
    let panelHeight = 80; // Base (sin inventario)

    // Renderizar panel blanco semi-transparente
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.fillRect(x - 5, startY - 15, 175, panelHeight);
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 5, startY - 15, 175, panelHeight);

    this.ctx.font = '11px monospace';
    this.ctx.fillStyle = '#000';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';

    this.ctx.fillText(`Time: ${this.timeMultiplier}x`, x, y);
    y += 15;
    this.ctx.fillText(`Growth: ${(this.pet.getGrowthProgress() * 100).toFixed(1)}%`, x, y);
    y += 15;
    this.ctx.fillText(`Mult: x${this.pet.getGrowthMultiplier()}`, x, y);
    y += 15;

    // Estado de descuido
    if (this.pet.wasNeglected) {
      this.ctx.fillStyle = '#000';
      this.ctx.fillText(`⚠️ NEGLECTED`, x, y);
    }

    this.ctx.restore();
  }

  renderStateIndicators() {
    // No mostrar indicadores si es Egg o está muerto
    if (this.pet.stage === LifeStage.Egg || this.pet.stage === LifeStage.Dead) return;

    // Indicadores de estado sobre la mascota
    const x = 350;
    let y = 250;

    this.ctx.font = '24px Arial';

    if (this.pet.hunger.isHungry()) {
      this.ctx.fillText('😋', x, y);
      y += 30;
    }

    if (this.pet.boring.isBored()) {
      this.ctx.fillText('😴', x, y);
      y += 30;
    }

    if (this.pet.illness.isCurrentlyIll()) {
      this.ctx.fillText('🤒', x, y);
      y += 30;
    }
  }

  renderPoop() {
    this.ctx.font = '40px Arial';
    this.ctx.fillText('💩', 350, 350);
  }

  renderFeedback() {
    if (!this.feedbackType) return;

    this.ctx.save();

    // Posición sobre la mascota (más a la izquierda)
    const bubbleX = 40;
    const bubbleY = 120;
    const bubbleWidth = 140;
    const bubbleHeight = 70;

    // Animación de bounce (primer medio segundo)
    const elapsed = Date.now() - this.feedbackStartTime;
    let scale = 1.0;
    if (elapsed < 500) {
      // Efecto de bounce: 0 -> 1.2 -> 1.0
      const t = elapsed / 500;
      scale = t < 0.5 ? 1.2 * (t * 2) : 1.2 - 0.2 * ((t - 0.5) * 2);
    }

    // Fade out en el último medio segundo
    let alpha = 1.0;
    if (elapsed > this.FEEDBACK_DURATION - 500) {
      alpha = (this.FEEDBACK_DURATION - elapsed) / 500;
    }

    this.ctx.globalAlpha = alpha;
    this.ctx.translate(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(bubbleX + bubbleWidth / 2), -(bubbleY + bubbleHeight / 2));

    // Dibujar globo de diálogo (speech bubble)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;

    // Globo principal (rectángulo redondeado)
    this.ctx.beginPath();
    const radius = 15;
    this.ctx.moveTo(bubbleX + radius, bubbleY);
    this.ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    this.ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
    this.ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    this.ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    this.ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    this.ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
    this.ctx.lineTo(bubbleX, bubbleY + radius);
    this.ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Cola del globo (triángulo apuntando a la mascota)
    this.ctx.beginPath();
    this.ctx.moveTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight);
    this.ctx.lineTo(bubbleX + bubbleWidth / 2 + 50, bubbleY + bubbleHeight + 30);
    this.ctx.lineTo(bubbleX + bubbleWidth / 2 + 20, bubbleY + bubbleHeight);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Contenido del feedback según tipo
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (this.feedbackType === 'refuse_food') {
      // Icono de rechazo (X grande) - negro
      this.ctx.font = 'bold 35px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('✖', bubbleX + 35, bubbleY + bubbleHeight / 2);

      // Texto
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('¡Estoy', bubbleX + 95, bubbleY + 23);
      this.ctx.fillText('lleno!', bubbleX + 95, bubbleY + 47);
    } else if (this.feedbackType === 'refuse_food_sick') {
      // Icono de enfermo - negro
      this.ctx.font = 'bold 35px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('🤒', bubbleX + 35, bubbleY + bubbleHeight / 2);

      // Texto
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('¡Estoy', bubbleX + 95, bubbleY + 23);
      this.ctx.fillText('enfermo!', bubbleX + 95, bubbleY + 47);
    } else if (this.feedbackType === 'refuse_play_sick') {
      // Icono de enfermo - negro
      this.ctx.font = 'bold 35px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('🤒', bubbleX + 35, bubbleY + bubbleHeight / 2);

      // Texto
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('¡Estoy', bubbleX + 95, bubbleY + 23);
      this.ctx.fillText('enfermo!', bubbleX + 95, bubbleY + 47);
    } else if (this.feedbackType === 'refuse_play_hungry') {
      // Icono de hambre - negro
      this.ctx.font = 'bold 35px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('😋', bubbleX + 35, bubbleY + bubbleHeight / 2);

      // Texto
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('¡Tengo', bubbleX + 95, bubbleY + 23);
      this.ctx.fillText('hambre!', bubbleX + 95, bubbleY + 47);
    } else if (this.feedbackType === 'wake_auto_warning') {
      // Icono de sueño - negro
      this.ctx.font = 'bold 30px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('😴', bubbleX + 30, bubbleY + bubbleHeight / 2);

      // Texto (3 líneas para que quepa)
      this.ctx.font = 'bold 13px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('Me iré a', bubbleX + 95, bubbleY + 18);
      this.ctx.fillText('mimir si no', bubbleX + 95, bubbleY + 35);
      this.ctx.fillText('me haces caso', bubbleX + 95, bubbleY + 52);
    }

    this.ctx.restore();
  }

  renderMenuPanel() {
    if (!this.currentMenu) return;

    this.ctx.save();

    // Settings tiene panel más grande sin tabs
    const isSettings = this.currentMenu === 'settings';
    const panelHeight = isSettings ? 500 : 310; // Settings: panel grande, otros: pequeño
    const tabHeight = isSettings ? 0 : 50; // Settings: sin tabs
    const panelY = this.canvas.height - panelHeight * this.menuAnimationProgress;
    const tabsY = panelY - tabHeight;

    // Overlay oscuro al 50%
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, tabsY);

    // Tabs solo para feed/play/room (settings NO tiene tabs)
    if (!isSettings) {
      const tabs = [
        { id: 'feed' as const, icon: '🍙', label: 'Alimentar' },
        { id: 'play' as const, icon: '🎮', label: 'Jugar' },
        { id: 'room' as const, icon: '🏠', label: 'Decoración' }
      ];

      const tabWidth = this.canvas.width / tabs.length;

      tabs.forEach((tab, index) => {
      const tabX = index * tabWidth;
      const isActive = tab.id === this.currentMenu;

      // Fondo de la pestaña (efecto carpeta)
      if (isActive) {
        // Pestaña activa: fondo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.moveTo(tabX + 5, tabsY + tabHeight);
        this.ctx.lineTo(tabX + 5, tabsY + 10);
        this.ctx.quadraticCurveTo(tabX + 5, tabsY, tabX + 15, tabsY);
        this.ctx.lineTo(tabX + tabWidth - 15, tabsY);
        this.ctx.quadraticCurveTo(tabX + tabWidth - 5, tabsY, tabX + tabWidth - 5, tabsY + 10);
        this.ctx.lineTo(tabX + tabWidth - 5, tabsY + tabHeight);
        this.ctx.fill();

        // Borde negro
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(tabX + 5, tabsY + tabHeight);
        this.ctx.lineTo(tabX + 5, tabsY + 10);
        this.ctx.quadraticCurveTo(tabX + 5, tabsY, tabX + 15, tabsY);
        this.ctx.lineTo(tabX + tabWidth - 15, tabsY);
        this.ctx.quadraticCurveTo(tabX + tabWidth - 5, tabsY, tabX + tabWidth - 5, tabsY + 10);
        this.ctx.lineTo(tabX + tabWidth - 5, tabsY + tabHeight);
        this.ctx.stroke();
      } else {
        // Pestaña inactiva: fondo negro
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(tabX + 5, tabsY + 5, tabWidth - 10, tabHeight - 5);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(tabX + 5, tabsY + 5, tabWidth - 10, tabHeight - 5);
      }

      // Icono y texto
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';

      const centerX = tabX + tabWidth / 2;
      const iconY = tabsY + (isActive ? 22 : 27);

      // Si está inactivo (fondo negro), añadir círculo blanco detrás
      if (!isActive) {
        const centerY = tabsY + 20;
        const radius = 16;

        // Círculo blanco de fondo
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Emoji en negro sobre círculo blanco
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(tab.icon, centerX, iconY);
      } else {
        // Pestaña activa: emoji negro normal
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(tab.icon, centerX, iconY);
      }

        // Texto del label
        this.ctx.fillStyle = isActive ? '#000' : '#fff';
        this.ctx.font = '11px Arial';
        this.ctx.fillText(tab.label, centerX, tabsY + (isActive ? 40 : 45));
      });
    } // Fin de if (!isSettings)

    // Panel blanco desplegable
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, panelY, this.canvas.width, panelHeight);

    // Borde superior del panel
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, panelY);
    this.ctx.lineTo(this.canvas.width, panelY);
    this.ctx.stroke();

    // Contenido del panel según el menú
    const contentStartY = panelY;

    if (this.currentMenu === 'feed') {
      this.renderFeedContent(contentStartY + 10);
    } else if (this.currentMenu === 'play') {
      this.renderPlayContent(contentStartY + 10);
    } else if (this.currentMenu === 'room') {
      this.renderRoomContent(contentStartY + 10);
    } else if (this.currentMenu === 'settings') {
      this.renderSettingsContent(contentStartY, panelHeight);
    }

    this.ctx.restore();
  }

  renderSettingsContent(panelY: number, panelHeight: number) {
    // Header negro "CONFIGURACIONES" pegado a la parte superior del panel
    const headerHeight = 50;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, panelY, this.canvas.width, headerHeight);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CONFIGURACIONES', this.canvas.width / 2, panelY + headerHeight / 2 + 7);

    // Contenido scrolleable (delegado a SettingsUI)
    const closeBarHeight = 40;
    const contentX = 15;
    const contentY = panelY + headerHeight + 15;
    const contentW = this.canvas.width - 30;
    const availableHeight = panelHeight - headerHeight - closeBarHeight - 15;

    // Informar a SettingsUI de los bounds del panel para click handling
    this.settingsUI.setPanelBounds(0, panelY, this.canvas.width, panelHeight);

    // Calcular altura total del contenido para determinar scroll máximo
    const totalContentHeight = this.settingsUI.calculateContentHeight(contentW);
    this.settingsMaxScroll = Math.max(0, totalContentHeight - availableHeight);

    // Clamp scroll offset
    this.settingsScrollOffset = Math.max(0, Math.min(this.settingsScrollOffset, this.settingsMaxScroll));

    // Renderizar contenido con scroll offset
    this.settingsUI.renderContent(contentX, contentY, contentW, availableHeight, this.settingsScrollOffset);

    // Botón de volver (flecha sprite) en la parte inferior (FUERA del clipping, siempre visible)
    const closeBarY = panelY + panelHeight - closeBarHeight;

    // Borde negro alrededor de toda la barra horizontal
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, closeBarY, this.canvas.width, closeBarHeight);

    // Cargar sprite de la flecha
    const backSprite = this.settingsUI.getSprite('Back.png');
    if (backSprite && backSprite.complete) {
      // Mantener aspect ratio
      const spriteAspect = backSprite.width / backSprite.height;
      const targetHeight = 35; // Altura deseada
      const targetWidth = targetHeight * spriteAspect;

      const arrowX = (this.canvas.width - targetWidth) / 2;
      const arrowY = closeBarY + (closeBarHeight - targetHeight) / 2;

      this.ctx.drawImage(backSprite, arrowX, arrowY, targetWidth, targetHeight);
    } else {
      // Fallback: emoji
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 30px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('←', this.canvas.width / 2, closeBarY + closeBarHeight / 2);
    }
  }

  // ============ SETTINGS PANEL (diseño Figma) ============

  renderSettingsPanel() {
    // Delegar todo el rendering a SettingsUI
    this.settingsUI.render();
  }

  renderFeedContent(startY: number) {
    const inventory = this.pet.inventory.getAll();

    // Panel superior: Preview del mochi (más compacto)
    const previewHeight = 90;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(10, startY, this.canvas.width - 20, previewHeight);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(10, startY, this.canvas.width - 20, previewHeight);

    // Imagen del mochi (izquierda)
    const mochiSize = 70;
    const mochiX = 20;
    const mochiY = startY + 10;

    // Determinar qué mochi mostrar según ingrediente seleccionado
    let mochiPersonality = 'neutral';
    let mochiStars = 1;

    if (this.selectedIngredient) {
      if (this.selectedIngredient === 'neutral') {
        // Ingrediente neutral por defecto
        mochiPersonality = 'neutral';
        mochiStars = 1;
      } else {
        // Ingrediente del inventario
        const selectedItem = inventory.find(inv => inv.ingredient.identifier === this.selectedIngredient);
        if (selectedItem) {
          mochiPersonality = selectedItem.ingredient.personality.toLowerCase();
          mochiStars = selectedItem.ingredient.tier;
        }
      }
    }

    // Dibujar imagen del mochi (respetando aspect ratio)
    const mochiImg = this.mochiCache.get(mochiPersonality);
    if (mochiImg && mochiImg.complete && mochiImg.naturalHeight > 0) {
      // Calcular dimensiones manteniendo aspect ratio (modo "contain")
      const imageAspect = mochiImg.naturalWidth / mochiImg.naturalHeight;
      let renderWidth, renderHeight, offsetX, offsetY;

      if (imageAspect > 1) {
        // Imagen más ancha: ajustar por ancho
        renderWidth = mochiSize;
        renderHeight = mochiSize / imageAspect;
        offsetX = mochiX;
        offsetY = mochiY + (mochiSize - renderHeight) / 2;
      } else {
        // Imagen más alta o cuadrada: ajustar por altura
        renderHeight = mochiSize;
        renderWidth = mochiSize * imageAspect;
        offsetX = mochiX + (mochiSize - renderWidth) / 2;
        offsetY = mochiY;
      }

      this.ctx.drawImage(mochiImg, offsetX, offsetY, renderWidth, renderHeight);
    } else {
      // Fallback: cuadrado blanco con emoji
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(mochiX, mochiY, mochiSize, mochiSize);
      this.ctx.font = '50px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🍙', mochiX + mochiSize / 2, mochiY + mochiSize / 2);
    }

    // Info del mochi (derecha)
    const infoX = mochiX + mochiSize + 15;
    const infoY = startY + 15;

    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';

    // Nombre
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText(`Mochi ${mochiPersonality.charAt(0).toUpperCase() + mochiPersonality.slice(1)}`, infoX, infoY);

    // Estrellas de hambre
    this.ctx.font = '13px Arial';
    this.ctx.fillStyle = '#000';
    this.ctx.fillText('Hambre:', infoX, infoY + 25);
    this.ctx.fillText('⭐'.repeat(mochiStars) + '☆'.repeat(3 - mochiStars), infoX + 55, infoY + 25);

    // Personalidad
    this.ctx.fillText(`Personalidad: ${mochiPersonality}`, infoX, infoY + 45);

    // Botón "Cocinar"
    const cookButtonX = this.canvas.width - 100;
    const cookButtonY = startY + 50;
    const cookButtonW = 80;
    const cookButtonH = 30;

    // Botón habilitado = negro, deshabilitado = blanco con borde
    if (this.selectedIngredient) {
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(cookButtonX, cookButtonY, cookButtonW, cookButtonH);
      this.ctx.fillStyle = '#fff';
    } else {
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(cookButtonX, cookButtonY, cookButtonW, cookButtonH);
      this.ctx.fillStyle = '#000';
    }

    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Cocinar', cookButtonX + cookButtonW / 2, cookButtonY + 22);

    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(cookButtonX, cookButtonY, cookButtonW, cookButtonH);

    // Grid de ingredientes con scroll horizontal (2 filas)
    const titleY = startY + previewHeight + 15;
    const gridStartY = titleY + 15; // +15 para el título
    const cellSize = 70;
    const cellGap = 10;
    const separatorWidth = 2;
    const separatorGap = 10;
    const rows = 2;

    // Organizar ingredientes por tier
    const neutral = { ingredient: { identifier: 'neutral', tier: 0, personality: 'neutral', name: 'Neutral' }, quantity: Infinity };
    const tier1Items = inventory.filter(i => i.ingredient.tier === 1);
    const tier2Items = inventory.filter(i => i.ingredient.tier === 2);
    const tier3Items = inventory.filter(i => i.ingredient.tier === 3);

    // Calcular ancho total necesario
    const tier1Cols = Math.ceil((tier1Items.length + 1) / rows); // +1 por neutral
    const tier2Cols = Math.ceil(tier2Items.length / rows);
    const tier3Cols = Math.ceil(tier3Items.length / rows);

    const tier1Width = tier1Cols * (cellSize + cellGap);
    const tier2Width = tier2Cols > 0 ? tier2Cols * (cellSize + cellGap) : 0;
    const tier3Width = tier3Cols > 0 ? tier3Cols * (cellSize + cellGap) : 0;
    const separators = (tier2Cols > 0 ? 1 : 0) + (tier3Cols > 0 ? 1 : 0);
    const totalWidth = tier1Width + tier2Width + tier3Width + (separators * (separatorGap * 2 + separatorWidth));

    // Limitar scroll
    const maxScroll = Math.max(0, totalWidth - (this.canvas.width - 20));
    this.ingredientScrollX = Math.max(0, Math.min(this.ingredientScrollX, maxScroll));

    // Función helper para renderizar un ingrediente
    const renderIngredient = (item: any, x: number, row: number) => {
      const cellX = x;
      const cellY = gridStartY + row * (cellSize + cellGap);
      const isSelected = this.selectedIngredient === item.ingredient.identifier;

      // Fondo
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(cellX, cellY, cellSize, cellSize);

      // Borde
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = isSelected ? 3 : 1;
      this.ctx.strokeRect(cellX, cellY, cellSize, cellSize);

      if (isSelected) {
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);
      }

      // Imagen
      const imgSize = 45;
      const imgX = cellX + (cellSize - imgSize) / 2;
      const imgY = cellY + 5;

      const ingredientKey = item.ingredient.tier === 0 ? 'none' : `${item.ingredient.personality.toLowerCase()}_${item.ingredient.tier}`;
      const ingredientImg = this.ingredientCache.get(ingredientKey);

      if (ingredientImg && ingredientImg.complete && ingredientImg.naturalHeight > 0) {
        this.ctx.drawImage(ingredientImg, imgX, imgY, imgSize, imgSize);
      } else {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(imgX, imgY, imgSize, imgSize);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(imgX, imgY, imgSize, imgSize);
      }

      // Icono de personalidad (abajo izquierda) - excepto neutral
      if (item.ingredient.tier > 0) {
        const personalityKey = item.ingredient.personality.toLowerCase();
        const personalityIcon = this.personalityIconCache.get(personalityKey);
        const iconSize = 16;
        const iconX = cellX + 3;
        const iconY = cellY + cellSize - iconSize - 3;

        if (personalityIcon && personalityIcon.complete && personalityIcon.naturalHeight > 0) {
          this.ctx.drawImage(personalityIcon, iconX, iconY, iconSize, iconSize);
        }
      }

      // Cantidad (abajo derecha)
      this.ctx.textAlign = 'right';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.fillStyle = '#000';
      if (item.quantity === Infinity) {
        this.ctx.fillText('∞', cellX + cellSize - 3, cellY + cellSize - 3);
      } else {
        this.ctx.fillText(`x${item.quantity}`, cellX + cellSize - 3, cellY + cellSize - 3);
      }
    };

    // Renderizar títulos de secciones (fijos, no afectados por scroll)
    this.ctx.save();
    this.ctx.font = 'bold 11px Arial';
    this.ctx.fillStyle = '#000';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'alphabetic';

    let titleX = 10 - this.ingredientScrollX;

    // Título Tier 1
    const tier1TitleX = titleX + tier1Width / 2;
    if (tier1TitleX > 10 && tier1TitleX < this.canvas.width - 10) {
      this.ctx.fillText('⭐', tier1TitleX, titleY + 10);
    }
    titleX += tier1Width;

    // Título Tier 2
    if (tier2Cols > 0) {
      titleX += separatorGap + separatorWidth + separatorGap;
      const tier2TitleX = titleX + tier2Width / 2;
      if (tier2TitleX > 10 && tier2TitleX < this.canvas.width - 10) {
        this.ctx.fillText('⭐⭐', tier2TitleX, titleY + 10);
      }
      titleX += tier2Width;
    }

    // Título Tier 3
    if (tier3Cols > 0) {
      titleX += separatorGap + separatorWidth + separatorGap;
      const tier3TitleX = titleX + tier3Width / 2;
      if (tier3TitleX > 10 && tier3TitleX < this.canvas.width - 10) {
        this.ctx.fillText('⭐⭐⭐', tier3TitleX, titleY + 10);
      }
    }

    this.ctx.restore();

    // Renderizar con clipping para el área de scroll
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(10, gridStartY, this.canvas.width - 20, rows * (cellSize + cellGap));
    this.ctx.clip();

    let currentX = 10 - this.ingredientScrollX;

    // Tier 1 (neutral + tier 1)
    const allTier1 = [neutral, ...tier1Items];
    allTier1.forEach((item, index) => {
      const col = Math.floor(index / rows);
      const row = index % rows;
      renderIngredient(item, currentX + col * (cellSize + cellGap), row);
    });

    currentX += tier1Width;

    // Separador después de tier 1 (si hay tier 2)
    if (tier2Cols > 0) {
      currentX += separatorGap;
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(currentX, gridStartY, separatorWidth, rows * (cellSize + cellGap) - cellGap);
      currentX += separatorWidth + separatorGap;

      // Tier 2
      tier2Items.forEach((item, index) => {
        const col = Math.floor(index / rows);
        const row = index % rows;
        renderIngredient(item, currentX + col * (cellSize + cellGap), row);
      });

      currentX += tier2Width;
    }

    // Separador después de tier 2 (si hay tier 3)
    if (tier3Cols > 0) {
      currentX += separatorGap;
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(currentX, gridStartY, separatorWidth, rows * (cellSize + cellGap) - cellGap);
      currentX += separatorWidth + separatorGap;

      // Tier 3
      tier3Items.forEach((item, index) => {
        const col = Math.floor(index / rows);
        const row = index % rows;
        renderIngredient(item, currentX + col * (cellSize + cellGap), row);
      });
    }

    this.ctx.restore();
  }


  renderPlayContent(startY: number) {
    // Panel superior: Preview del minijuego seleccionado
    const previewHeight = 120;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(10, startY, this.canvas.width - 20, previewHeight);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(10, startY, this.canvas.width - 20, previewHeight);

    const selectedMinigame = this.minigames.find(m => m.id === this.selectedMinigame);
    if (selectedMinigame) {
      // Icono del minijuego (sprite de personalidad)
      const iconSize = 80;
      const iconX = 20;
      const iconY = startY + 20;

      const personalityKey = selectedMinigame.personality.toLowerCase();
      const personalityIcon = this.personalityIconCache.get(personalityKey);

      if (personalityIcon && personalityIcon.complete && personalityIcon.naturalHeight > 0) {
        this.ctx.drawImage(personalityIcon, iconX, iconY, iconSize, iconSize);
      } else {
        // Fallback: rectángulo blanco
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(iconX, iconY, iconSize, iconSize);
      }

      // Información del minijuego (derecha del icono)
      const infoX = iconX + iconSize + 15;
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#000';

      // Nombre del minijuego
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillText(selectedMinigame.name, infoX, startY + 30);

      // Estrellas de diversión
      this.ctx.font = '14px Arial';
      this.ctx.fillText(`Diversión: ${'⭐'.repeat(selectedMinigame.stars)}`, infoX, startY + 55);

      // Personalidad asociada
      this.ctx.fillText(`Personalidad: ${selectedMinigame.personality}`, infoX, startY + 75);

      // Botón de jugar (abajo derecha del preview)
      const buttonW = 150;
      const buttonH = 40;
      const buttonX = this.canvas.width - buttonW - 20;
      const buttonY = startY + previewHeight - buttonH - 10;

      // Botón: negro con texto blanco
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

      // Texto del botón
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Jugar`, buttonX + buttonW / 2, buttonY + 25);

      // Borde del botón
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);
    }

    // Grid de minijuegos (todos en una línea horizontal)
    const gridStartY = startY + previewHeight + 20;
    const cellSize = 80;
    const cellGap = 10;
    const gridPadding = 10;
    const cols = 5; // Todos en una sola fila

    this.minigames.forEach((minigame, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellX = gridPadding + col * (cellSize + cellGap);
      const cellY = gridStartY + row * (cellSize + cellGap);

      const isSelected = this.selectedMinigame === minigame.id;

      // Fondo de la celda
      this.ctx.fillStyle = isSelected ? '#000' : '#fff';
      this.ctx.fillRect(cellX, cellY, cellSize, cellSize);

      // Borde
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = isSelected ? 3 : 1;
      this.ctx.strokeRect(cellX, cellY, cellSize, cellSize);

      // Segundo borde interior si está seleccionado
      if (isSelected) {
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);
      }

      // Icono de personalidad (centro)
      const iconSize = 50;
      const iconX = cellX + (cellSize - iconSize) / 2;
      const iconY = cellY + 5;

      const personalityKey = minigame.personality.toLowerCase();
      const personalityIcon = this.personalityIconCache.get(personalityKey);

      if (personalityIcon && personalityIcon.complete && personalityIcon.naturalHeight > 0) {
        this.ctx.drawImage(personalityIcon, iconX, iconY, iconSize, iconSize);
      } else {
        // Fallback: rectángulo blanco
        this.ctx.fillStyle = isSelected ? '#000' : '#fff';
        this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
        this.ctx.strokeStyle = isSelected ? '#fff' : '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(iconX, iconY, iconSize, iconSize);
      }

      // Nombre del minijuego (abajo, texto pequeño)
      this.ctx.font = '9px Arial';
      this.ctx.fillStyle = isSelected ? '#fff' : '#000';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(minigame.name, cellX + cellSize / 2, cellY + cellSize - 3);
    });
  }

  renderRoomContent(startY: number) {
    // Grid de estilos de habitación
    const styles = [
      { id: 'style1', name: 'Básico', key: 'default' },
      { id: 'anxious', name: 'Anxious', key: 'anxious' },
      { id: 'edgy', name: 'Edgy', key: 'edgy' },
      { id: 'geek', name: 'Geek', key: 'geek' },
      { id: 'intelectual', name: 'Intelectual', key: 'intelectual' },
      { id: 'sassy', name: 'Sassy', key: 'sassy' },
    ];

    const cellSize = 70;
    const gridPadding = 20;
    const cellGap = 10;
    const cols = 3;
    const gridStartY = startY + 20;

    styles.forEach((style, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellX = gridPadding + col * (cellSize + cellGap);
      const cellY = gridStartY + row * (cellSize + cellGap);

      // Verificar si está seleccionado
      const isSelected = this.pet.currentRoom === style.id;

      // Fondo de la celda
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(cellX, cellY, cellSize, cellSize);

      // Borde (doble si está seleccionado)
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = isSelected ? 3 : 1;
      this.ctx.strokeRect(cellX, cellY, cellSize, cellSize);

      // Segundo borde interior si está seleccionado
      if (isSelected) {
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);
      }

      // Imagen del estilo
      const imgSize = 50;
      const imgX = cellX + (cellSize - imgSize) / 2;
      const imgY = cellY + 5;

      const styleImg = this.styleIconCache.get(style.key);

      if (styleImg && styleImg.complete && styleImg.naturalHeight > 0) {
        this.ctx.drawImage(styleImg, imgX, imgY, imgSize, imgSize);
      } else {
        // Fallback: cuadrado blanco con emoji
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(imgX, imgY, imgSize, imgSize);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(imgX, imgY, imgSize, imgSize);

        // Emoji de casa como fallback
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('🏠', imgX + imgSize / 2, imgY + imgSize / 2);
      }

      // Nombre del estilo abajo
      this.ctx.textAlign = 'center';
      this.ctx.font = '10px Arial';
      this.ctx.fillStyle = '#000';
      this.ctx.textBaseline = 'alphabetic';
      this.ctx.fillText(style.name, cellX + cellSize / 2, cellY + cellSize - 3);

      // Checkmark si está seleccionado (esquina superior derecha)
      if (isSelected) {
        this.ctx.textAlign = 'right';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('✓', cellX + cellSize - 3, cellY + 15);
      }
    });
  }

  // Métodos para minijuegos
  launchCookingMinigame(ingredientId: string, tier: number): void {
    console.log(`[GameUI] Launching cooking minigame with ingredient ${ingredientId} (tier ${tier})`);
    this.activeMinigame = new MochiCookingUI(this.canvas, this.pet, tier, ingredientId);
    this.activeMinigame.onGameEnd = (success) => {
      this.handleCookingMinigameEnd(ingredientId, success);
    };
  }

  private launchMinigame(minigameId: string, personality: string): void {
    if (minigameId === 'theButton') {
      this.activeMinigame = new TheButtonUI(this.canvas, this.pet);
      this.activeMinigame.setPetSprite(this.getSpriteForPet());
      this.activeMinigame.onGameEnd = (scorePercentage) => {
        this.handleMinigameEnd(scorePercentage, personality);
      };
      this.minigameRewards = new TheButtonRewards(this.canvas, this.ingredientCache);
    } else if (minigameId === 'edgyBunBun') {
      this.activeMinigame = new EdgyBunBunUI(this.canvas, this.pet);
      this.activeMinigame.setPetSprite(this.getSpriteForPet());
      this.activeMinigame.onGameEnd = (scorePercentage) => {
        this.handleMinigameEnd(scorePercentage, personality);
      };
      this.minigameRewards = new TheButtonRewards(this.canvas, this.ingredientCache);
    } else if (minigameId === 'higherOrLower') {
      this.activeMinigame = new GuessTheHigherUI(this.canvas, this.pet);
      const petSprite = this.getSpriteForPet();
      if (petSprite) {
        this.activeMinigame.setPetSprite(petSprite);
      }
      this.activeMinigame.onGameEnd = (scorePercentage) => {
        this.handleMinigameEnd(scorePercentage, personality);
      };
      this.minigameRewards = new TheButtonRewards(this.canvas, this.ingredientCache);
    } else if (minigameId === 'simonDice') {
      this.activeMinigame = new SimonDiceUI(this.canvas, this.pet);
      this.activeMinigame.setPetSprite(this.getSpriteForPet());
      this.activeMinigame.onGameEnd = (scorePercentage) => {
        this.handleMinigameEnd(scorePercentage, personality);
      };
      this.minigameRewards = new TheButtonRewards(this.canvas, this.ingredientCache);
    } else if (minigameId === 'parachute') {
      this.activeMinigame = new ParachuteUI(this.canvas, this.pet);
      this.activeMinigame.setPetSprite(this.getSpriteForPet());
      this.activeMinigame.onGameEnd = (scorePercentage) => {
        this.handleMinigameEnd(scorePercentage, personality);
      };
      this.minigameRewards = new TheButtonRewards(this.canvas, this.ingredientCache);
    }
  }

  private async handleMinigameEnd(scorePercentage: number, personality: string): Promise<void> {
    // Cerrar el minijuego primero (para volver al main room)
    this.activeMinigame = null;

    // Jugar minijuego (maneja diversión + añade ingredientes al inventario según score)
    const rewards = this.pet.play(personality, scorePercentage);
    console.log(`[GameUI] Minigame completed with ${scorePercentage.toFixed(1)}% score, rewards:`, rewards.map(r => r.name));

    // Calcular counts por tier para la animación
    const rewardCounts = { tier1: 0, tier2: 0, tier3: 0 };
    rewards.forEach(reward => {
      if (reward.tier === 1) rewardCounts.tier1++;
      else if (reward.tier === 2) rewardCounts.tier2++;
      else if (reward.tier === 3) rewardCounts.tier3++;
    });

    // Mostrar animación de recompensas SOBRE el main room
    this.showingRewards = true;

    if (this.minigameRewards) {
      await this.minigameRewards.show(rewardCounts.tier1, rewardCounts.tier2, rewardCounts.tier3, personality);
    }

    // Limpiar estado de recompensas
    this.showingRewards = false;
    this.minigameRewards = null;

    // Mostrar recuerdo flotante
    await this.showMinigameMemory(personality);
  }

  private async showMinigameMemory(personality: string): Promise<void> {
    const personalityName = personality.charAt(0).toUpperCase() + personality.slice(1);
    const memoryText = `Recuerdo: Minijuego ${personalityName}`;

    this.showingFeedingRewards = true;

    this.feedingRewards.onComplete = () => {
      this.showingFeedingRewards = false;
    };

    // Show only memory text (no stars)
    await this.feedingRewards.showMemoryOnly(memoryText);
  }

  private handleCookingMinigameEnd(ingredientId: string, success: boolean): void {
    // Cerrar el minijuego primero (para volver al main room)
    this.activeMinigame = null;

    // Cerrar el menú de comida al volver del minijuego
    this.currentMenu = null;

    console.log(`[GameUI] Cooking minigame ${success ? 'SUCCESS' : 'FAILED'} with ingredient: ${ingredientId}`);

    // Obtener el ingrediente
    let ingredient: Ingredient | null = null;

    if (ingredientId === 'neutral') {
      ingredient = Ingredient.createNeutral();
    } else {
      const inventory = this.pet.inventory.getAll();
      const item = inventory.find(i => i.ingredient.identifier === ingredientId);
      if (item) {
        ingredient = item.ingredient;
      }
    }

    if (!ingredient) {
      console.error('[GameUI] Ingredient not found!');
      return;
    }

    if (success) {
      // Victoria: Alimentar al pet con el ingrediente
      const result = this.pet.feedWithIngredient(ingredient);
      if (result.success) {
        console.log(`[GameUI] Pet fed successfully with ${ingredient.name}`);
        // NO mostrar feedback de texto, solo las estrellas y recuerdo flotantes
        // this.showFeedback('eat'); // REMOVIDO - no hay bocadillo para 'eat'

        // Mostrar estrellas y recuerdo flotantes
        this.showFeedingRewards(ingredient);
      } else if (result.reason === 'full') {
        console.log('[GameUI] Pet is full and refused food!');
        this.showFeedback('refuse_food');
      }
    } else {
      // Derrota: Consumir el ingrediente sin alimentar (se pierde)
      if (ingredientId !== 'neutral') {
        this.pet.inventory.consume(ingredientId);
        console.log(`[GameUI] Ingredient ${ingredient.name} lost due to cooking failure`);
      }
    }

    // Resetear selección de ingrediente
    this.selectedIngredient = 'neutral';
  }

  private async showFeedingRewards(ingredient: Ingredient): Promise<void> {
    // Generar texto del recuerdo si no es neutral
    let memoryText: string | undefined = undefined;
    if (ingredient.personality !== 'neutral') {
      const personalityName = ingredient.personality.charAt(0).toUpperCase() + ingredient.personality.slice(1);
      memoryText = `Recuerdo: Comida ${personalityName}`;
    }

    this.showingFeedingRewards = true;

    // Setup onComplete callback
    this.feedingRewards.onComplete = () => {
      this.showingFeedingRewards = false;
    };

    // Show rewards
    await this.feedingRewards.show(ingredient, memoryText);
  }

  setTimeMultiplier(multiplier: number) {
    this.timeMultiplier = multiplier;
  }

  renderSleepScreen() {
    this.ctx.save();

    // Fondo negro
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 3 Z's (pequeña, mediana, grande)
    const zSprite = this.settingsCache.get('Z.png');
    if (zSprite && zSprite.complete) {
      // Z pequeña (abajo izquierda)
      this.ctx.drawImage(zSprite, 150, 350, 50, 50);
      // Z mediana
      this.ctx.drawImage(zSprite, 190, 280, 70, 70);
      // Z grande (arriba derecha)
      this.ctx.drawImage(zSprite, 240, 200, 90, 90);
    }

    // Botón despertar (izquierda, misma posición que mimir)
    const wakeButton = this.settingsCache.get('Boton despertar.png');
    const wakeX = 15;
    const wakeY = this.canvas.height * 0.35;

    if (wakeButton && wakeButton.complete) {
      // Mantener aspect ratio
      const spriteAspect = wakeButton.width / wakeButton.height;
      const targetHeight = 55;
      const targetWidth = targetHeight * spriteAspect;

      this.ctx.drawImage(wakeButton, wakeX, wakeY, targetWidth, targetHeight);
    } else {
      // Fallback
      const wakeSize = 55;
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(wakeX, wakeY, wakeSize, wakeSize);
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(wakeX, wakeY, wakeSize, wakeSize);
      this.ctx.font = '30px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#000';
      this.ctx.fillText('💡', wakeX + wakeSize / 2, wakeY + wakeSize / 2 + 10);
    }

    this.ctx.restore();
  }

  // ============ SETTINGS SYSTEM ============
  // TODO: Código de settings movido a SettingsUI.ts
}
