import { LifeStage } from './LifeStage';

/**
 * Sistema completo de evoluciones basado en el CSV de diseño
 * Mapea (etapa_actual, personalidad_actual, recuerdo_dominante) → nueva_personalidad
 */

export interface EvolutionPath {
  childPersonality: string;        // Personalidad en Niño (ej: "Intelectual")
  childMemory: string;              // Recuerdo aplicado en Niño (ej: "edgy")
  youngArchetype: string;           // Resultado en Joven (ej: "Ingeniero")
  youngMemory: string;              // Recuerdo aplicado en Joven (ej: "sassy")
  adultPersonality: string;         // Resultado en Adulto (ej: "Glados")
  reference?: string;               // Referencia cultural (ej: "Portal")
}

/**
 * Árbol evolutivo completo desde el CSV de diseño
 * Cada entrada representa una path completa: Child → Young → Adult
 */
const EVOLUTION_PATHS: EvolutionPath[] = [
  // Intelectual (Child) paths
  { childPersonality: 'intelectual', childMemory: 'edgy', youngArchetype: 'Ingeniero', youngMemory: 'sassy', adultPersonality: 'Glados' },
  { childPersonality: 'intelectual', childMemory: 'edgy', youngArchetype: 'Ingeniero', youngMemory: 'anxious', adultPersonality: 'Tails' },
  { childPersonality: 'intelectual', childMemory: 'edgy', youngArchetype: 'Ingeniero', youngMemory: 'geek', adultPersonality: 'Hideo Kojima' },

  { childPersonality: 'intelectual', childMemory: 'sassy', youngArchetype: 'El personaje prodigioso', youngMemory: 'edgy', adultPersonality: 'Shadow' },
  { childPersonality: 'intelectual', childMemory: 'sassy', youngArchetype: 'El personaje prodigioso', youngMemory: 'anxious', adultPersonality: 'Elsa' },
  { childPersonality: 'intelectual', childMemory: 'sassy', youngArchetype: 'El personaje prodigioso', youngMemory: 'geek', adultPersonality: 'Neo' },

  { childPersonality: 'intelectual', childMemory: 'geek', youngArchetype: 'Jugador de rol', youngMemory: 'edgy', adultPersonality: 'H.P. Lovecraft' },
  { childPersonality: 'intelectual', childMemory: 'geek', youngArchetype: 'Jugador de rol', youngMemory: 'anxious', adultPersonality: 'Frodo Bolson' },
  { childPersonality: 'intelectual', childMemory: 'geek', youngArchetype: 'Jugador de rol', youngMemory: 'sassy', adultPersonality: 'The Dungeon Master' },

  { childPersonality: 'intelectual', childMemory: 'anxious', youngArchetype: 'Nerd', youngMemory: 'edgy', adultPersonality: 'Dr. Eggman' },
  { childPersonality: 'intelectual', childMemory: 'anxious', youngArchetype: 'Nerd', youngMemory: 'sassy', adultPersonality: 'Sheldon Cooper' },
  { childPersonality: 'intelectual', childMemory: 'anxious', youngArchetype: 'Nerd', youngMemory: 'geek', adultPersonality: 'Hackerman' },

  { childPersonality: 'intelectual', childMemory: 'intelectual', youngArchetype: 'Cerebro Galaxia', youngMemory: 'anxious', adultPersonality: 'R2-D2' },
  { childPersonality: 'intelectual', childMemory: 'intelectual', youngArchetype: 'Cerebro Galaxia', youngMemory: 'geek', adultPersonality: 'Dr. Who' },
  { childPersonality: 'intelectual', childMemory: 'intelectual', youngArchetype: 'Cerebro Galaxia', youngMemory: 'sassy', adultPersonality: 'Tyrion Lannister' },
  { childPersonality: 'intelectual', childMemory: 'intelectual', youngArchetype: 'Cerebro Galaxia', youngMemory: 'edgy', adultPersonality: 'Dr. House' },

  // Geek (Child) paths
  { childPersonality: 'geek', childMemory: 'edgy', youngArchetype: 'Otaku Cringe', youngMemory: 'intelectual', adultPersonality: 'Kira' },
  { childPersonality: 'geek', childMemory: 'edgy', youngArchetype: 'Otaku Cringe', youngMemory: 'anxious', adultPersonality: 'Shinji' },
  { childPersonality: 'geek', childMemory: 'edgy', youngArchetype: 'Otaku Cringe', youngMemory: 'sassy', adultPersonality: 'Sasuke' },

  { childPersonality: 'geek', childMemory: 'sassy', youngArchetype: 'Cosplayer', youngMemory: 'edgy', adultPersonality: 'Ghostface' },
  { childPersonality: 'geek', childMemory: 'sassy', youngArchetype: 'Cosplayer', youngMemory: 'anxious', adultPersonality: 'James' },
  { childPersonality: 'geek', childMemory: 'sassy', youngArchetype: 'Cosplayer', youngMemory: 'intelectual', adultPersonality: 'Spiderman' },

  { childPersonality: 'geek', childMemory: 'intelectual', youngArchetype: 'Jugador de rol', youngMemory: 'edgy', adultPersonality: 'H.P. Lovecraft' },
  { childPersonality: 'geek', childMemory: 'intelectual', youngArchetype: 'Jugador de rol', youngMemory: 'anxious', adultPersonality: 'Frodo Bolson' },
  { childPersonality: 'geek', childMemory: 'intelectual', youngArchetype: 'Jugador de rol', youngMemory: 'sassy', adultPersonality: 'The Dungeon Master' },

  { childPersonality: 'geek', childMemory: 'anxious', youngArchetype: 'Otaku', youngMemory: 'edgy', adultPersonality: 'Muzan' },
  { childPersonality: 'geek', childMemory: 'anxious', youngArchetype: 'Otaku', youngMemory: 'sassy', adultPersonality: 'Asuka' },
  { childPersonality: 'geek', childMemory: 'anxious', youngArchetype: 'Otaku', youngMemory: 'intelectual', adultPersonality: 'Bulma' },

  { childPersonality: 'geek', childMemory: 'geek', youngArchetype: 'Fanatico', youngMemory: 'anxious', adultPersonality: 'Gollum' },
  { childPersonality: 'geek', childMemory: 'geek', youngArchetype: 'Fanatico', youngMemory: 'intelectual', adultPersonality: 'Viktor' },
  { childPersonality: 'geek', childMemory: 'geek', youngArchetype: 'Fanatico', youngMemory: 'sassy', adultPersonality: 'Edna Moda' },
  { childPersonality: 'geek', childMemory: 'geek', youngArchetype: 'Fanatico', youngMemory: 'edgy', adultPersonality: 'Conspiranoico' },

  // Anxious (Child) paths
  { childPersonality: 'anxious', childMemory: 'edgy', youngArchetype: 'Emo', youngMemory: 'intelectual', adultPersonality: 'L' },
  { childPersonality: 'anxious', childMemory: 'edgy', youngArchetype: 'Emo', youngMemory: 'sassy', adultPersonality: 'Mewtwo' },
  { childPersonality: 'anxious', childMemory: 'edgy', youngArchetype: 'Emo', youngMemory: 'geek', adultPersonality: 'Millenials 2008' },

  { childPersonality: 'anxious', childMemory: 'sassy', youngArchetype: 'El villano que en realidad es buen tipo', youngMemory: 'edgy', adultPersonality: 'Godzilla' },
  { childPersonality: 'anxious', childMemory: 'sassy', youngArchetype: 'El villano que en realidad es buen tipo', youngMemory: 'geek', adultPersonality: 'Dwight' },
  { childPersonality: 'anxious', childMemory: 'sassy', youngArchetype: 'El villano que en realidad es buen tipo', youngMemory: 'intelectual', adultPersonality: 'Doofenshmirtz' },

  { childPersonality: 'anxious', childMemory: 'intelectual', youngArchetype: 'Nerd', youngMemory: 'edgy', adultPersonality: 'Dr. Eggman' },
  { childPersonality: 'anxious', childMemory: 'intelectual', youngArchetype: 'Nerd', youngMemory: 'sassy', adultPersonality: 'Sheldon Cooper' },
  { childPersonality: 'anxious', childMemory: 'intelectual', youngArchetype: 'Nerd', youngMemory: 'geek', adultPersonality: 'Hackerman' },

  { childPersonality: 'anxious', childMemory: 'geek', youngArchetype: 'Otaku', youngMemory: 'edgy', adultPersonality: 'Alucard' },
  { childPersonality: 'anxious', childMemory: 'geek', youngArchetype: 'Otaku', youngMemory: 'sassy', adultPersonality: 'Asuka' },
  { childPersonality: 'anxious', childMemory: 'geek', youngArchetype: 'Otaku', youngMemory: 'intelectual', adultPersonality: 'Bulma' },

  { childPersonality: 'anxious', childMemory: 'anxious', youngArchetype: 'Overthinker', youngMemory: 'geek', adultPersonality: 'Morty' },
  { childPersonality: 'anxious', childMemory: 'anxious', youngArchetype: 'Overthinker', youngMemory: 'intelectual', adultPersonality: 'Van Gogh' },
  { childPersonality: 'anxious', childMemory: 'anxious', youngArchetype: 'Overthinker', youngMemory: 'sassy', adultPersonality: 'Marceline' },
  { childPersonality: 'anxious', childMemory: 'anxious', youngArchetype: 'Overthinker', youngMemory: 'edgy', adultPersonality: 'Bella Swan' },

  // Edgy (Child) paths
  { childPersonality: 'edgy', childMemory: 'anxious', youngArchetype: 'Absoluto Edgy', youngMemory: 'geek', adultPersonality: 'Reddit User' },
  { childPersonality: 'edgy', childMemory: 'anxious', youngArchetype: 'Absoluto Edgy', youngMemory: 'sassy', adultPersonality: 'Lucifer' },
  { childPersonality: 'edgy', childMemory: 'anxious', youngArchetype: 'Absoluto Edgy', youngMemory: 'intelectual', adultPersonality: 'Edgar Alan Poe' },
  { childPersonality: 'edgy', childMemory: 'anxious', youngArchetype: 'Absoluto Edgy', youngMemory: 'anxious', adultPersonality: 'Gerard Way' },

  // Sassy (Child) paths
  { childPersonality: 'sassy', childMemory: 'edgy', youngArchetype: 'El villano de tu serie favorita', youngMemory: 'intelectual', adultPersonality: 'Dracula' },
  { childPersonality: 'sassy', childMemory: 'edgy', youngArchetype: 'El villano de tu serie favorita', youngMemory: 'anxious', adultPersonality: 'Megamind' },
  { childPersonality: 'sassy', childMemory: 'edgy', youngArchetype: 'El villano de tu serie favorita', youngMemory: 'geek', adultPersonality: 'Bowser' },

  { childPersonality: 'sassy', childMemory: 'anxious', youngArchetype: 'El villano que en realidad es buen tipo', youngMemory: 'edgy', adultPersonality: 'Godzilla' },
  { childPersonality: 'sassy', childMemory: 'anxious', youngArchetype: 'El villano que en realidad es buen tipo', youngMemory: 'geek', adultPersonality: 'Dwight' },
  { childPersonality: 'sassy', childMemory: 'anxious', youngArchetype: 'El villano que en realidad es buen tipo', youngMemory: 'intelectual', adultPersonality: 'Doofenshmirtz' },

  { childPersonality: 'sassy', childMemory: 'intelectual', youngArchetype: 'El personaje prodigioso', youngMemory: 'edgy', adultPersonality: 'Shadow' },
  { childPersonality: 'sassy', childMemory: 'intelectual', youngArchetype: 'El personaje prodigioso', youngMemory: 'anxious', adultPersonality: 'Elsa' },
  { childPersonality: 'sassy', childMemory: 'intelectual', youngArchetype: 'El personaje prodigioso', youngMemory: 'geek', adultPersonality: 'Neo' },

  { childPersonality: 'sassy', childMemory: 'geek', youngArchetype: 'Cosplayer', youngMemory: 'edgy', adultPersonality: 'Ghostface' },
  { childPersonality: 'sassy', childMemory: 'geek', youngArchetype: 'Cosplayer', youngMemory: 'anxious', adultPersonality: 'James' },
  { childPersonality: 'sassy', childMemory: 'geek', youngArchetype: 'Cosplayer', youngMemory: 'intelectual', adultPersonality: 'Spiderman' },

  { childPersonality: 'sassy', childMemory: 'sassy', youngArchetype: 'Showman', youngMemory: 'geek', adultPersonality: 'Mettaton' },
  { childPersonality: 'sassy', childMemory: 'sassy', youngArchetype: 'Showman', youngMemory: 'intelectual', adultPersonality: 'Sherlock Holmes' },
  { childPersonality: 'sassy', childMemory: 'sassy', youngArchetype: 'Showman', youngMemory: 'anxious', adultPersonality: 'Michael Scott' },
  { childPersonality: 'sassy', childMemory: 'sassy', youngArchetype: 'Showman', youngMemory: 'edgy', adultPersonality: 'Joker' },
];

