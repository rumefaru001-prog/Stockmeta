import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Copy, Check, Wand2, Loader2, X, Volume2, FileText, Download, Layout, Trash2, ChevronDown, Info, Square, FileCode, CheckCircle2, Edit2, Save, Video, Play, FileVideo } from 'lucide-react';
import { generatePrompt, generateSpeech, type PromptResult, type MediaItem } from '../services/gemini';
import { extractFramesFromVideo } from '../utils/video';
import toast from 'react-hot-toast';
import { CountdownOverlay } from './CountdownOverlay';

interface PromptGeneratorProps {
  mode: 'trending' | 'image';
  apiKeys: string[];
  user: any;
  isPro: boolean;
  subscriptionEnabled: boolean;
  freeLimit: number;
  freeLimitType: 'daily' | 'monthly' | 'lifetime';
  processedCount: number;
  todayProcessedCount: number;
  monthlyProcessedCount: number;
  onDirtyChange?: (isDirty: boolean) => void;
  onGenerate: (count: number) => void;
  onGeneratingChange?: (isGenerating: boolean) => void;
  onShowPricing: () => void;
  onShowLogin: () => void;
  onShowApiSettings?: () => void;
}

export function PromptGenerator({ 
  mode,
  apiKeys, 
  user,
  isPro, 
  subscriptionEnabled, 
  freeLimit, 
  freeLimitType, 
  processedCount, 
  todayProcessedCount, 
  monthlyProcessedCount,
  onDirtyChange,
  onGenerate,
  onGeneratingChange,
  onShowPricing,
  onShowLogin,
  onShowApiSettings
}: PromptGeneratorProps) {
  const [files, setFiles] = useState<MediaItem[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  
  const isTrendingMode = mode === 'trending';
  const isImageMode = mode === 'image';

  const [options, setOptions] = useState({
    category: isTrendingMode ? 'Trending & Upcoming Events (Auto)' : 'Image to Prompt',
    type: 'Auto',
    timeframe: '1 Month Ahead',
    promptLength: 800 as number | 'Auto',
    numPrompts: 6,
    style: 'Auto',
    lighting: 'Auto',
    additionalDirection: '',
    aiModel: 'General',
    whiteBackground: false
  });

  // Reset category when mode changes
  React.useEffect(() => {
    setOptions(prev => ({
      ...prev,
      category: isTrendingMode ? 'Trending & Upcoming Events (Auto)' : 'Image to Prompt'
    }));
    if (isTrendingMode) {
      setFiles([]);
      setPreviewUrls([]);
    }
  }, [mode, isTrendingMode]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [generatedPrompts, setGeneratedPrompts] = useState<PromptResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<PromptResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);
  const keyCooldownsRef = useRef<Record<string, number>>({});

  React.useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(files.length > 0 || generatedPrompts.length > 0);
    }
  }, [files.length, generatedPrompts.length, onDirtyChange]);

  const categories = [
    'Trending & Upcoming Events (Auto)',
    'Holidays & Celebrations',
    'Awareness & Social Causes',
    'Cultural & Religious Events',
    'Retail & E-commerce Seasons',
    'Seasonal & Weather',
    'Lifestyle & Wellness',
    'Food & Culinary Arts',
    'Cinematic & Movie Scenes',
    'Hyper-Realistic Portraits',
    'Fantasy & Sci-Fi Worlds',
    'Cyberpunk & Futuristic',
    'Anime & Manga Style',
    '3D Render & Isometric',
    'Product Photography',
    'Nature & Epic Landscapes',
    'Architecture & Interior Design',
    'Animals & Wildlife',
    'Abstract & Conceptual Art',
    'Vintage & Retro Aesthetics',
    'Minimalist & Clean Design',
    'Business & Corporate',
    'Technology & Innovation',
    'Fashion & Editorial',
    'Gaming & Esports',
    'Social Media & Pop Culture',
    'Medical & Healthcare',
    'Education & Learning',
    'Sports & Action',
    'Vehicles & Transportation',
    'Backgrounds & Textures',
    'Logos & Brand Identity (Unbranded)',
    'T-shirt Designs & Typography (No Text)',
    'Stickers & Decals',
    'Coloring Book Pages',
    'Tattoos & Line Art',
    'Patterns & Seamless Textures'
  ];

  const types = [
    'Photorealistic / Lifestyle Image',
    'Vector / Flat Illustration',
    'Conceptual / 3D Render',
    'Cinematic Motion Video',
    'Establishing / Aerial Video Shot',
    'Macro / Close-up Video',
    'Slow Motion / Time-lapse Video',
    'Drone / FPV Racing Shot',
    'Cinematic Drone Reveal',
    'FPV Nature / Landscape Fly-through',
    'Drone Real Estate / Architectural Tour',
    'FPV Urban / City Scape Dive',
    'Drone Industrial / Construction Site',
    'FPV Action / Sports Tracking',
    '3D Rendered Animation',
    'Isolated Object (White/Transparent BG)',
    'Digital Art / Painting',
    'Anime / Cel Shaded',
    'Concept Art',
    'Macro Photography'
  ];
  const timeframes = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const styles = ['Auto', 'Photographic', 'Artistic', 'Minimalist', 'Cinematic', 'Vintage', 'Cyberpunk', 'Hyper-realistic', 'Fantasy', 'Surreal'];
  const lightings = ['Auto', 'Studio', 'Natural', 'Cinematic', 'Soft', 'Hard', 'Golden Hour', 'Blue Hour', 'Moonlight', 'Neon', 'Volumetric'];
  const models = ['General', 'Flux', 'Midjourney', 'DALL-E', 'Stable Diffusion', 'Gemini'];

  const isTrendingCategory = options.category === 'Trending & Upcoming Events (Auto)';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const [showDownloadPopup, setShowDownloadPopup] = useState(false);

  const handleFiles = async (selectedFiles: File[]) => {
    if (!user) {
      onShowLogin();
      return;
    }

    const validFiles = selectedFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (validFiles.length === 0) {
      toast.error('Please upload image or video files only');
      return;
    }
    
    setIsProcessingVideo(true);
    const newMediaItems: MediaItem[] = [];
    const newUrls: string[] = [];

    try {
      for (const file of validFiles) {
        if (file.type.startsWith('video/')) {
          const frames = await extractFramesFromVideo(file, 3);
          newMediaItems.push({ type: 'video', file, frames });
          // Use the first frame as preview
          newUrls.push(URL.createObjectURL(frames[0]));
        } else {
          newMediaItems.push({ type: 'image', file });
          newUrls.push(URL.createObjectURL(file));
        }
      }

      const updatedFiles = [...files, ...newMediaItems].slice(0, 500);
      setFiles(updatedFiles);
      
      const updatedUrls = [...previewUrls, ...newUrls].slice(0, 500);
      setPreviewUrls(updatedUrls);
      setGeneratedPrompts([]);
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Failed to process some files');
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    const newUrls = [...previewUrls];
    newUrls.splice(index, 1);
    setPreviewUrls(newUrls);
  };

  const handleGenerate = async () => {
    if (!user) {
      onShowLogin();
      return;
    }

    if (user?.isBlocked) {
      toast.error('Your account is restricted. Cannot generate prompts.');
      return;
    }

    let currentUsage = processedCount;
    if (freeLimitType === 'daily') currentUsage = todayProcessedCount;
    if (freeLimitType === 'monthly') currentUsage = monthlyProcessedCount;

    const expectedCount = files.length > 0 ? files.length : options.numPrompts;

    if (subscriptionEnabled && !isPro && currentUsage + expectedCount > freeLimit) {
      toast.error(`Free limit reached (${freeLimit} generations). Please upgrade to Pro.`);
      onShowPricing();
      return;
    }

    if (apiKeys.length === 0) {
      toast.error("Please add at least 1 API key for processing.");
      if (onShowApiSettings) onShowApiSettings();
      return;
    }

    const AVAILABLE_MODELS = [
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite-preview",
      "gemini-flash-latest",
      "gemini-3.1-pro-preview"
    ];

    setIsGenerating(true);
    if (onGeneratingChange) onGeneratingChange(true);
    setGeneratedPrompts([]);
    setProgress({ current: 0, total: expectedCount });
    stopRef.current = false;
    keyCooldownsRef.current = {};

    const getAvailableResource = async () => {
      while (!stopRef.current) {
        let earliestCooldown = Infinity;
        let hasValidKeys = false;

        for (const key of apiKeys) {
          const keyCd = keyCooldownsRef.current[key] || 0;
          if (Date.now() < keyCd) {
            // If cooldown is < 1 hour, it's a temporary rate limit. We can wait for it.
            if (keyCd - Date.now() < 3600000) {
              hasValidKeys = true;
              if (keyCd < earliestCooldown) earliestCooldown = keyCd;
            }
            continue;
          }
          
          hasValidKeys = true;
          
          for (const model of AVAILABLE_MODELS) {
            const resourceId = `${key}:${model}`;
            const cd = keyCooldownsRef.current[resourceId] || 0;
            if (Date.now() > cd) {
              return { key, model, resourceId };
            }
            if (cd < earliestCooldown) earliestCooldown = cd;
          }
        }
        
        if (!hasValidKeys) {
           throw new Error("All API keys are invalid or exhausted for the day.");
        }
        
        const now = Date.now();
        if (earliestCooldown > now && earliestCooldown !== Infinity) {
           const waitTime = earliestCooldown - now;
           if (waitTime > 3600000) {
              throw new Error("All models for the provided API keys are restricted or invalid.");
           }
           toast.loading(`Rate limits reached. Pausing for ${Math.ceil(waitTime/1000)}s...`, { id: 'wait-toast', duration: waitTime });
           await new Promise(r => setTimeout(r, waitTime));
           toast.dismiss('wait-toast');
        } else {
           await new Promise(r => setTimeout(r, 1000));
        }
      }
      return null;
    };

    try {
      if (files.length > 0) {
        const pendingQueue = files.map((item, index) => ({ item, index }));
        const allPrompts: PromptResult[] = new Array(files.length);
        let successCount = 0;

        const worker = async () => {
          while (pendingQueue.length > 0 && !stopRef.current) {
            let currentUsageRef = processedCount + successCount;
            if (freeLimitType === 'daily') currentUsageRef = todayProcessedCount + successCount;
            if (freeLimitType === 'monthly') currentUsageRef = monthlyProcessedCount + successCount;

            if (subscriptionEnabled && !isPro && currentUsageRef >= freeLimit) {
              toast.error(`Free limit reached. Please upgrade to Pro.`);
              onShowPricing();
              break;
            }

            const batchSize = 5;
            const currentBatch: { item: MediaItem, index: number }[] = [];
            for (let i = 0; i < batchSize; i++) {
              const f = pendingQueue.shift();
              if (f) currentBatch.push(f);
            }
            
            if (currentBatch.length === 0) break;

            let success = false;
            let fileRetries = 0;
            const MAX_FILE_RETRIES = Math.max(5, apiKeys.length * AVAILABLE_MODELS.length);
            let lastErrorMsg = "";

            while (!success && fileRetries < MAX_FILE_RETRIES && !stopRef.current) {
              const resource = await getAvailableResource();
              if (!resource) break;

              try {
                const batchItems = currentBatch.map(b => b.item);
                const results = await generatePrompt(batchItems, options, resource.key, resource.model);
                
                if (stopRef.current) break;
                
                const validResults = Array.isArray(results) ? results : [];
                validResults.forEach((res, idx) => {
                  if (currentBatch[idx]) {
                    allPrompts[currentBatch[idx].index] = res;
                  }
                });
                
                const generatedCount = Math.min(validResults.length, currentBatch.length);
                successCount += currentBatch.length;
                onGenerate(generatedCount);
                setProgress({ current: successCount, total: files.length });
                setGeneratedPrompts([...allPrompts.filter(p => p !== undefined)]);
                success = true;
              } catch (error: any) {
                const errMsg = (error.message || "").toLowerCase();
                lastErrorMsg = error.message || "Unknown error";
                
                let parsedErrorMsg = lastErrorMsg;
                try {
                  const parsed = JSON.parse(lastErrorMsg);
                  if (parsed.error && parsed.error.message) {
                    parsedErrorMsg = parsed.error.message;
                  }
                } catch (e) {}
                lastErrorMsg = parsedErrorMsg;

                if (errMsg.includes("403") || errMsg.includes("permission") || errMsg.includes("not found")) {
                  keyCooldownsRef.current[resource.resourceId] = Date.now() + 24 * 60 * 60 * 1000;
                  if (errMsg.includes("referer") || errMsg.includes("origin")) {
                    toast.error(`API Key restricted. Please allow this website's URL in your Google Cloud Console.`, { id: `referer-${resource.key}` });
                  } else {
                    toast.error(`API Key lacks permission or model not found.`, { id: `perm-${resource.key}` });
                  }
                } else if (errMsg.includes("api_key") || errMsg.includes("api key") || errMsg.includes("unauthenticated")) {
                  keyCooldownsRef.current[resource.key] = Date.now() + 24 * 60 * 60 * 1000;
                  toast.error(`API Key ending in ...${resource.key.slice(-4)} is invalid or expired.`, { id: `invalid-${resource.key}` });
                } else if (errMsg.includes("quota") || errMsg.includes("exhausted") || errMsg.includes("429") || errMsg.includes("rate limit") || errMsg.includes("too many requests")) {
                  let cooldownTime = 60000; // Default 60s
                  const retryMatch = lastErrorMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
                  if (retryMatch && retryMatch[1]) {
                    cooldownTime = Math.ceil(parseFloat(retryMatch[1])) * 1000 + 2000; // Add 2s buffer
                  } else if (errMsg.includes("daily") || errMsg.includes("perday") || errMsg.includes("limit: 0")) {
                    cooldownTime = 24 * 60 * 60 * 1000; // 24 hours
                  }
                  
                  // Apply cooldown to the entire key if it's a quota issue, as it affects all models
                  keyCooldownsRef.current[resource.key] = Date.now() + cooldownTime;
                  
                  if (cooldownTime > 3600000) {
                    toast.error(`API Key quota exhausted. Please check your plan.`, { id: `quota-${resource.key}` });
                  } else {
                    toast.error(`Rate limit hit. Retrying soon...`, { id: `rate-${resource.key}` });
                  }
                } else if (errMsg.includes("503") || errMsg.includes("overloaded")) {
                  keyCooldownsRef.current[resource.resourceId] = Date.now() + 30000;
                } else if (errMsg.includes("invalid tool") || errMsg.includes("not supported")) {
                  keyCooldownsRef.current[resource.resourceId] = Date.now() + 24 * 60 * 60 * 1000;
                } else {
                  console.error("Unknown API error:", error);
                  toast.error(`API Error: ${lastErrorMsg.substring(0, 100)}`, { id: `unknown-${resource.resourceId}` });
                  keyCooldownsRef.current[resource.resourceId] = Date.now() + 10000; // 10s cooldown for unknown errors to prevent infinite loops but allow quick retry
                }
                
                fileRetries++;
              }
            }
            
            if (!success && !stopRef.current) {
              toast.error(`Failed after ${fileRetries} retries. Last error: ${lastErrorMsg}`);
            }
          }
        };

        const CONCURRENCY = Math.min(15, apiKeys.length * 3);
        const workers = Array(CONCURRENCY).fill(0).map(() => worker());
        await Promise.all(workers);

        if (allPrompts.filter(p => p !== undefined).length > 0 && !stopRef.current) {
          toast.success('Generation complete!');
          setShowDownloadPopup(true);
        }
      } else {
        // No files, generate multiple prompts in one go
        let success = false;
        let fileRetries = 0;
        const MAX_FILE_RETRIES = Math.max(5, apiKeys.length * AVAILABLE_MODELS.length);
        let lastErrorMsg = "";

        while (!success && fileRetries < MAX_FILE_RETRIES && !stopRef.current) {
          const resource = await getAvailableResource();
          if (!resource) break;

          try {
            const prompts = await generatePrompt([], options, resource.key, resource.model);
            if (!stopRef.current) {
              const validPrompts = Array.isArray(prompts) ? prompts : [];
              setGeneratedPrompts(validPrompts);
              onGenerate(validPrompts.length);
              toast.success('Prompts generated successfully!');
              setShowDownloadPopup(true);
            }
            success = true;
          } catch (error: any) {
            const errMsg = (error.message || "").toLowerCase();
            lastErrorMsg = error.message || "Unknown error";
            
            let parsedErrorMsg = lastErrorMsg;
            try {
              const parsed = JSON.parse(lastErrorMsg);
              if (parsed.error && parsed.error.message) {
                parsedErrorMsg = parsed.error.message;
              }
            } catch (e) {}
            lastErrorMsg = parsedErrorMsg;

            if (errMsg.includes("403") || errMsg.includes("permission") || errMsg.includes("not found")) {
              keyCooldownsRef.current[resource.resourceId] = Date.now() + 24 * 60 * 60 * 1000;
              if (errMsg.includes("referer") || errMsg.includes("origin")) {
                toast.error(`API Key restricted. Please allow this website's URL in your Google Cloud Console.`, { id: `referer-${resource.key}` });
              } else {
                toast.error(`API Key lacks permission or model not found.`, { id: `perm-${resource.key}` });
              }
            } else if (errMsg.includes("api_key") || errMsg.includes("api key") || errMsg.includes("unauthenticated")) {
              keyCooldownsRef.current[resource.key] = Date.now() + 24 * 60 * 60 * 1000;
              toast.error(`API Key ending in ...${resource.key.slice(-4)} is invalid or expired.`, { id: `invalid-${resource.key}` });
            } else if (errMsg.includes("quota") || errMsg.includes("exhausted") || errMsg.includes("429") || errMsg.includes("rate limit") || errMsg.includes("too many requests")) {
              let cooldownTime = 60000; // Default 60s
              const retryMatch = lastErrorMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
              if (retryMatch && retryMatch[1]) {
                cooldownTime = Math.ceil(parseFloat(retryMatch[1])) * 1000 + 2000; // Add 2s buffer
              } else if (errMsg.includes("daily") || errMsg.includes("perday") || errMsg.includes("limit: 0")) {
                cooldownTime = 24 * 60 * 60 * 1000; // 24 hours
              }
              
              // Apply cooldown to the entire key if it's a quota issue, as it affects all models
              keyCooldownsRef.current[resource.key] = Date.now() + cooldownTime;
              
              if (cooldownTime > 3600000) {
                toast.error(`API Key quota exhausted. Please check your plan.`, { id: `quota-${resource.key}` });
              } else {
                toast.error(`Rate limit hit. Retrying soon...`, { id: `rate-${resource.key}` });
              }
            } else if (errMsg.includes("503") || errMsg.includes("overloaded")) {
              keyCooldownsRef.current[resource.resourceId] = Date.now() + 30000;
            } else if (errMsg.includes("invalid tool") || errMsg.includes("not supported")) {
              keyCooldownsRef.current[resource.resourceId] = Date.now() + 24 * 60 * 60 * 1000;
            } else {
              console.error("Unknown API error:", error);
              toast.error(`API Error: ${lastErrorMsg.substring(0, 100)}`, { id: `unknown-${resource.resourceId}` });
              keyCooldownsRef.current[resource.resourceId] = Date.now() + 10000; // 10s cooldown for unknown errors to prevent infinite loops but allow quick retry
            }
            
            fileRetries++;
          }
        }
        
        if (!success && !stopRef.current) {
          throw new Error(`Failed after ${fileRetries} retries. Last error: ${lastErrorMsg}`);
        }
      }
    } catch (error: any) {
      if (stopRef.current) {
        toast.error('Generation stopped');
      } else {
        toast.error(error.message || 'Failed to generate prompts');
      }
    } finally {
      setIsGenerating(false);
      if (onGeneratingChange) onGeneratingChange(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleCancelGenerate = () => {
    stopRef.current = true;
    setIsGenerating(false);
    if (onGeneratingChange) onGeneratingChange(false);
    toast.error('Generation stopped');
  };

  const handleCopy = (result: PromptResult, index: number) => {
    navigator.clipboard.writeText(result.prompt);
    setCopiedIndex(index);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValues({ ...generatedPrompts[index] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditValues(null);
  };

  const saveEditing = (index: number) => {
    if (editValues) {
      const newPrompts = [...generatedPrompts];
      newPrompts[index] = editValues;
      setGeneratedPrompts(newPrompts);
      toast.success('Prompt updated!');
    }
    setEditingIndex(null);
    setEditValues(null);
  };

  const exportAsText = () => {
    const text = generatedPrompts.map(p => p.prompt).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompts.txt';
    a.click();
  };

  const exportAsCSV = () => {
    const csv = 'Index,Prompt\n' + generatedPrompts.map((p, i) => {
      const prompt = `"${p.prompt.replace(/"/g, '""')}"`;
      return `${i + 1},${prompt}`;
    }).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompts.csv';
    a.click();
  };

  return (
    <>
      <CountdownOverlay 
        isVisible={isProcessingVideo} 
        message="Extracting frames from video..." 
        estimatedSeconds={5} 
      />
      <CountdownOverlay 
        isVisible={isGenerating} 
        message={`Generating ${options.numPrompts} prompts...`} 
        estimatedSeconds={15} 
      />
      <div className="max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-6 pb-20 px-4">
      {/* Left Sidebar: Options */}
      <aside className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-700">
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.2)] border border-[var(--border)] sticky top-24 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              {isTrendingMode ? <Wand2 className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1">PROMPT ENGINE</p>
              <h2 className="text-lg font-black text-[var(--text)] tracking-tight leading-none">
                {isTrendingMode ? 'Trending Items Prompt' : 'Image to Prompt'}
              </h2>
              <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                {isTrendingMode ? 'Trending Item Prompt' : 'Media Analysis Engine'}
              </p>
              {apiKeys.length > 0 ? (
                <div className="flex items-center gap-1 mt-1.5 text-[7px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 w-fit">
                  <CheckCircle2 className="w-2 h-2" />
                  API KEY CONNECTED
                </div>
              ) : (
                <button 
                  onClick={onShowApiSettings}
                  className="flex items-center gap-1 mt-1.5 text-[7px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/20 w-fit hover:bg-rose-500/20 transition-all animate-pulse"
                >
                  <X className="w-2 h-2" />
                  API KEY REQUIRED
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar max-h-[calc(100vh-350px)] pr-1">
            {/* Category */}
            {isTrendingMode && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Category / Niche</label>
                <div className="relative group/select">
                  <select
                    value={options.category}
                    onChange={(e) => setOptions({ ...options, category: e.target.value })}
                    className="w-full bg-[var(--text)]/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer font-bold text-xs hover:bg-[var(--text)]/[0.07] [&>option]:bg-[var(--bg)]"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover/select:text-indigo-400 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Timeframe (Only for Trending Events) */}
            {isTrendingMode && isTrendingCategory && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Target Timeframe
                </label>
                <div className="relative group/select">
                  <select
                    value={options.timeframe}
                    onChange={(e) => setOptions({ ...options, timeframe: e.target.value })}
                    className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-3 py-2 text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer font-bold text-xs hover:bg-indigo-500/10 [&>option]:bg-[var(--bg)]"
                  >
                    {timeframes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Image Upload Trigger (Only for Image Mode) */}
            {isImageMode && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Add Media
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingVideo}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all group"
                >
                  {isProcessingVideo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Media</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden" 
                  multiple 
                  accept="image/*,video/*"
                />
              </div>
            )}

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Type</label>
              {isImageMode ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--text)]/5 border border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text)]">Auto</span>
                  </div>
                  <div className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[7px] font-black text-indigo-400 uppercase tracking-widest">
                    Locked
                  </div>
                </div>
              ) : (
                <div className="relative group/select">
                  <select
                    value={options.type}
                    onChange={(e) => setOptions({ ...options, type: e.target.value })}
                    className="w-full bg-[var(--text)]/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer font-bold text-xs hover:bg-[var(--text)]/10 [&>option]:bg-[var(--bg)]"
                  >
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover/select:text-indigo-400 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>

            {/* White Background Toggle (Only for Image Mode) */}
            {isImageMode && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--text)]/5 border border-[var(--border)] hover:border-indigo-500/30 transition-all group">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                  options.whiteBackground 
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                    : 'bg-[var(--text)]/5 border-[var(--border)] text-[var(--text-muted)]'
                }`}>
                  <Layout className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-[var(--text)] uppercase tracking-widest">White Background</p>
                  <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Isolated on pure white</p>
                </div>
              </div>
              <button
                onClick={() => setOptions({ ...options, whiteBackground: !options.whiteBackground })}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  options.whiteBackground ? 'bg-indigo-600' : 'bg-[var(--text)]/10'
                }`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                  options.whiteBackground ? 'left-6 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-1'
                }`} />
              </button>
            </div>
            )}

            {/* Prompt Length & Number of Prompts */}
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Prompt Length</label>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--text)]/5 border border-[var(--border)]">
                    <button
                      onClick={() => setOptions({ ...options, promptLength: 800 })}
                      className={`px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest transition-all ${
                        options.promptLength !== 'Auto' 
                          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      CHARS
                    </button>
                    <button
                      onClick={() => setOptions({ ...options, promptLength: 'Auto' })}
                      className={`px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest transition-all ${
                        options.promptLength === 'Auto' 
                          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      AUTO
                    </button>
                  </div>
                </div>
                {options.promptLength !== 'Auto' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-indigo-400">{options.promptLength} Chars</span>
                      <span className="text-[8px] text-[var(--text-muted)] font-medium">100 - 2000</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={options.promptLength as number}
                      onChange={(e) => setOptions({ ...options, promptLength: parseInt(e.target.value) })}
                      className="w-full h-1 bg-[var(--text)]/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                )}
              </div>

              {files.length === 0 && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Number of Prompts</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={options.numPrompts}
                      onChange={(e) => setOptions({ ...options, numPrompts: parseInt(e.target.value) || 1 })}
                      className="w-full bg-[var(--text)]/5 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-all font-bold text-xs"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest pointer-events-none">
                      Prompts
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Direction */}
            {files.length === 0 && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Creative Vision</label>
                <textarea
                  value={options.additionalDirection}
                  onChange={(e) => setOptions({ ...options, additionalDirection: e.target.value })}
                  placeholder="Describe your vision... (e.g. futuristic city, no people, centered)"
                  className="w-full bg-[var(--text)]/5 border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-all h-20 resize-none font-medium leading-relaxed placeholder:text-[var(--text-muted)]/40"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-auto">
            {isGenerating && progress.total > 0 && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Processing {progress.current} of {progress.total}</span>
                  <span className="text-[9px] font-black text-indigo-400">{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="h-1 w-full bg-[var(--text)]/5 rounded-full overflow-hidden border border-[var(--border)]">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={isGenerating ? handleCancelGenerate : handleGenerate}
              className={`w-full h-10 rounded-xl font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 shadow-lg text-[9px] border border-white/10 group relative overflow-hidden ${
                isGenerating 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  STOP PROCESS
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                  GENERATE PROMPTS
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Right Column: Upload & Results */}
      <div className="flex-1 flex flex-col gap-8 min-w-0 animate-in fade-in slide-in-from-right-4 duration-700">
        {/* Landing Area for Image Mode when no results */}
        {isImageMode && generatedPrompts.length === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Image Mode Landing / Upload Area */}
            <div className="bg-[var(--card-bg)] rounded-3xl p-8 border border-[var(--border)] shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32" />
              
              <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto py-12">
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-black text-[var(--text)] tracking-tight mb-4">
                  Image to Prompt
                </h1>
                <p className="text-[var(--text-muted)] font-medium leading-relaxed mb-8">
                  Upload your reference images or videos. Our AI will analyze the composition, lighting, style, and subjects to generate professional, microstock-optimized prompts.
                </p>

                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full max-w-md p-10 border-2 border-dashed rounded-3xl transition-all duration-500 group/drop ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-500/10 scale-105' 
                      : 'border-[var(--border)] bg-[var(--text)]/5 hover:border-indigo-500/30 hover:bg-[var(--text)]/[0.07]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover/drop:rotate-12 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-[var(--text)] uppercase tracking-widest">Drop files here</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">or click to browse images & videos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Previews Section */}
            {previewUrls.length > 0 && (
              <div className="bg-[var(--card-bg)] rounded-3xl p-6 border border-[var(--border)] shadow-[0_0_40px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <Layout className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[var(--text)] uppercase tracking-widest">Reference Media</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{files.length} items uploaded</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setFiles([]); setPreviewUrls([]); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {files.map((item, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--border)] group bg-black/20">
                      <img src={previewUrls[i]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {item.type === 'video' ? (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500 text-[8px] font-black text-white uppercase tracking-widest">
                                <Video className="w-2 h-2" />
                                Video
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500 text-[8px] font-black text-white uppercase tracking-widest">
                                <ImageIcon className="w-2 h-2" />
                                Image
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                            className="w-6 h-6 rounded-lg bg-rose-500 flex items-center justify-center text-white hover:bg-rose-600 transition-colors shadow-lg"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {item.type === 'video' && item.frames && (
                        <div className="absolute top-2 left-2 flex gap-1">
                          {item.frames.map((_, idx) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/50 border border-black/20" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {files.length < 500 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[var(--border)] hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all aspect-square group"
                    >
                      <Upload className="w-8 h-8 text-[var(--text-muted)] group-hover:text-indigo-400 transition-colors" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trending Placeholder (Only for Trending Mode when no results) */}
        {isTrendingMode && generatedPrompts.length === 0 && (
          <div className="bg-[var(--card-bg)] rounded-3xl p-12 border border-[var(--border)] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
            <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center mb-8 text-indigo-400 border border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] animate-pulse">
              <Wand2 className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black text-[var(--text)] mb-4 tracking-tight">Trending Items Prompt</h3>
            <p className="text-lg text-[var(--text-muted)] font-medium max-w-lg leading-relaxed">
              AI will research upcoming events and microstock trends to generate highly detailed, commercially viable prompts for you.
            </p>
            <div className="mt-10 flex items-center gap-4 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/5 px-6 py-3 rounded-2xl border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
              Ready to research & generate
            </div>
          </div>
        )}

        {/* Results Section */}
        {generatedPrompts.length > 0 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center justify-between bg-[var(--card-bg)] p-3 rounded-[2rem] border border-[var(--border)] shadow-xl">
              <div className="flex items-center gap-3 px-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Layout className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[var(--text)] tracking-tight">Generated Prompts</h3>
              </div>
              
              <div className="flex items-center gap-2 pr-2">
                <button 
                  onClick={() => {
                    const text = generatedPrompts.map(p => p.prompt).join('\n\n');
                    navigator.clipboard.writeText(text);
                    toast.success('All prompts copied!');
                  }} 
                  className="p-2.5 rounded-xl bg-[var(--text)]/5 hover:bg-[var(--text)]/10 text-[var(--text-muted)] transition-all border border-[var(--border)]" 
                  title="Copy All"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={exportAsCSV} 
                  className="p-2.5 rounded-xl bg-[var(--text)]/5 hover:bg-[var(--text)]/10 text-[var(--text-muted)] transition-all border border-[var(--border)] group relative" 
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">CSV FORMAT</span>
                </button>
                <button 
                  onClick={exportAsText} 
                  className="p-2.5 rounded-xl bg-[var(--text)]/5 hover:bg-[var(--text)]/10 text-[var(--text-muted)] transition-all border border-[var(--border)] group relative" 
                  title="Export TXT"
                >
                  <FileCode className="w-4 h-4" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">TEXT FORMAT</span>
                </button>
                <button 
                  onClick={() => setGeneratedPrompts([])} 
                  className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all border border-rose-500/20" 
                  title="Clear All"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {generatedPrompts.map((prompt, index) => (
                <div 
                  key={index} 
                  className="group relative bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 hover:border-indigo-500/40 transition-all duration-300 shadow-xl overflow-hidden"
                >
                  <div className="flex gap-4 relative z-10">
                    {files.length > 0 && previewUrls[index] ? (
                      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-[var(--border)] shadow-lg sticky top-0">
                        <img src={previewUrls[index]} alt={`Reference ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm border border-indigo-500/20">
                        {index + 1}
                      </div>
                    )}
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">PROMPT {index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingIndex === index ? (
                            <>
                              <button
                                onClick={() => saveEditing(index)}
                                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(index)}
                                className="p-2 rounded-xl bg-[var(--text)]/5 text-[var(--text-muted)] hover:text-indigo-400 transition-all border border-[var(--border)]"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCopy(prompt, index)}
                                className={`p-2 rounded-xl transition-all border border-[var(--border)] ${
                                  copiedIndex === index ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-[var(--text)]/5 text-[var(--text-muted)] hover:text-indigo-400'
                                }`}
                                title="Copy Prompt"
                              >
                                {copiedIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingIndex === index ? (
                        <div className="flex flex-col gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Prompt</label>
                            <textarea
                              value={editValues?.prompt}
                              onChange={(e) => setEditValues(prev => prev ? ({ ...prev, prompt: e.target.value }) : null)}
                              className="w-full bg-[var(--text)]/5 border border-[var(--border)] rounded-xl px-4 py-3 text-xs text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-all h-40 resize-none font-medium leading-relaxed"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">Prompt</label>
                            <div className="bg-[var(--text)]/5 rounded-2xl p-4 border border-[var(--border)]">
                              <p className="text-[var(--text)] leading-relaxed text-xs font-medium">{prompt.prompt}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Download Popup */}
      {showDownloadPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[var(--card-bg)] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-[var(--text)] mb-2 tracking-tight">Generation Complete!</h3>
            <p className="text-[var(--text-muted)] text-sm mb-8 font-medium leading-relaxed">
              Your prompts are ready. You can now download them in CSV or Text format.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  exportAsCSV();
                  setShowDownloadPopup(false);
                }}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 text-xs"
              >
                <FileText className="w-4 h-4" />
                DOWNLOAD CSV
              </button>
              <button
                onClick={() => {
                  exportAsText();
                  setShowDownloadPopup(false);
                }}
                className="flex items-center justify-center gap-2 bg-[var(--text)]/10 hover:bg-[var(--text)]/20 text-[var(--text)] font-black py-3 rounded-2xl transition-all border border-[var(--border)] text-xs"
              >
                <FileCode className="w-4 h-4" />
                DOWNLOAD TXT
              </button>
            </div>
            <button
              onClick={() => setShowDownloadPopup(false)}
              className="w-full py-3 text-[var(--text-muted)] font-bold text-xs hover:text-[var(--text)] transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
