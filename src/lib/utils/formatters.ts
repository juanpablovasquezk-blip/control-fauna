/**
 * Formatea cualquier entrada de texto libre a un formato estandarizado "Nombre Propio (Title Case)",
 * preservando acrónimos comunes de aviación, aeródromo y clientes en MAYÚSCULAS y manteniendo minúsculas en preposiciones.
 */
export function formatFreeText(text: string | null | undefined): string {
  if (!text) return ''

  // Limpiar espacios múltiples y bordes
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''

  // Conjunto de acrónimos conocidos que deben permanecer completamente en MAYÚSCULAS
  const uppercaseAcronyms = new Set([
    'SAM', 'DGAC', 'TWY', 'RWY', 'VIP', 'SEI', 'APRON', 'RUT', 'ID', 'SCL',
    'MINERQUIM', 'FFAA', 'K9', 'T1', 'T2', 'P35L', 'P35R', 'P17L', 'P17R',
    '35L', '35R', '17L', '17R', 'P18', 'P36', 'SAG', 'SEREMI', 'PDI', 'CC', 'SSEI'
  ])

  // Palabras conectoras o preposiciones cortas en español (se mantienen en minúsculas salvo si es la 1ª palabra)
  const lowercaseWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'por', 'con', 'sin', 'o', 'u'])

  // Separar por espacios
  const words = cleaned.split(' ')

  const formattedWords = words.map((word, index) => {
    // Extraer limpia la palabra alfanumérica descartando paréntesis, comillas o puntuación adjunta
    const cleanWord = word.replace(/^[^\wáéíóúÁÉÍÓÚñÑ]+|[^\wáéíóúÁÉÍÓÚñÑ]+$/g, '')
    if (!cleanWord) return word

    const upperClean = cleanWord.toUpperCase()

    // 1. Si es un acrónimo explícito conocido
    if (uppercaseAcronyms.has(upperClean)) {
      return word.replace(cleanWord, upperClean)
    }

    // 2. Si es un código con mezcla de dígitos y letras (ej: 35L, 17R, P35L, K9, A1, B2)
    if (/^\d+[A-Z]{1,3}$/i.test(cleanWord) || /^[A-Z]+\d+[A-Z]*$/i.test(cleanWord)) {
      return word.replace(cleanWord, upperClean)
    }

    const lowerClean = cleanWord.toLowerCase()

    // 3. Preposiciones o conectores en minúsculas (excepto si es la primera palabra del texto)
    if (index > 0 && lowercaseWords.has(lowerClean)) {
      return word.replace(cleanWord, lowerClean)
    }

    // 4. Formato Nombre Propio (Title Case) para palabras estándar
    const capitalized = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase()
    return word.replace(cleanWord, capitalized)
  })

  return formattedWords.join(' ')
}

/**
 * Formatea un RUT chileno a formato estándar XX.XXX.XXX-X (con puntos y guión).
 */
export function formatRut(rutStr: string | null | undefined): string {
  if (!rutStr) return ''

  // Limpiar caracteres no alfanuméricos
  const cleaned = rutStr.replace(/[^0-9kK]/g, '').toUpperCase()
  if (!cleaned) return ''
  if (cleaned.length < 2) return cleaned

  const dv = cleaned.slice(-1)
  const body = cleaned.slice(0, -1)

  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedBody}-${dv}`
}