/**
 * Casos especiales: Descuidado y Patata
 */
const SPECIAL_EVOLUTIONS = {
  descuidado: {
    // Descuidado se mantiene descuidado con cualquier recuerdo
    childMemory: ['geek', 'intelectual', 'anxious', 'edgy', 'sassy'],
    result: 'Descuidado' // Mantiene nombre genérico
  },
  patata: {
    // Sin recuerdos o evolución sin memoria dominante
    result: 'Patata'
  }
};

/**
 * Mapeo de nombres complejos a personalidad base para sprites
 * Los sprites solo existen para: anxious, edgy, geek, intelectual, sassy, neutral
 */
const PERSONALITY_TO_SPRITE: Record<string, string> = {
  // Child (Niño) - Personalidades base
  'anxious': 'anxious',
  'edgy': 'edgy',
  'geek': 'geek',
  'intelectual': 'intelectual',
  'sassy': 'sassy',
  'neutral': 'neutral',

  // Young (Joven) - Arquetipos → Base personality
  'Ingeniero': 'intelectual',
  'El personaje prodigioso': 'intelectual',
  'Jugador de rol': 'geek',
  'Nerd': 'anxious',
  'Cerebro Galaxia': 'intelectual',
  'Otaku Cringe': 'geek',
  'Cosplayer': 'geek',
  'Otaku': 'geek',
  'Fanatico': 'geek',
  'Emo': 'anxious',
  'El villano que en realidad es buen tipo': 'sassy',
  'Overthinker': 'anxious',
  'Absoluto Edgy': 'edgy',
  'El villano de tu serie favorita': 'sassy',
  'Showman': 'sassy',

  // Adult (Adulto) - Personalidades finales → Base personality (derivado del último recuerdo)
  'Glados': 'sassy',
  'Tails': 'anxious',
  'Hideo Kojima': 'geek',
  'Shadow': 'edgy',
  'Elsa': 'anxious',
  'Neo': 'geek',
  'H.P. Lovecraft': 'edgy',
  'Frodo Bolson': 'anxious',
  'The Dungeon Master': 'sassy',
  'Dr. Eggman': 'edgy',
  'Sheldon Cooper': 'sassy',
  'Hackerman': 'geek',
  'R2-D2': 'anxious',
  'Dr. Who': 'geek',
  'Tyrion Lannister': 'sassy',
  'Dr. House': 'edgy',
  'Kira': 'intelectual',
  'Shinji': 'anxious',
  'Sasuke': 'sassy',
  'Ghostface': 'edgy',
  'James': 'anxious',
  'Spiderman': 'intelectual',
  'Muzan': 'edgy',
  'Asuka': 'sassy',
  'Bulma': 'intelectual',
  'Gollum': 'anxious',
  'Viktor': 'intelectual',
  'Edna Moda': 'sassy',
  'Conspiranoico': 'edgy',
  'L': 'intelectual',
  'Mewtwo': 'sassy',
  'Millenials 2008': 'geek',
  'Godzilla': 'edgy',
  'Dwight': 'geek',
  'Doofenshmirtz': 'intelectual',
  'Alucard': 'edgy',
  'Morty': 'geek',
  'Van Gogh': 'intelectual',
  'Marceline': 'sassy',
  'Bella Swan': 'edgy',
  'Reddit User': 'geek',
  'Lucifer': 'sassy',
  'Edgar Alan Poe': 'intelectual',
  'Gerard Way': 'anxious',
  'Dracula': 'intelectual',
  'Megamind': 'anxious',
  'Bowser': 'geek',
  'Mettaton': 'geek',
  'Sherlock Holmes': 'intelectual',
  'Michael Scott': 'anxious',
  'Joker': 'edgy',
  'Descuidado': 'neutral',
  'Patata': 'neutral',
};

