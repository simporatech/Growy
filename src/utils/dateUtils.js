/**
 * Retorna la fecha actual o dada en formato YYYY-MM-DD en la zona horaria local del usuario.
 * Evita el desfase horario que provoca .toISOString().
 */
export const getLocalDateString = (date = new Date()) => {
  if (typeof date === 'string') {
    const clean = date.trim().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
  }
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default getLocalDateString;
