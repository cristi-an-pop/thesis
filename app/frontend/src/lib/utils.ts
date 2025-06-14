import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const resizeImage = async (file: File, dimensions: number = 1024): Promise<{resizedFile: File, width: number, height: number, sizeInBytes: number, format: string}> => {
  const maxSize = dimensions;

  const imageBitmap = await createImageBitmap(file);

  const canvas = document.createElement('canvas');
  canvas.width = maxSize;
  canvas.height = maxSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(imageBitmap, 0, 0, maxSize, maxSize);

  const format = file.type || 'image/jpeg';
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), format)
  );

  const resizedFile = new File([blob], file.name, {
    type: format,
    lastModified: Date.now()
  });

  return {
    resizedFile,
    width: maxSize,
    height: maxSize,
    sizeInBytes: resizedFile.size,
    format
  };

}

export const formatFirestoreDate = (date: any): string => {
    try {
      if (date && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM d, yyyy HH:mm');
      }
      if (date instanceof Date) {
        return format(date, 'MMM d, yyyy HH:mm');
      }
      if (typeof date === 'string') {
        return format(new Date(date), 'MMM d, yyyy HH:mm');
      }
      return 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  }
