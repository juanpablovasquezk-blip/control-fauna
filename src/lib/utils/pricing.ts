import { getUFValueAction } from '@/app/(dashboard)/settings/actions'

/**
 * Convierte una tarifa configurada (en CLP o UF) a pesos chilenos (CLP)
 * utilizando el valor de la UF para el día del servicio.
 * 
 * @param pricePerAnimal Precio base configurado en la tarifa
 * @param priceUnit Unidad del precio ('CLP' o 'UF')
 * @param recordDate Fecha de la jornada o servicio (formato YYYY-MM-DD)
 * @returns Promesa con el valor final convertido a pesos (CLP)
 */
export async function calculateRateInCLP(
  pricePerAnimal: number,
  priceUnit: string,
  recordDate: string
): Promise<number> {
  const price = Number(pricePerAnimal)
  if (isNaN(price) || price <= 0) return 0

  // Si la tarifa ya está en pesos, retornar el valor directamente
  if (priceUnit !== 'UF') {
    return price
  }

  // Si la tarifa está en UF, obtener el valor de la UF para esa fecha y convertir
  try {
    const res = await getUFValueAction(recordDate)
    if (res.success && res.uf) {
      return Math.round(price * res.uf)
    } else {
      console.warn(`No se pudo obtener la UF para la fecha ${recordDate}. Usando valor de respaldo: $${res.fallbackUf}`)
      return Math.round(price * (res.fallbackUf || 37700))
    }
  } catch (err) {
    console.error('Error calculando la tarifa en CLP:', err)
    return Math.round(price * 37700) // Fallback genérico
  }
}
