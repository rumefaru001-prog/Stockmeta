import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Layers, Palette, Upload, Download, Sparkles, Droplet, Plus, Trash2, Loader2, Archive, Move, Square, Zap, AlertTriangle, Brain, Key, Settings, ChevronDown } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type BatchImage = {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl: string | null;
  status: 'idle' | 'processing' | 'success' | 'error';
};

const cropToContent = (blob: Blob): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      let hasContent = false;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 10) {
            hasContent = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      
      if (!hasContent) {
        resolve(blob);
        return;
      }
      
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      
      if (width <= 0 || height <= 0) {
        resolve(blob);
        return;
      }
      
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = width;
      cropCanvas.height = height;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) {
         resolve(blob); return;
      }
      
      cropCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
      
      cropCanvas.toBlob((croppedBlob) => {
        if (croppedBlob) {
          resolve(croppedBlob);
        } else {
          resolve(blob);
        }
      }, 'image/png');
    };
    img.onerror = () => resolve(blob);
    img.src = URL.createObjectURL(blob);
  });
};

interface BackgroundRemoverProps {
  user: any;
  apiKeys: string[];
  isPro: boolean;
  subscriptionEnabled: boolean;
  freeLimit: number;
  freeLimitType: 'daily' | 'monthly' | 'lifetime';
  processedCount: number;
  todayProcessedCount: number;
  monthlyProcessedCount: number;
  onShowPricing: () => void;
  onShowLogin: () => void;
  onShowApiSettings?: () => void;
  onGenerate: (count: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onGeneratingChange?: (generating: boolean) => void;
}

export function BackgroundRemover({
  user,
  apiKeys,
  isPro,
  subscriptionEnabled,
  freeLimit,
  freeLimitType,
  processedCount,
  todayProcessedCount,
  monthlyProcessedCount,
  onShowPricing,
  onShowLogin,
  onShowApiSettings,
  onGenerate,
  onDirtyChange,
  onGeneratingChange
}: BackgroundRemoverProps) {
  const [images, setImages] = useState<BatchImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Active sidebar tab
  const [activeTab, setActiveTab] = useState<'position' | 'background' | null>('position');
  
  // Settings state
  const [positionMode, setPositionMode] = useState<'original' | 'center' | 'custom'>('center');
  const [padding, setPadding] = useState(21);
  const [ignorePadding, setIgnorePadding] = useState(true);
  
  const [removeBg, setRemoveBg] = useState(true);
  const [bgColor, setBgColor] = useState('transparent');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [useAI, setUseAI] = useState(true); // Default to AI mode for better quality
  const [useDeepAnalysis, setUseDeepAnalysis] = useState(true); // Thinking mode
  const [precision, setPrecision] = useState<'standard' | 'ultra'>('ultra');
  const [keepShadows, setKeepShadows] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'inspect'>('inspect');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const processingCountRef = React.useRef(0);
  const MAX_CONCURRENT = useAI ? 5 : 3; // AI mode can handle more concurrent requests

  // Report dirty and generating state
  useEffect(() => {
    if (onDirtyChange) onDirtyChange(images.length > 0);
  }, [images.length, onDirtyChange]);

  useEffect(() => {
    if (onGeneratingChange) onGeneratingChange(isProcessingBatch);
  }, [isProcessingBatch, onGeneratingChange]);

  // Check for API Key
  useEffect(() => {
    if (apiKeys.length > 0) {
      setHasApiKey(true);
      return;
    }
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, [apiKeys]);

  const handleSelectKey = async () => {
    if (apiKeys.length > 0) {
      if (onShowApiSettings) onShowApiSettings();
      return true;
    }
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      return true;
    }
    return false;
  };

  const handleStartProcessing = async () => {
    if (useAI && !hasApiKey) {
      if (apiKeys.length > 0) {
        // This shouldn't happen because useEffect sets hasApiKey if apiKeys.length > 0
        setHasApiKey(true);
      } else {
        const selected = await handleSelectKey();
        if (!selected) {
          toast.error('Please select an API key to use AI features');
          return;
        }
      }
    }
    setIsProcessingBatch(true);
  };

  // Exit confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (images.length > 0) {
        const message = "You have images in the list. Leaving will delete all of them. Are you sure?";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [images]);

