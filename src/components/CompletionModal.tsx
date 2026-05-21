import React from 'react';
import { X, Download, CheckCircle2, Archive, Folder } from 'lucide-react';

interface CompletionModalProps {
  done: number;
  pending: number;
  error: number;
  onDownloadCSV: () => void;
  onDownloadZIP: () => void;
  onClose: () => void;
  exportMode?: 'zip' | 'individual';
  onSetExportMode?: (mode: 'zip' | 'individual') => void;
}

export function CompletionModal({ 
  done, 
  pending, 
  error, 
  onDownloadCSV, 
  onDownloadZIP, 
  onClose,
  exportMode = 'zip',
  onSetExportMode
}: CompletionModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-1.5 sm:p-3 animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-zinc-800 rounded-xl w-full max-w-[340px] shadow-[0_10px_40px_rgba(0,0,0,0.7)] relative overflow-hidden max-h-[84vh] flex flex-col md:-translate-y-6">
        
        {/* Top Accent line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-500 z-20"></div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-1 border border-zinc-800 z-20"
        >
          <X className="w-3 h-3" />
        </button>
        
        {/* Compact Scrollable Content Container */}
        <div className="p-3 sm:p-4 overflow-y-auto relative flex-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          
          {/* Header Row (Icon + Text on same line to save height) */}
          <div className="flex items-center gap-2 mb-2.5 mt-0.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">Generation Complete</h3>
              <p className="text-[9px] text-zinc-400 leading-normal">
                Your metadata has been successfully generated.
              </p>
            </div>
          </div>
          
          {/* Compact Stats Row */}
          <div className="grid grid-cols-3 gap-1 mb-2.5">
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg py-1 text-center">
              <span className="text-xs font-black text-emerald-400 block leading-tight">{done}</span>
              <span className="text-[7.5px] uppercase tracking-wide font-extrabold text-zinc-500">Success</span>
            </div>
            
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg py-1 text-center">
              <span className="text-xs font-black text-indigo-400 block leading-tight">{pending}</span>
              <span className="text-[7.5px] uppercase tracking-wide font-extrabold text-zinc-500">Pending</span>
            </div>
            
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg py-1 text-center">
              <span className="text-xs font-black text-rose-400 block leading-tight">{error}</span>
              <span className="text-[7.5px] uppercase tracking-wide font-extrabold text-zinc-500">Failed</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {/* Download CSV Action */}
            <button
              onClick={() => {
                onDownloadCSV();
                onClose();
              }}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all shadow-[0_2px_8px_rgba(16,185,129,0.15)] flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV Report
            </button>
            
            {/* Embed & Save Section */}
            {onSetExportMode && (
              <div className="p-2 sm:p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 shadow-md">
                <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 text-center">
                  Embed Metadata Options
                </span>
                
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => onSetExportMode('zip')}
                    className={`flex flex-col items-center justify-center py-1 px-1 rounded-md border transition-all ${
                      exportMode === 'zip'
                        ? "bg-indigo-500/10 border-indigo-500/40 text-white shadow-[0_0_8px_rgba(99,102,241,0.1)]"
                        : "bg-black/20 border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Archive className={`w-3.5 h-3.5 mb-0.5 ${exportMode === 'zip' ? 'text-indigo-400' : 'text-zinc-500'}`} />
                    <span className="text-[10px] font-bold">ZIP Format</span>
                    <span className="text-[7.5px] text-zinc-500 font-semibold font-bengali">জিপ ফরম্যাট</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => onSetExportMode('individual')}
                    className={`flex flex-col items-center justify-center py-1 px-1 rounded-md border transition-all ${
                      exportMode === 'individual'
                        ? "bg-emerald-500/10 border-emerald-500/40 text-white shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                        : "bg-black/20 border-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Folder className={`w-3.5 h-3.5 mb-0.5 ${exportMode === 'individual' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span className="text-[10px] font-bold">Direct Replace</span>
                    <span className="text-[7.5px] text-zinc-500 font-semibold font-bengali">ফাইল রিপ্লেসমেন্ট</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      onDownloadZIP();
                      onClose();
                    }}
                    className={`w-full py-2 rounded-md text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 border hover:-translate-y-0.5 active:scale-95 ${
                      exportMode === 'individual'
                        ? "bg-indigo-600 hover:bg-indigo-500 shadow-[0_2px_8px_rgba(99,102,241,0.25)] border-none"
                        : "bg-sky-600 hover:bg-sky-500 shadow-[0_2px_8px_rgba(14,165,233,0.25)] border-none"
                    }`}
                  >
                    {exportMode === 'individual' ? <Folder className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    {exportMode === 'individual' ? "Embed & Direct Replace" : "Embed & Download ZIP"}
                  </button>
                  
                  {/* Explanatory text in Bengali with clean spacing */}
                  <p className="text-[9px] text-zinc-300 text-center leading-normal font-semibold bg-black/55 p-1.5 rounded border border-zinc-800/50 mt-0.5">
                    {exportMode === 'individual' 
                      ? "✓ এটিতে ক্লিক করলে আপনার ফাইলগুলো আগে যে ছবি থাকবে ওগুলোর সাথে সরাসরি রিপ্লেস হয়ে যাবে, আলাদাভাবে কিছুই করতে হবে না।"
                      : "✓ এটিতে ক্লিক করলে আপনার ফাইলগুলো জিপ ফরম্যাটে কম্প্রেস হয়ে ডাউনলোড হয়ে যাবে।"}
                  </p>
                </div>
              </div>
            )}
            
            <p className="text-[8.5px] text-zinc-500 text-center leading-snug mt-0.5 max-w-[280px] mx-auto pb-1 border-t border-zinc-900/60 pt-2">
              * Embedded metadata is supported for JPEG/PNG images.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
