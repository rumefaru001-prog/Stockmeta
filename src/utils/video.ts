
/**
 * Extracts a specific number of frames from a video file at regular intervals.
 * @param file The video file to extract frames from.
 * @param frameCount The number of frames to extract.
 * @returns A promise that resolves to an array of Files (images).
 */
export async function extractFramesFromVideo(file: File, frameCount: number = 3): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Video processing timeout'));
    }, 15000);

    video.onloadedmetadata = () => {
      let duration = video.duration;
      if (!duration || isNaN(duration) || duration === Infinity) {
        duration = 5; // Fallback duration
      }
      const frames: File[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        clearTimeout(timeout);
        reject(new Error('Could not get canvas context'));
        return;
      }

      let framesCaptured = 0;
      const interval = duration / (frameCount + 1);

      const captureFrame = (time: number) => {
        video.currentTime = time;
      };

      video.onseeked = async () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
        if (blob) {
          const frameFile = new File([blob], `frame_${framesCaptured}.jpg`, { type: 'image/jpeg' });
          frames.push(frameFile);
        }

        framesCaptured++;
        if (framesCaptured < frameCount) {
          captureFrame(interval * (framesCaptured + 1));
        } else {
          clearTimeout(timeout);
          URL.revokeObjectURL(video.src);
          resolve(frames);
        }
      };

      video.onerror = (e) => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        reject(e);
      };

      // Start capturing first frame
      captureFrame(interval);
    };

    video.onerror = (e) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(video.src);
      reject(e);
    };
  });
}
