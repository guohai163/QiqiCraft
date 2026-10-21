/**
 * Compress camera/gallery homework photos on the client side (iPad/iPhone Safari)
 * before previewing and uploading to the server & OpenAI Vision API.
 *
 * Typical 12MP iPad photo (4032x3024, ~3MB) -> 1280x960 JPEG (~140KB-220KB).
 */
export async function compressHomeworkImage(
  file: File,
  maxDimension = 1280,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          fallbackReadAsDataUrl(file).then(resolve).catch(reject);
          return;
        }

        // Fill white background for any transparent regions
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(objectUrl);
        resolve(compressedDataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        fallbackReadAsDataUrl(file).then(resolve).catch(() => reject(err));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fallbackReadAsDataUrl(file).then(resolve).catch(reject);
    };

    img.src = objectUrl;
  });
}

function fallbackReadAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}