export class EvolutionTree {
  /**
   * Obtiene la siguiente personalidad basándose en la etapa actual, personalidad y recuerdo dominante
   */
  static getNextPersonality(
    currentStage: LifeStage,
    currentPersonality: string | null,
    dominantMemory: string | null,
    wasNeglected: boolean
  ): string | null {
    // Caso especial: Descuidado (neglected)
    if (wasNeglected || currentPersonality === 'Descuidado') {
      return 'Descuidado';
    }

    // Caso especial: Sin recuerdos (Patata)
    if (!dominantMemory) {
      return 'Patata';
    }

    // Normalizar nombres (minúsculas para comparación)
    const currentNormalized = currentPersonality?.toLowerCase() || '';
    const memoryNormalized = dominantMemory.toLowerCase();

    switch (currentStage) {
      case LifeStage.Baby:
        // Baby → Child: Solo usa el recuerdo dominante
        return dominantMemory;

      case LifeStage.Child:
        // Child → Young: Buscar arquetipo en el árbol
        const childToYoung = EVOLUTION_PATHS.find(
          path => path.childPersonality.toLowerCase() === currentNormalized &&
                  path.childMemory.toLowerCase() === memoryNormalized
        );
        return childToYoung ? childToYoung.youngArchetype : null;

      case LifeStage.Young:
        // Young → Adult: Buscar personalidad final en el árbol
        const youngToAdult = EVOLUTION_PATHS.find(
          path => path.youngArchetype.toLowerCase() === currentNormalized &&
                  path.youngMemory.toLowerCase() === memoryNormalized
        );
        return youngToAdult ? youngToAdult.adultPersonality : null;

      default:
        return null;
    }
  }

