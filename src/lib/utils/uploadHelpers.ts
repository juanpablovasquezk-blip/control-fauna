import { createClient } from '@/lib/supabase/client'

/**
 * Helper to upload a file image to Supabase Storage or convert to Data URL if storage fails
 */
export async function uploadImageFile(file: File, pathPrefix: string = 'events'): Promise<string> {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`

  try {
    const { data, error } = await supabase.storage
      .from('event-photos')
      .upload(fileName, file, { upsert: true })

    if (error) {
      console.warn('Supabase storage upload failed, converting to data URL:', error.message)
      return await fileToDataUrl(file)
    }

    const { data: publicUrlData } = supabase.storage
      .from('event-photos')
      .getPublicUrl(data.path)

    return publicUrlData.publicUrl
  } catch (err) {
    console.warn('Storage exception, using data URL fallback:', err)
    return await fileToDataUrl(file)
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}
