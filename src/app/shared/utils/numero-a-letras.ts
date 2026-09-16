const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const DIECIS = [
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
];
const DECENAS = ['veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

function convertirGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';

  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];

  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto >= 20) {
    const decena = Math.floor(resto / 10) - 2;
    const unidad = resto % 10;
    partes.push(unidad > 0 ? `${DECENAS[decena]} y ${UNIDADES[unidad]}` : DECENAS[decena]);
  } else if (resto >= 10) {
    partes.push(DIECIS[resto - 10]);
  } else if (resto > 0) {
    partes.push(UNIDADES[resto]);
  }

  return partes.join(' ');
}

/** CCAL-010 — Valor en letras = conversión del valor total de la cuenta a texto. */
export function numeroALetras(valor: number): string {
  const entero = Math.round(Math.abs(valor));
  if (entero === 0) return 'Cero pesos m/cte';

  const millones = Math.floor(entero / 1_000_000);
  const miles = Math.floor((entero % 1_000_000) / 1_000);
  const resto = entero % 1_000;

  const partes: string[] = [];

  if (millones > 0) {
    partes.push(millones === 1 ? 'un millón' : `${convertirGrupo(millones)} millones`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'mil' : `${convertirGrupo(miles)} mil`);
  }
  if (resto > 0) {
    partes.push(convertirGrupo(resto));
  }

  const texto = partes.join(' ').trim();
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)} pesos m/cte`;
}
