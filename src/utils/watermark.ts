const WATERMARK_IMAGE = '/Screenshot 2025-11-22 at 3.44.06 am.png';

export async function addWatermarkToImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const watermark = new Image();
      watermark.crossOrigin = 'anonymous';

      watermark.onload = () => {
        const watermarkWidth = img.width * 0.25;
        const watermarkHeight = (watermark.height / watermark.width) * watermarkWidth;

        const x = 20;
        const y = 20;

        ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            const watermarkedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(watermarkedFile);
          } else {
            reject(new Error('Failed to create watermarked image'));
          }
        }, file.type);
      };

      watermark.onerror = () => {
        resolve(file);
      };

      watermark.src = WATERMARK_IMAGE;
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

export async function addWatermarkToVideo(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const watermark = new Image();
      watermark.crossOrigin = 'anonymous';

      watermark.onload = () => {
        const watermarkWidth = canvas.width * 0.25;
        const watermarkHeight = (watermark.height / watermark.width) * watermarkWidth;

        const x = 20;
        const y = 20;

        ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], `${file.name}_thumbnail.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(file);
          } else {
            resolve(file);
          }
        }, 'image/jpeg');
      };

      watermark.onerror = () => {
        resolve(file);
      };

      watermark.src = WATERMARK_IMAGE;
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

export async function addWatermark(file: File): Promise<File> {
  if (file.type.startsWith('image/')) {
    try {
      return await addWatermarkToImage(file);
    } catch (error) {
      console.error('Failed to add watermark to image:', error);
      return file;
    }
  } else if (file.type.startsWith('video/')) {
    return file;
  }
  return file;
}
