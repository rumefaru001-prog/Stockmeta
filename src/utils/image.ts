export async function extractThumbnail(file: File): Promise<File | null> {
  try {
    // Read up to 10MB to find XMP metadata (EPS/AI files can have large headers)
    const slice = file.slice(0, 10 * 1024 * 1024);
    const text = await slice.text();
    
    // Look for xmpGImg:image content (Base64 encoded JPEG thumbnail)
    const match = text.match(/<xmpGImg:image>([\s\S]*?)<\/xmpGImg:image>/);
    if (match && match[1]) {
      // Clean up the base64 string (remove newlines, whitespace, and XML entities if any)
      const base64 = match[1].replace(/&#xA;/g, '').replace(/\s+/g, '');
      
      // Convert base64 to Blob
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/jpeg' });
      
      // Create a new File object
      const newFileName = file.name.replace(/\.(eps|ai)$/i, '.jpg');
      return new File([blob], newFileName, { type: 'image/jpeg' });
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting thumbnail:", error);
    return null;
  }
}

export async function extractVideoFrame(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      // Seek to 1 second or middle of the video if it's shorter
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            const newFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
            resolve(new File([blob], newFileName, { type: 'image/jpeg' }));
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.8);
      } else {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });
}

export async function extractMultipleVideoFrames(file: File, frameCount: number = 3): Promise<File[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(file);
    video.src = url;

    const frames: File[] = [];
    let currentFrameIndex = 0;
    let timePoints: number[] = [];

    let timeoutId = setTimeout(() => {
      console.warn("Video frame extraction timed out");
      URL.revokeObjectURL(url);
      resolve(frames);
    }, 30000);

    const finish = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      resolve(frames);
    };

    video.onloadedmetadata = () => {
      let duration = video.duration;
      if (!duration || isNaN(duration) || !isFinite(duration)) {
        duration = 10; // Fallback duration if unknown or infinite
      }
      
      // Calculate time points for frames
      if (frameCount === 2) {
        timePoints.push(duration * 0.1); // 10% for the beginning
        timePoints.push(duration * 0.5); // 50% for the middle
      } else {
        for (let i = 1; i <= frameCount; i++) {
          timePoints.push((duration / (frameCount + 1)) * i);
        }
      }
      
      video.currentTime = timePoints[0];
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const newFileName = file.name.replace(/\.[^/.]+$/, `_frame_${currentFrameIndex + 1}.jpg`);
            frames.push(new File([blob], newFileName, { type: 'image/jpeg' }));
          }
          
          currentFrameIndex++;
          if (currentFrameIndex < timePoints.length) {
            video.currentTime = timePoints[currentFrameIndex];
          } else {
            finish();
          }
        }, 'image/jpeg', 0.8);
      } else {
        currentFrameIndex++;
        if (currentFrameIndex < timePoints.length) {
          video.currentTime = timePoints[currentFrameIndex];
        } else {
          finish();
        }
      }
    };

    video.onerror = () => {
      finish();
    };
  });
}

export async function compressImage(file: File, maxWidth = 500, maxHeight = 500, quality = 0.7): Promise<{base64: string, mimeType: string}> {
  let mimeType = file.type;
  if (!mimeType) {
    if (file.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
    else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
    else mimeType = 'application/octet-stream';
  }

  // If not an image (e.g. video), return original base64
  if (!mimeType.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({ base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("Image compression timed out")), 15000);
    
    try {
      let img: ImageBitmap | HTMLImageElement;
      let width: number;
      let height: number;

      if (window.createImageBitmap) {
        img = await createImageBitmap(file);
        width = img.width;
        height = img.height;
      } else {
        // Fallback to Image element
        img = await new Promise<HTMLImageElement>((resolveImg, rejectImg) => {
          const image = new Image();
          const objectUrl = URL.createObjectURL(file);
          image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolveImg(image);
          };
          image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            rejectImg(new Error("Failed to load image"));
          };
          image.src = objectUrl;
        });
        width = img.width;
        height = img.height;
      }

      clearTimeout(timeoutId);

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Fill with white background to prevent transparent PNGs from turning black
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG with specified quality
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      
      if ('close' in img) {
        img.close(); // Free memory if it's an ImageBitmap
      }
      
      resolve({ base64, mimeType: 'image/jpeg' });
    } catch (error) {
      clearTimeout(timeoutId);
      // Fallback to original if image loading fails
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({ base64, mimeType });
      };
      reader.onerror = () => reject(new Error("Failed to read file fallback"));
      reader.readAsDataURL(file);
    }
  });
}