  /**
   * Obtiene el nombre del archivo sprite para una personalidad
   * Retorna el nombre exacto del archivo (puede ser específico o base)
   * Ej: "Glados" → "Glados", "Ingeniero" → "Ingeniero", "anxious" → "anxious"
   */
  static getSpriteFilename(personalityName: string): string {
    // Normalizar nombre para comparación
    const normalized = personalityName.toLowerCase().trim();

    // Mapeos especiales para nombres con caracteres especiales o espacios
    const filenameMappings: Record<string, string> = {
      // Young (arquetipos)
      'absoluto edgy': 'AbsolutoEdgy',
      'cerebro galaxia': 'CerebroGalaxia',
      'cosplayer': 'Cosplayer',
      'el villano que en realidad es buen tipo': 'El villano que en realidad es buen tipo',
      'el personaje prodigioso': 'ElPersonajeProdigioso',
      'el villano de tu serie favorita': 'ElVillanoDeTuSerieFavorita',
      'emo': 'Emo',
      'fanatico': 'Fanatico',
      'ingeniero': 'Ingeniero',
      'jugador de rol': 'JugadorDeRol',
      'nerd': 'Nerd',
      'otaku': 'Otaku',
      'otaku cringe': 'OtakuCringe',
      'overthinker': 'Overthinker',
      'showman': 'Showman',

      // Adult (personalidades finales)
      'glados': 'Glados',
      'tails': 'Tails',
      'hideo kojima': 'Kojima',
      'kojima': 'Kojima',
      'shadow': 'Shadow',
      'elsa': 'Elsa',
      'neo': 'Neo',
      'h.p. lovecraft': 'Lovecraft',
      'lovecraft': 'Lovecraft',
      'frodo bolson': 'Frodo',
      'frodo': 'Frodo',
      'the dungeon master': 'Dungeon Master',
      'dr. eggman': 'Eggman',
      'eggman': 'Eggman',
      'sheldon cooper': 'Sheldon Cooper',
      'sheldon': 'Sheldon Cooper',
      'hackerman': 'Hackerman',
      'r2-d2': 'R2D2',
      'r2d2': 'R2D2',
      'dr. who': 'Dr Who',
      'tyrion lannister': 'Tyrion',
      'dr. house': 'House',
      'house': 'House',
      'kira': 'Kira',
      'shinji': 'Shinji',
      'sasuke': 'Sasuke',
      'ghostface': 'Ghostface',
      'james': 'James',
      'spiderman': 'Spiderman',
      'muzan': 'Muzan',
      'asuka': 'Asuka',
      'bulma': 'Bulma',
      'gollum': 'Gollum',
      'viktor': 'Viktor',
      'edna moda': 'Edna Moda',
      'conspiranoico': 'Conspiranoico',
      'l': 'L',
      'mewtwo': 'Mewtwo',
      'millenials 2008': 'Milenial',
      'milenial': 'Milenial',
      'godzilla': 'Godzilla',
      'dwight': 'Dwight',
      'doofenshmirtz': 'Doofenshmirtz',
      'alucard': 'Alucard',
      'morty': 'Morty',
      'van gogh': 'Van Gogh',
      'marceline': 'Marceline',
      'bella swan': 'Bella Swan',
      'reddit user': 'Reddit',
      'lucifer': 'Lucifer',
      'edgar alan poe': 'Edgar Allan Poe',
      'edgar allan poe': 'Edgar Allan Poe',
      'gerard way': 'Gerard Way',
      'dracula': 'Drácula',
      'drácula': 'Drácula',
      'megamind': 'Megamente',
      'megamente': 'Megamente',
      'bowser': 'Bowser',
      'mettaton': 'Mettaton',
      'sherlock holmes': 'Sherlock',
      'michael scott': 'Michael Scott',
      'joker': 'Joker',

      // Base personalities (child stage y fallback)
      'anxious': 'anxious',
      'edgy': 'edgy',
      'geek': 'geek',
      'intelectual': 'intelectual',
      'sassy': 'sassy',
      'neutral': 'neutral',
      'descuidado': 'neutral',
      'patata': 'neutral',
    };

    // Buscar mapeo directo
    const mapped = filenameMappings[normalized];
    if (mapped) {
      return mapped;
    }

    // Fallback: Retornar el nombre con primera letra mayúscula
    return personalityName.charAt(0).toUpperCase() + personalityName.slice(1);
  }

