/**
 * Utilidades para el control temporal de elecciones en el frontend.
 * Replica lógica del backend para mostrar timers.
 */

const VOTING_START_HOUR = 8;
const VOTING_END_HOUR = 16;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Obtiene los rangos horarios y alfabeticos para una fecha.
 * @param {Date} date Fecha base.
 * @returns {Array<{ index: number, desde: string, hasta: string, inicio: Date, fin: Date }>}
 */
export function getAlphabeticalSlots(date = new Date()) {
  const base = new Date(date);
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();

  const slots = 8;
  const baseSize = Math.floor(LETTERS.length / slots); 
  const remainder = LETTERS.length % slots; 

  const result = [];
  let start = 0;
  
  for (let i = 0; i < slots; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    const group = LETTERS.slice(start, start + size);
    start += size;

    const inicio = new Date(year, month, day, VOTING_START_HOUR + i, 0, 0, 0);
    const fin = new Date(year, month, day, VOTING_START_HOUR + i + 1, 0, 0, 0);

    result.push({
      index: i,
      desde: group[0],
      hasta: group[group.length - 1],
      inicio,
      fin,
      letras: group
    });
  }

  return result;
}

/**
 * Calcula milisegundos restantes hasta el turno asignado.
 * @param {string} startTime ISO string o Date
 * @returns {number} milisegundos (0 si ya pasó o es turno)
 */
export function getTimeToSlot(startTime) {
  const now = new Date();
  const target = new Date(startTime);
  const diff = target.getTime() - now.getTime();
  return diff > 0 ? diff : 0;
}

/**
 * Formatea milisegundos en HH:MM:SS
 */
export function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}
