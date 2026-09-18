export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimestamp(): string {
  const iso = new Date().toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export function addDays(fechaIso: string, dias: number): string {
  const fecha = new Date(fechaIso);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Día hábil siguiente (lunes a viernes; sin calendario de festivos) a una fecha dada. */
export function siguienteDiaHabil(fechaIso: string): string {
  let fecha = addDays(fechaIso, 1);
  while (esFinDeSemana(fecha)) {
    fecha = addDays(fecha, 1);
  }
  return fecha;
}

function esFinDeSemana(fechaIso: string): boolean {
  const dia = new Date(fechaIso).getUTCDay();
  return dia === 0 || dia === 6;
}
