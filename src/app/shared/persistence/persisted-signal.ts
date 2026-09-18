import { WritableSignal, effect, signal } from '@angular/core';

const STORAGE_PREFIX = 'sgdp:';

/**
 * Un WritableSignal que se inicializa desde localStorage si ya hay datos guardados, o desde
 * `seed` (el JSON de fake_data) si no — y persiste automáticamente cada cambio posterior.
 * Sirve de "base de datos" de la demo mientras no hay backend: cada servicio de dominio solo
 * cambia su `signal(SEED)` por `persistedSignal('clave', SEED)` y el resto de su código
 * (`.set()`, `.update()`, `.asReadonly()`) sigue igual.
 *
 * localStorage puede fallar (navegación privada, cuota excedida, storage deshabilitado); en
 * ese caso se degrada a trabajar solo en memoria sin romper la app.
 */
export function persistedSignal<T>(key: string, seed: T): WritableSignal<T> {
  const storageKey = STORAGE_PREFIX + key;
  const state = signal<T>(readFromStorage<T>(storageKey) ?? seed);

  effect(() => {
    const value = state();
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // localStorage no disponible — se continúa solo en memoria.
    }
  });

  return state;
}

/** Borra todos los datos persistidos de la demo (todas las claves `sgdp:*`) para restablecer los seeds originales. */
export function resetDemoData(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage no disponible — nada que limpiar.
  }
}

function readFromStorage<T>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
