export interface MediaFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  metadata?: ImageMetadata;
  error?: string;
  originalType?: string;
  originalFileName?: string;
  originalFile?: File;
  videoFrames?: File[];
}

export interface ImageMetadata {
  title?: string;
  keywords?: string;
  description?: string;
  category?: string;
  rating?: number;
}

export interface GenerationSettings {
  platform: string[];
  titleLength: number;
  keywordsCount: number;
  singleWordKeywords: boolean;
  transparentBackground: boolean;
  negativeKeywords: string;
  descriptionLength: number;
  mediaTypeHint: string;
  apiKey: string;
  customPrompt?: string;
  exportMode?: "zip" | "individual";
}