  /**
   * DEPRECATED: Usa getSpriteFilename() en su lugar
   * Obtiene el nombre del sprite base para retrocompatibilidad
   */
  static getBaseSprite(personalityName: string): string {
    const filename = this.getSpriteFilename(personalityName);

    // Si es un sprite específico, retornar el filename directamente
    // Si es base personality, retornar lowercase
    const basePersonalities = ['anxious', 'edgy', 'geek', 'intelectual', 'sassy', 'neutral'];
    if (basePersonalities.includes(filename.toLowerCase())) {
      return filename.toLowerCase();
    }

    // Retornar filename para sprites específicos
    return filename;
  }

  /**
   * Verifica si una evolución es válida según el árbol
   */
  static isValidEvolution(
    currentStage: LifeStage,
    currentPersonality: string,
    dominantMemory: string
  ): boolean {
    const result = this.getNextPersonality(currentStage, currentPersonality, dominantMemory, false);
    return result !== null;
  }

  /**
   * Obtiene todas las posibles evoluciones desde una personalidad
   */
  static getPossibleEvolutions(currentStage: LifeStage, currentPersonality: string): string[] {
    const currentNormalized = currentPersonality.toLowerCase();
    const possibilities: string[] = [];

    switch (currentStage) {
      case LifeStage.Child:
        // Buscar todos los arquetipos posibles desde esta personalidad Child
        EVOLUTION_PATHS
          .filter(path => path.childPersonality.toLowerCase() === currentNormalized)
          .forEach(path => {
            if (!possibilities.includes(path.youngArchetype)) {
              possibilities.push(path.youngArchetype);
            }
          });
        break;

      case LifeStage.Young:
        // Buscar todas las personalidades Adult posibles desde este arquetipo Young
        EVOLUTION_PATHS
          .filter(path => path.youngArchetype.toLowerCase() === currentNormalized)
          .forEach(path => {
            if (!possibilities.includes(path.adultPersonality)) {
              possibilities.push(path.adultPersonality);
            }
          });
        break;
    }

    return possibilities;
  }
}