  const removeBackgroundWithAI = async (file: File, index: number): Promise<Blob> => {
    // Rotate keys if multiple are provided
    const activeKey = apiKeys.length > 0 
      ? apiKeys[index % apiKeys.length] 
      : process.env.GEMINI_API_KEY;
    
    const ai = new GoogleGenAI({ apiKey: activeKey });
    
    // Convert file to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
    
    const base64Data = await base64Promise;
    
    let subjectDescription = "";
    
    // Step 1: Deep Analysis (Thinking Mode) if enabled
    if (useDeepAnalysis) {
      try {
        const analysisResponse = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type,
              },
            },
            {
              text: 'Analyze this image and identify ALL primary subjects. Describe their exact shapes and locations. This information will be used to isolate them from the background. Be extremely precise.',
            },
          ],
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
          }
        });
        subjectDescription = analysisResponse.text || "";
      } catch (err) {
        console.warn("Deep analysis failed, proceeding with direct removal", err);
      }
    }
    
    // Step 2: High Quality Background Removal
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          },
          {
            text: `Carefully identify and isolate ALL primary subjects in this image${subjectDescription ? ` based on this analysis: ${subjectDescription}` : ''}. 
            Remove the background and all non-subject elements (including text, logos, watermarks, and secondary clutter) entirely. 
            Return ONLY the isolated subjects on a transparent background. 
            ${precision === 'ultra' ? 'Use ultra-high precision segmentation. Pay extreme attention to complex edges like hair, fur, or fine details. Ensure zero color bleed from the original background.' : 'Ensure clean and sharp edges.'}
            ${keepShadows ? 'Preserve the natural contact shadows of the subject to maintain realism.' : 'Remove all shadows and reflections.'}
            The output must be professional-grade with razor-sharp border detection. 
            No blurring, feathering, or artifacts allowed at the borders.`,
          },
        ],
      },
      config: {
        imageConfig: {
          imageSize: precision === 'ultra' ? "2K" : "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const binary = atob(part.inlineData.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: 'image/png' });
      }
    }
    
    throw new Error("AI failed to return an image");
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (!user && subscriptionEnabled) {
        onShowLogin();
        e.target.value = '';
        return;
      }

      const filesArray = Array.from(e.target.files);
      
      // Check limits
      if (images.length + filesArray.length > 100) {
        toast.error("Maximum 100 images allowed per batch.");
        e.target.value = '';
        return;
      }

      const currentUsage = freeLimitType === 'daily' 
        ? todayProcessedCount 
        : freeLimitType === 'monthly' 
          ? monthlyProcessedCount 
          : processedCount;
      if (subscriptionEnabled && !isPro && currentUsage + filesArray.length > freeLimit) {
        onShowPricing();
        e.target.value = '';
        return;
      }

      const newImages: BatchImage[] = filesArray.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        originalUrl: URL.createObjectURL(file),
        processedUrl: null,
        status: 'idle'
      }));
      
      setImages(prev => {
        const updated = [...prev, ...newImages];
        if (prev.length === 0) setSelectedIndex(0);
        return updated;
      });
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (!isProcessingBatch) return;

    const processNext = async (img: BatchImage) => {
      processingCountRef.current += 1;

      setImages(prev => {
        const newImgs = [...prev];
        const idx = newImgs.findIndex(i => i.id === img.id);
        if (idx !== -1) {
          newImgs[idx] = { ...newImgs[idx], status: 'processing' };
        }
        return newImgs;
      });

      try {
        if (!isProcessingBatch) throw new Error("Stopped");

        let blob;
        if (useAI) {
          try {
            const idx = images.findIndex(i => i.id === img.id);
            blob = await removeBackgroundWithAI(img.file, idx);
          } catch (aiErr) {
            console.warn("AI background removal failed, falling back to local...", aiErr);
            blob = await removeBackground(img.file);
          }
        } else {
          try {
            blob = await removeBackground(img.file, { model: 'isnet' });
          } catch (err) {
            console.warn("Default publicPath failed, trying fallback...", err);
            const config = {
              publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/',
              model: 'isnet' as const
            };
            blob = await removeBackground(img.file, config);
          }
        }
        
        if (!isProcessingBatch) throw new Error("Stopped");

        // Auto-crop to content bounds
        const croppedBlob = await cropToContent(blob);
        const processedUrl = URL.createObjectURL(croppedBlob);
        
        setImages(prev => {
          const newImgs = [...prev];
          const idx = newImgs.findIndex(i => i.id === img.id);
          if (idx !== -1) {
            newImgs[idx] = { ...newImgs[idx], processedUrl, status: 'success' };
          }
          return newImgs;
        });
        
        onGenerate(1);
      } catch (error) {
        if (error instanceof Error && error.message === "Stopped") {
          setImages(prev => {
            const newImgs = [...prev];
            const idx = newImgs.findIndex(i => i.id === img.id);
            if (idx !== -1) {
              newImgs[idx] = { ...newImgs[idx], status: 'idle' };
            }
            return newImgs;
          });
          return;
        }

        console.error("Error removing background:", error);
        setImages(prev => {
          const newImgs = [...prev];
          const idx = newImgs.findIndex(i => i.id === img.id);
          if (idx !== -1) {
            newImgs[idx] = { ...newImgs[idx], status: 'error' };
          }
          return newImgs;
        });
      } finally {
        processingCountRef.current -= 1;
        // Trigger a re-evaluation of the effect
        setImages(prev => [...prev]);
        
        // If no more idle images, stop batch processing
        const hasIdle = images.some(img => img.status === 'idle');
        if (!hasIdle && processingCountRef.current === 0) {
          setIsProcessingBatch(false);
        }
      }
    };

    const idleImages = images.filter(img => img.status === 'idle');
    const availableSlots = MAX_CONCURRENT - processingCountRef.current;
    
    if (idleImages.length > 0 && availableSlots > 0) {
      const toProcess = idleImages.slice(0, availableSlots);
      toProcess.forEach(img => {
        // Mark as processing immediately to prevent picking it up again in the next tick
        img.status = 'processing'; 
        processNext(img);
      });
    }
  }, [images, onGenerate, isProcessingBatch]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      // Find the index of the image being deleted to adjust selectedIndex correctly
      const deletedIndex = prev.findIndex(img => img.id === id);
      
      if (filtered.length === 0) {
        setSelectedIndex(0);
      } else if (deletedIndex === selectedIndex) {
        // If we deleted the currently selected image, select the next one (or previous if it was the last)
        setSelectedIndex(Math.min(selectedIndex, filtered.length - 1));
      } else if (deletedIndex < selectedIndex) {
        // If we deleted an image before the selected one, shift the index back
        setSelectedIndex(selectedIndex - 1);
      }
      return filtered;
    });
  };

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAll = () => {
    setImages([]);
    setSelectedIndex(0);
    setShowDeleteAllConfirm(false);
    toast.success("All images deleted");
  };

  const generateFinalImageBlob = async (img: BatchImage): Promise<Blob> => {
    const url = removeBg && img.processedUrl ? img.processedUrl : img.originalUrl;
    
    return new Promise((resolve, reject) => {
      const image = new Image();
      // Use a timeout to prevent hanging
      const timeout = setTimeout(() => {
        image.onload = null;
        image.onerror = null;
        reject(new Error("Image load timeout"));
      }, 15000);

      image.crossOrigin = "anonymous";
      image.onload = () => {
        clearTimeout(timeout);
        const canvas = document.createElement('canvas');
        // Use a reasonable max size to avoid memory issues
        const maxDim = 2048;
        let width = image.width;
        let height = image.height;
        
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }

        const size = Math.max(width, height);
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fetch(url).then(r => r.blob()).then(resolve).catch(reject);
          return;
        }

        // Draw background
        if (bgColor !== 'transparent' && bgColor !== 'gradient') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, size, size);
        } else if (bgColor === 'gradient') {
          const gradient = ctx.createLinearGradient(0, 0, size, size);
          gradient.addColorStop(0, '#6366f1');
          gradient.addColorStop(1, '#a855f7');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, size, size);
        }

        // Draw image
        if (positionMode === 'original') {
          const scale = Math.max(size / width, size / height);
          const w = width * scale;
          const h = height * scale;
          const x = (size - w) / 2;
          const y = (size - h) / 2;
          ctx.drawImage(image, x, y, w, h);
        } else {
          let drawWidth, drawHeight;
          if (padding >= 0) {
            const padPixels = (padding / 100) * size;
            const availableSize = size - (padPixels * 2);
            const scale = Math.min(availableSize / width, availableSize / height);
            drawWidth = width * scale;
            drawHeight = height * scale;
          } else {
            const scaleFactor = 1 + Math.abs(padding) / 50;
            const scale = Math.min(size / width, size / height) * scaleFactor;
            drawWidth = width * scale;
            drawHeight = height * scale;
          }
          const x = (size - drawWidth) / 2;
          const y = (size - drawHeight) / 2;
          ctx.drawImage(image, x, y, drawWidth, drawHeight);
        }

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, bgColor === 'transparent' ? 'image/png' : 'image/jpeg', 0.9);
      };
      image.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Failed to load image"));
      };
      image.src = url;
    });
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    
    const readyImages = images.filter(img => img.status === 'success' || img.status === 'idle');
    if (readyImages.length === 0) {
      toast.error("No images ready to download");
      return;
    }

    setIsDownloading(true);
    const toastId = toast.loading(`Preparing ${readyImages.length} images...`);
    
    try {
      const zip = new JSZip();
      let successCount = 0;
      
      for (let i = 0; i < readyImages.length; i++) {
        const img = readyImages[i];
        try {
          const blob = await generateFinalImageBlob(img);
          const ext = bgColor === 'transparent' ? 'png' : 'jpg';
          zip.file(`image-${i + 1}.${ext}`, blob);
          successCount++;
          toast.loading(`Processing image ${successCount}/${readyImages.length}...`, { id: toastId });
        } catch (err) {
          console.error(`Failed to process image ${i + 1}:`, err);
        }
      }
      
      if (successCount === 0) {
        throw new Error("Failed to process any images");
      }

      toast.loading("Generating zip file...", { id: toastId });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'batch-processed-images.zip');
      toast.success(`Successfully downloaded ${successCount} images`, { id: toastId });
    } catch (error) {
      console.error("Error zipping files:", error);
      toast.error("Failed to generate download", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#09090b] text-zinc-100 font-sans overflow-hidden rounded-2xl border border-white/10">
      {/* Icon Sidebar */}
      {images.length > 0 && (
        <div className="w-20 bg-zinc-900/80 border-r border-white/10 flex flex-col items-center py-6 gap-6 shrink-0 z-20">
          <button 
            onClick={() => setActiveTab(activeTab === 'position' ? null : 'position')}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${activeTab === 'position' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            <Move size={24} />
            <span className="text-[10px] font-medium">Position</span>
          </button>
          <button 
            onClick={() => setActiveTab(activeTab === 'background' ? null : 'background')}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${activeTab === 'background' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            <Layers size={24} />
            <span className="text-[10px] font-medium">Background</span>
          </button>
        </div>
      )}

      {/* Settings Panel */}
      {images.length > 0 && activeTab && (
        <div className="w-[300px] bg-zinc-900/50 border-r border-white/10 overflow-y-auto flex flex-col shrink-0 z-10 animate-in slide-in-from-left-10 duration-200">
          {activeTab === 'position' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Position</h2>
                <button onClick={() => setActiveTab(null)} className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
              
              {/* Segmented Control */}
              <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
                {['original', 'center', 'custom'].map(mode => (
                  <button 
                    key={mode}
                    onClick={() => setPositionMode(mode as any)}
                    className={`flex-1 py-2 px-3 flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all ${positionMode === mode ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <div className="w-5 h-5 mb-1 border-2 border-current rounded-sm flex items-center justify-center">
                      {mode === 'center' && <div className="w-1.5 h-1.5 bg-current rounded-sm" />}
                      {mode === 'custom' && <div className="w-2.5 h-2.5 border border-current rounded-sm" />}
                    </div>
                    <span className="capitalize">{mode}</span>
                  </button>
                ))}
              </div>
              
              {/* Padding Slider */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3 text-zinc-300">Padding / Scale</label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 h-1 bg-zinc-800 rounded-full flex items-center">
                    <div 
                      className="absolute h-1 bg-indigo-500 rounded-full" 
                      style={{ 
                        left: padding < 0 ? `${((padding + 50) / 100) * 100}%` : '50%',
                        right: padding > 0 ? `${100 - ((padding + 50) / 100) * 100}%` : '50%'
                      }} 
                    />
                    <input 
                      type="range" 
                      min="-50" max="50" 
                      value={padding} 
                      onChange={(e) => setPadding(Number(e.target.value))}
                      className="absolute w-full opacity-0 cursor-pointer h-6 -top-2.5"
                    />
                    <div 
                      className="absolute w-5 h-5 bg-white border border-zinc-200 rounded-full shadow-sm pointer-events-none" 
                      style={{ left: `calc(${((padding + 50) / 100) * 100}% - 10px)` }} 
                    />
                  </div>
                  <div className="w-16 px-2 py-1.5 border border-white/10 bg-black/20 rounded-lg text-center text-sm font-medium text-zinc-300">
                    {padding}%
                  </div>
                </div>
              </div>
              
              {/* Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer mb-6">
                <input 
                  type="checkbox" 
                  checked={ignorePadding} 
                  onChange={(e) => setIgnorePadding(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                />
                <span className="text-sm font-medium text-zinc-300">Ignore padding on cropped sides</span>
              </label>
            </div>
          )}

          {activeTab === 'background' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Background</h2>
                <button onClick={() => setActiveTab(null)} className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
              
              {/* Toggle */}
              <div className="flex items-center justify-between p-3 border border-white/10 bg-black/20 rounded-xl mb-6">
                <span className="text-sm font-medium text-zinc-300">Remove original backgrounds</span>
                <div className="relative inline-block w-11 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="toggle" 
                    checked={removeBg}
                    onChange={(e) => setRemoveBg(e.target.checked)}
                    className="switch-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer z-10 opacity-0"
                  />
                  <label htmlFor="toggle" className="switch-label block overflow-hidden h-6 rounded-full bg-zinc-700 cursor-pointer transition-colors duration-200 ease-in">
                    <span className="switch-button absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-200 ease-in"></span>
                  </label>
                </div>
              </div>
              
              {/* Standard Colors */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-400 mb-3">Color</label>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setBgColor('transparent')} className={`w-10 h-10 rounded-full border-2 ${bgColor === 'transparent' ? 'border-indigo-400' : 'border-white/20'} bg-checkerboard transition-all hover:scale-105`}></button>
                  <button onClick={() => setBgColor('#ffffff')} className={`w-10 h-10 rounded-full border-2 ${bgColor === '#ffffff' ? 'border-indigo-400' : 'border-white/20'} bg-white transition-all hover:scale-105`}></button>
                  <button onClick={() => setBgColor('#000000')} className={`w-10 h-10 rounded-full border-2 ${bgColor === '#000000' ? 'border-indigo-400' : 'border-white/20'} bg-black transition-all hover:scale-105`}></button>
                  <button onClick={() => setBgColor('gradient')} className={`w-10 h-10 rounded-full border-2 ${bgColor === 'gradient' ? 'border-indigo-400' : 'border-transparent'} bg-gradient-custom transition-all hover:scale-105`}></button>
                  <button className="w-10 h-10 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 transition-all hover:scale-105">
                    <Droplet size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Main Area */}
      <div className="flex-1 flex flex-col relative bg-black/20 overflow-hidden">
        
        {/* Topbar */}
        <div className="h-16 bg-zinc-900/50 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Modern Background Remover
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 font-mono">AI v4.0 Ultra</span>
            </h1>
            {images.length > 0 && (
              <span className="text-sm text-zinc-400 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                {images.length} / 100 images
              </span>
            )}
          </div>
          {images.length > 0 && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowDeleteAllConfirm(true)}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-all border border-red-500/20"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete All</span>
              </button>

              <label className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all border border-white/10 cursor-pointer">
                <Plus size={16} />
                <span className="hidden sm:inline">Add More</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
              </label>

              <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

              {isProcessingBatch ? (
                <button 
                  onClick={() => setIsProcessingBatch(false)}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <X size={18} />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              ) : (
                images.some(img => img.status === 'idle') && (
                  <button 
                    onClick={handleStartProcessing}
                    className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                  >
                    <Sparkles size={18} />
                    <span className="hidden sm:inline">Remove Background (AI)</span>
                  </button>
                )
              )}

              {/* Advanced Settings Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${showSettings ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}
                >
                  <Settings size={18} />
                  <span className="hidden lg:inline">Settings</span>
                  <ChevronDown size={14} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                </button>

                {showSettings && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowSettings(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Processing Mode</label>
                        <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                          <button 
                            onClick={() => setUseAI(true)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${useAI ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                          >
                            <Zap size={14} />
                            AI
                          </button>
                          <button 
                            onClick={() => setUseAI(false)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!useAI ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                          >
                            <Square size={14} />
                            Local
                          </button>
                        </div>
                      </div>

                      {useAI && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Precision Level</label>
                            <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                              <button 
                                onClick={() => setPrecision('standard')}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${precision === 'standard' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                              >
                                Standard
                              </button>
                              <button 
                                onClick={() => setPrecision('ultra')}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${precision === 'ultra' ? 'bg-indigo-500 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                              >
                                Ultra
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Enhancements</label>
                            <div className="grid grid-cols-1 gap-2">
                              <button 
                                onClick={() => setKeepShadows(!keepShadows)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${keepShadows ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Droplet size={14} />
                                  Keep Shadows
                                </div>
                                <div className={`w-2 h-2 rounded-full ${keepShadows ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-zinc-700'}`} />
                              </button>

                              <button 
                                onClick={() => setUseDeepAnalysis(!useDeepAnalysis)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${useDeepAnalysis ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Brain size={14} />
                                  Thinking Mode
                                </div>
                                <div className={`w-2 h-2 rounded-full ${useDeepAnalysis ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-zinc-700'}`} />
                              </button>
                            </div>
                          </div>

                          <button 
                            onClick={handleSelectKey}
                            className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-xs font-medium border border-white/5 transition-colors"
                          >
                            <Key size={14} />
                            {apiKeys.length > 0 ? 'Manage API Keys' : 'Change API Key'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={handleDownloadAll}
                disabled={isDownloading || images.some(img => img.status === 'processing')}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-white/5"
              >
                {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />}
                <span className="hidden sm:inline">{isDownloading ? 'Zipping...' : 'Download All'}</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Canvas Area (Grid or Inspect) */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {images.length > 0 ? (
            <>
              {/* Header inside canvas area */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-zinc-900/40 backdrop-blur-md z-20">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/10">
                  <button
                    onClick={() => setViewMode('inspect')}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${viewMode === 'inspect' ? 'bg-indigo-500 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
                  >
                    <Square size={14} />
                    Inspect Details
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
                  >
                    <Layers size={14} />
                    Batch Grid
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-white/10 text-xs">
                    <Plus size={14} />
                    Add More
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                  <button 
                    onClick={handleDeleteAll}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg font-medium transition-colors border border-red-500/20 text-xs"
                  >
                    <Trash2 size={14} />
                    Clear All
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-6 overflow-y-auto relative flex flex-col no-scrollbar">
                {viewMode === 'inspect' && images[selectedIndex] ? (
                  <div className="flex-1 flex flex-col h-full items-center justify-center">
                    <div className="relative w-full max-w-4xl h-full min-h-[400px] flex-1 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/40">
                      <div className="absolute inset-0 bg-checkerboard opacity-30 z-0 pointer-events-none" />
                      <div 
                        className="absolute inset-0 z-0 transition-colors pointer-events-none"
                        style={{ backgroundColor: bgColor !== 'transparent' && bgColor !== 'gradient' ? bgColor : undefined }}
                      >
                        {bgColor === 'gradient' && <div className="absolute inset-0 bg-gradient-custom opacity-50" />}
                      </div>

                      {images[selectedIndex].status === 'success' && removeBg && images[selectedIndex].processedUrl ? (
                         <ReactCompareSlider
                           className="w-full h-full z-10"
                           itemOne={
                             <ReactCompareSliderImage 
                               src={images[selectedIndex].originalUrl} 
                               alt="Original" 
                               style={{
                                 objectFit: positionMode === 'original' ? 'cover' : 'contain',
                                 objectPosition: positionMode === 'center' ? 'center' : 'initial',
                               }}
                             />
                           }
                           itemTwo={
                             <div className="w-full h-full relative" style={{
                                   backgroundColor: bgColor !== 'transparent' && bgColor !== 'gradient' ? bgColor : undefined
                                 }}>
                               {bgColor === 'gradient' && <div className="absolute inset-0 bg-gradient-custom" />}
                               <ReactCompareSliderImage 
                                 src={images[selectedIndex].processedUrl!} 
                                 alt="Removed Background" 
                                 style={{
                                   backgroundColor: 'transparent',
                                   objectFit: positionMode === 'original' ? 'cover' : 'contain',
                                   objectPosition: positionMode === 'center' ? 'center' : 'initial',
                                   padding: positionMode === 'center' && padding >= 0 ? `${padding}%` : '0',
                                   transform: positionMode === 'center' && padding < 0 ? `scale(${1 + Math.abs(padding) / 50})` : 'none'
                                 }}
                               />
                             </div>
                           }
                         />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
                          <img 
                            src={images[selectedIndex].originalUrl} 
                            alt={`Image ${selectedIndex + 1}`}
                            className="w-full h-full object-contain drop-shadow-2xl"
                          />
                        </div>
                      )}

                      {images[selectedIndex].status === 'processing' && removeBg && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-md z-30">
                          <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
                          <span className="text-sm font-bold tracking-wider uppercase text-indigo-300">Detailed Processing...</span>
                          <span className="text-xs text-zinc-400 mt-2">Isolating complex structures & hair</span>
                        </div>
                      )}
                      
                      {images[selectedIndex].status === 'error' && (
                        <div className="absolute inset-0 bg-red-500/10 flex flex-col items-center justify-center backdrop-blur-sm z-30">
                          <div className="bg-red-500 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-2">Error</div>
                          <span className="text-sm text-red-200">Failed to process this image.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    {images.map((img, idx) => (
                      <div 
                        key={img.id} 
                        onClick={() => { setSelectedIndex(idx); setViewMode('inspect'); }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${selectedIndex === idx ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                      >
                        <div className="absolute inset-0 bg-checkerboard opacity-50 z-0" />
                        <div 
                          className="absolute inset-0 z-10 transition-colors"
                          style={{ backgroundColor: bgColor !== 'transparent' && bgColor !== 'gradient' ? bgColor : undefined }}
                        >
                          {bgColor === 'gradient' && <div className="absolute inset-0 bg-gradient-custom" />}
                        </div>
                        
                        <img 
                          src={removeBg && img.processedUrl ? img.processedUrl : img.originalUrl} 
                          alt={`Image ${idx + 1}`}
                          className="absolute inset-0 w-full h-full z-20 transition-all duration-300"
                          style={{
                            objectFit: positionMode === 'original' ? 'cover' : 'contain',
                            objectPosition: positionMode === 'center' ? 'center' : 'initial',
                            padding: positionMode === 'center' && padding >= 0 ? `${padding}%` : '0',
                            transform: positionMode === 'center' && padding < 0 ? `scale(${1 + Math.abs(padding) / 50})` : 'none'
                          }}
                        />
                        
                        {/* Status Overlays */}
                        {img.status === 'processing' && removeBg && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-30">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                            <span className="text-xs font-medium text-indigo-300">Processing...</span>
                          </div>
                        )}
                        
                        {img.status === 'error' && (
                          <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center backdrop-blur-sm z-30">
                            <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-1">Error</div>
                            <span className="text-[10px] text-white text-center px-2 leading-tight">Failed</span>
                          </div>
                        )}
                        
                        {/* Delete Button */}
                        <button 
                          onClick={(e) => handleDelete(e, img.id)}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-40 backdrop-blur-md shadow-lg"
                        >
                          <Trash2 size={16} />
                        </button>
      
                        {/* Download Individual Button */}
                        {img.status === 'success' && (
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const blob = await generateFinalImageBlob(img);
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `processed-image-${idx + 1}.${bgColor === 'transparent' ? 'png' : 'jpg'}`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              } catch (err) {
                                console.error("Failed to download image", err);
                                toast.error("Failed to download image");
                              }
                            }}
                            className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-40 backdrop-blur-md shadow-lg"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        
                        {/* Success Indicator */}
                        {img.status === 'success' && removeBg && (
                          <div className="absolute bottom-2 left-2 w-6 h-6 bg-green-500/90 text-white rounded-full flex items-center justify-center shadow-sm z-40 backdrop-blur-sm">
                            <Sparkles size={12} />
                          </div>
                        )}
                        
                        {/* Image Name / ID */}
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-md text-[10px] font-medium text-white z-40">
                          IMG_{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Thumbnails Carousel (Only visible in inspect mode) */}
              {viewMode === 'inspect' && images.length > 1 && (
                 <div className="h-28 border-t border-white/10 bg-zinc-900/60 p-3 shrink-0 overflow-x-auto flex items-center gap-3 no-scrollbar z-20 relative">
                   {images.map((img, idx) => (
                      <div 
                        key={img.id} 
                        onClick={() => setSelectedIndex(idx)}
                        className={`relative h-full aspect-square rounded-xl overflow-hidden cursor-pointer transition-all shrink-0 ${selectedIndex === idx ? 'ring-2 ring-indigo-500 opacity-100 shadow-xl' : 'opacity-40 hover:opacity-100'}`}
                      >
                       <div className="absolute inset-0 bg-checkerboard opacity-50 z-0" />
                       <img 
                         src={removeBg && img.processedUrl ? img.processedUrl : img.originalUrl} 
                         alt=""
                         className="absolute inset-0 w-full h-full object-cover z-10"
                       />
                       {img.status === 'processing' && (
                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                           <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                         </div>
                       )}
                       {img.status === 'error' && (
                         <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center z-20">
                           <AlertTriangle className="w-5 h-5 text-red-500" />
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
              <label className="cursor-pointer group flex flex-col items-center justify-center w-[500px] h-[400px] border-[3px] border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20 hover:bg-zinc-800/40 hover:border-indigo-500/50 transition-all duration-300 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-500">
                  <Sparkles size={48} strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 transition-all">
                  Unleash the Magic
                </h3>
                <p className="text-zinc-400 font-medium mb-8 text-center max-w-[300px]">
                  Drop the toughest images here.<br/>AI will professionally isolate the subjects with ultra precision.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white bg-white/10 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">Batch Process up to 100</span>
                  <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 backdrop-blur-sm">Hair & Fur Ready</span>
                </div>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 text-red-400 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Delete All Images?</h3>
            </div>
            <p className="text-zinc-400 mb-6">
              This action cannot be undone. All uploaded and processed images will be permanently removed from the list.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteAll}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
