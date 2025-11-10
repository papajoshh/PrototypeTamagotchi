/**
 * InputHelper - Centraliza la conversión de coordenadas de eventos mouse/touch a coordenadas de canvas
 *
 * El canvas tiene un tamaño interno fijo (480x640) pero se escala visualmente en mobile.
 * Esta clase maneja la conversión correcta de coordenadas para todos los event listeners.
 */
export class InputHelper {
  /**
   * Convierte coordenadas de un MouseEvent a coordenadas de canvas
   */
  static getCanvasCoordinatesFromMouse(
    event: MouseEvent,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  /**
   * Convierte coordenadas de un TouchEvent a coordenadas de canvas
   */
  static getCanvasCoordinatesFromTouch(
    touch: Touch,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }

  /**
   * Helper para obtener el primer touch de un TouchEvent y convertir sus coordenadas
   */
  static getCanvasCoordinatesFromTouchEvent(
    event: TouchEvent,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } | null {
    if (event.touches.length === 0) return null;
    return InputHelper.getCanvasCoordinatesFromTouch(event.touches[0], canvas);
  }

  /**
   * Helper para obtener el primer changed touch de un TouchEvent y convertir sus coordenadas
   */
  static getCanvasCoordinatesFromChangedTouch(
    event: TouchEvent,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } | null {
    if (event.changedTouches.length === 0) return null;
    return InputHelper.getCanvasCoordinatesFromTouch(event.changedTouches[0], canvas);
  }
}
