import React, { useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { Cloud, UploadCloud, Loader2, ImagePlus, FolderOpen, AlertTriangle, ExternalLink, X, HelpCircle } from "lucide-react";
import { MediaFile } from "../types";
import { extractThumbnail, extractVideoFrame, extractMultipleVideoFrames } from "../utils/image";
import { CountdownOverlay } from "./CountdownOverlay";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

interface FileUploadProps {
  onFilesSelected: (files: MediaFile[], dirHandle?: any) => void;
  isGenerating?: boolean;
  compact?: boolean;
  pendingCount?: number;
}

export interface FileUploadRef {
  handleGlobalDrop: (e: DragEvent) => void;
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ onFilesSelected, isGenerating = false, compact = false, pendingCount = 0 }, ref) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);

  useImperativeHandle(ref, () => ({
    handleGlobalDrop: async (e: DragEvent) => {
      if (isGenerating || isProcessing) return;
      
      setIsProcessing(true);
      const files: File[] = [];
      let detectedDirHandle: any = null;
      
      if (e.dataTransfer?.items) {
        const promises = [];
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i];
          if (item.kind === 'file') {
            // Try to detect a directory handle for auto-saving direct replacement
            if (typeof (item as any).getAsFileSystemHandle === 'function') {
              try {
                const handle = await (item as any).getAsFileSystemHandle();
                if (handle && handle.kind === 'directory') {
                  detectedDirHandle = handle;
                }
              } catch (err) {
                console.warn("Failed to get directory handle from dropped item:", err);
              }
            }

            const entry = item.webkitGetAsEntry?.() || (item as any).getAsEntry?.();
            if (entry) {
              promises.push(traverseFileTree(entry));
            } else {
              const file = item.getAsFile();
              if (file) files.push(file);
            }
          }
        }
        const results = await Promise.all(promises);
        results.forEach(result => files.push(...result));
      } else if (e.dataTransfer?.files) {
        files.push(...Array.from(e.dataTransfer.files) as File[]);
      }
      
      if (files.length > 0) {
        processFiles(files, detectedDirHandle);
      } else {
        setIsProcessing(false);
      }
    }
  }));

  const processFiles = async (files: File[], dirHandle?: any) => {
    setIsProcessing(true);
    const mediaFiles: MediaFile[] = [];

    for (const file of files) {
      const isEpsOrAi = file.name.toLowerCase().endsWith('.eps') || file.name.toLowerCase().endsWith('.ai');
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith("image/") || file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
      
      if (!isEpsOrAi && !isVideo && !isImage) continue;

      // Convert disk connection based File (which expires/revokes permissions) into a memory-backed File
      let cachedFile = file;
      try {
        const buffer = await file.arrayBuffer();
        cachedFile = new File([buffer], file.name, {
          type: file.type || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'),
          lastModified: file.lastModified
        });
      } catch (err) {
        console.error("Failed to read file into memory immediately:", err);
      }

      if (isEpsOrAi) {
        const thumbnail = await extractThumbnail(cachedFile);
        if (thumbnail) {
          mediaFiles.push({
            id: Math.random().toString(36).substring(7),
            file: thumbnail, // Use the extracted JPG for metadata generation
            previewUrl: URL.createObjectURL(thumbnail),
            status: "pending",
            originalType: "vector",
            originalFileName: cachedFile.name,
            originalFile: cachedFile,
          });
        } else {
          // If we couldn't extract a thumbnail, we can't process it with Gemini
          console.warn(`Could not extract preview from ${cachedFile.name}. Please ensure the file was saved with PDF compatibility or embedded thumbnails.`);
        }
      } else if (isVideo) {
        const frames = await extractMultipleVideoFrames(cachedFile, 2);
        if (frames && frames.length > 0) {
          mediaFiles.push({
            id: Math.random().toString(36).substring(7),
            file: frames[0], // Use the first frame for preview
            previewUrl: URL.createObjectURL(frames[0]),
            status: "pending",
            originalType: "video",
            originalFileName: cachedFile.name,
            originalFile: cachedFile,
            videoFrames: frames,
          });
        } else {
          console.warn(`Could not extract frames from video ${cachedFile.name}.`);
        }
      } else if (isImage) {
        mediaFiles.push({
          id: Math.random().toString(36).substring(7),
          file: cachedFile,
          previewUrl: URL.createObjectURL(cachedFile),
          status: "pending",
          originalType: "image",
          originalFileName: cachedFile.name,
          originalFile: cachedFile,
        });
      }
    }

    if (mediaFiles.length > 0) {
      onFilesSelected(mediaFiles, dirHandle);
    }
    setIsProcessing(false);
  };

  const traverseFileTree = async (item: any, path = ''): Promise<File[]> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          resolve([file]);
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const entries: any[] = [];
        
        const readEntries = () => {
          dirReader.readEntries(async (results: any[]) => {
            if (!results.length) {
              const files: File[] = [];
              for (const entry of entries) {
                const entryFiles = await traverseFileTree(entry, path + item.name + '/');
                files.push(...entryFiles);
              }
              resolve(files);
            } else {
              entries.push(...results);
              readEntries();
            }
          });
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
  };

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isGenerating || isProcessing) return;
      
      setIsProcessing(true);
      const files: File[] = [];
      let detectedDirHandle: any = null;
      
      if (e.dataTransfer.items) {
        const promises = [];
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i];
          if (item.kind === 'file') {
            // Try to detect a directory handle for auto-saving direct replacement
            if (typeof (item as any).getAsFileSystemHandle === 'function') {
              try {
                const handle = await (item as any).getAsFileSystemHandle();
                if (handle && handle.kind === 'directory') {
                  detectedDirHandle = handle;
                }
              } catch (err) {
                console.warn("Failed to get directory handle from dropped item:", err);
              }
            }

            const entry = item.webkitGetAsEntry?.() || (item as any).getAsEntry?.();
            if (entry) {
              promises.push(traverseFileTree(entry));
            } else {
              const file = item.getAsFile();
              if (file) files.push(file);
            }
          }
        }
        const results = await Promise.all(promises);
        results.forEach(result => files.push(...result));
      } else {
        files.push(...Array.from(e.dataTransfer.files) as File[]);
      }
      
      if (files.length > 0) {
        processFiles(files, detectedDirHandle);
      } else {
        setIsProcessing(false);
      }
    },
    [isGenerating, isProcessing]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isGenerating && !isProcessing) {
      setIsDragging(true);
    }
  }, [isGenerating, isProcessing]);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGenerating || isProcessing) return;
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      processFiles(files);
    }
    // Reset input so the same files can be selected again if needed
    e.target.value = '';
  };

  const handleSelectFolder = async () => {
    if (isGenerating || isProcessing) return;
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      const files: File[] = [];
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          files.push(file);
        }
      }
      processFiles(files, dirHandle);
    } catch (err: any) {
      console.error("Folder selection cancelled or failed", err);
      const errMsg = String(err?.message || err).toLowerCase();
      if (
        errMsg.includes("security") ||
        errMsg.includes("cross-origin") ||
        errMsg.includes("cross origin") ||
        errMsg.includes("sub frame") ||
        errMsg.includes("subframe") ||
        errMsg.includes("not allowed") ||
        errMsg.includes("denied") ||
        errMsg.includes("picker")
      ) {
        setShowIframeModal(true);
      } else if (!errMsg.includes("abort") && !errMsg.includes("cancel")) {
        toast.error("Folder selection failed: " + (err?.message || err));
      }
    }
  };

  const isBusy = isGenerating || isProcessing;

  return (
    <>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`group relative border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden ${
          compact ? 'p-4 lg:p-6' : 'p-8 lg:p-12'
        } ${
          isBusy 
            ? "border-indigo-500/30 bg-indigo-500/5 cursor-not-allowed" 
            : isDragging
              ? "border-indigo-400 bg-indigo-500/10 scale-[1.02] shadow-[0_0_30px_rgba(99,102,241,0.2)]"
              : "border-white/5 hover:border-indigo-500/40 glass-panel hover:bg-indigo-500/[0.02] cursor-pointer"
        }`}
      >
      <CountdownOverlay 
        isVisible={isProcessing || isGenerating} 
        message={isGenerating ? `Processing ${pendingCount} files...` : "Processing media files..."} 
        estimatedSeconds={isGenerating ? (pendingCount * 3 || 10) : 5} 
        compact={compact}
      />
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full animate-pulse delay-700"></div>
      </div>
      
      <input
        type="file"
        multiple
        accept="image/*,.eps,.ai,video/*"
        onChange={onChange}
        disabled={isBusy}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={`flex flex-col items-center w-full h-full text-center relative z-10 ${isBusy ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className={`${compact ? 'w-12 h-12 mb-2' : 'w-28 h-28 mb-10'} rounded-[1.5rem] glass-panel flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-all duration-700 relative group-hover:-translate-y-2 ${
          isBusy 
            ? "border-indigo-500/50 shadow-[0_0_60px_rgba(99,102,241,0.4)] scale-110" 
            : "border-white/10 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_60px_rgba(99,102,241,0.25)]"
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          {isBusy ? (
            <div className="relative">
              <Loader2 className={`${compact ? 'w-6 h-6' : 'w-12 h-12'} text-indigo-400 animate-spin`} />
              <div className="absolute inset-0 blur-xl bg-indigo-400/20 animate-pulse"></div>
            </div>
          ) : (
            <div className="relative">
              <UploadCloud className={`${compact ? 'w-6 h-6' : 'w-12 h-12'} text-zinc-500 group-hover:text-indigo-400 transition-all duration-500`} />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          )}
        </div>
        
        <h3 className={`${compact ? 'text-base' : 'text-xl'} font-bold text-white mb-1 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-indigo-300 transition-all duration-500`}>
          {isProcessing ? "Analyzing Assets..." : isGenerating ? "AI Processing..." : "Ingest Media Assets"}
        </h3>
        
        <p className={`text-zinc-500 ${compact ? 'text-[10px] mb-2' : 'text-base mb-10'} max-w-sm mx-auto font-medium leading-relaxed tracking-tight`}>
          {isBusy ? (
            <span className="text-indigo-400 font-bold tracking-widest uppercase text-[10px] animate-pulse">Neural Engine Active • Processing...</span>
          ) : (
            <>Drop <span className="text-zinc-300 font-bold">JPG, PNG, EPS, AI, MP4</span> or <span className="text-indigo-400 group-hover:text-indigo-300 transition-colors underline decoration-indigo-500/30 underline-offset-8">browse filesystem</span></>
          )}
        </p>

        {!compact && (
          <div className="flex items-center gap-2">
            {(['JPG', 'PNG', 'EPS', 'AI', 'MP4', 'MOV'].map((ext) => (
              <span key={ext} className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[8px] font-bold text-zinc-600 tracking-wider group-hover:border-indigo-500/20 group-hover:text-zinc-400 transition-all duration-500">
                {ext}
              </span>
            )))}
          </div>
        )}
      </label>

      {('showDirectoryPicker' in window) && !isBusy && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSelectFolder();
          }}
          className={`relative z-20 flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl font-bold transition-all duration-500 border border-indigo-500/20 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] text-[9px] tracking-wider uppercase ${
            compact ? 'mt-2 px-3 py-1.5' : 'mt-8 px-6 py-2.5'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>{compact ? "Select Folder" : "Select Folder (Auto-save CSV & EMBEDDED Zip)"}</span>
        </button>
      )}
      </div>

      <AnimatePresence>
        {showIframeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setShowIframeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-xl bg-zinc-950/90 border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

              <button
                onClick={() => setShowIframeModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 relative shadow-[0_0_30px_rgba(245,158,11,0.15)] animate-bounce-subtle">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <div className="absolute inset-0 rounded-2xl bg-amber-500/5 animate-pulse"></div>
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight">
                  Directory Access Blocked
                </h3>
                
                <p className="text-zinc-400 text-sm md:text-base mb-8 leading-relaxed max-w-md">
                  Web browsers strictly prohibit folder directory access inside cross-origin iframe previews for safety reasons.
                </p>

                <div className="w-full text-left bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-300 mt-0.5 shrink-0">1</div>
                    <div>
                      <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1">Recommended Option</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed">
                        Open this application in a <strong>New Tab</strong>. Direct folder operations and full disk auto-saving features will be fully functional outside the iframe sandbox!
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-[1px] bg-white/5"></div>

                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-zinc-500/20 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5 shrink-0">2</div>
                    <div>
                      <h4 className="text-zinc-300 text-xs font-bold uppercase tracking-wider mb-1">Standard Uploads</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed">
                        Simply drop your files or folder onto this window. Metadata generation compiles perfectly, and you can download files directly via ZIP or CSV!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowIframeModal(false)}
                    className="flex-1 px-6 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </a>
                  
                  <button
                    onClick={() => setShowIframeModal(false)}
                    className="flex-1 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-sm uppercase tracking-wider border border-white/5 transition-all text-center cursor-pointer"
                  >
                    Standard Upload
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
