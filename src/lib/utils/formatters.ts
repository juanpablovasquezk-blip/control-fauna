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
    '35L', '35R', '17L', '17R', 'P18', 'P36', 'SAG', 'SEREMI', 'PDI', 'CC'
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

    // Si es un acrónimo conocido o un código alfanumérico (ej: SAM4, 35L, K9, T1)
    if (
      uppercaseAcronyms.has(upperClean) ||
      /^[A-Z]{2,6}\d*$/i.test(cleanWord) ||
      /^\d+[A-Z]{1,3}$/i.test(cleanWord)
    ) {
      return word.replace(cleanWord, upperClean)
    }

    const lowerClean = cleanWord.toLowerCase()

    // Preposiciones o conectores en minúsculas (excepto si es la primera palabra del texto)
    if (index > 0 && lowercaseWords.has(lowerClean)) {
      return word.replace(cleanWord, lowerClean)
    }

    // Formato Nombre Propio (Title Case) para palabras estándar
    const capitalized = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase()
    return word.replace(cleanWord, capitalized)
  })

  return formattedWords.join(' ')
}
