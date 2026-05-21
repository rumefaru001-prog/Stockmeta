import React, { useState } from "react";
import { MediaFile } from "../types";
import { Copy, Edit2, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw, Save, X, Video, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ResultsTableProps {
  files: MediaFile[];
  onRemove: (id: string) => void;
  onRegenerate: (id: string) => void;
  onUpdate: (id: string, updates: Partial<MediaFile['metadata']>) => void;
  isGenerating: boolean;
}

export function ResultsTable({ files, onRemove, onRegenerate, onUpdate, isGenerating }: ResultsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    title: string;
    description: string;
    keywords: string;
  } | null>(null);

  const startEditing = (file: MediaFile) => {
    setEditingId(file.id);
    setEditValues({
      title: file.metadata?.title || "",
      description: file.metadata?.description || "",
      keywords: file.metadata?.keywords || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const saveEditing = (id: string) => {
    if (editValues) {
      onUpdate(id, editValues);
    }
    setEditingId(null);
    setEditValues(null);
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-20 relative overflow-hidden">
        <div className="w-20 h-20 bg-[var(--card-bg)] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.1)] border border-[var(--border)]">
          <ImageIcon className="w-8 h-8 text-indigo-400" />
        </div>
        <p className="text-lg font-medium text-[var(--text)] mb-2">No files uploaded</p>
        <p className="text-sm text-[var(--text-muted)] max-w-xs text-center">
          Upload your images to generate metadata.
        </p>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="overflow-x-auto h-full custom-scrollbar bg-black/20">
      <table className="w-full border-collapse text-sm text-white table-fixed">
        <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur-xl z-10 border-b border-white/10 shadow-2xl">
          <tr>
            <th className="text-left p-4 font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] w-[120px] pl-8">Asset</th>
            <th className="text-left p-4 font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] w-[25%]">Title & Category</th>
            <th className="text-left p-4 font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] w-[30%]">Description</th>
            <th className="text-left p-4 font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] w-[30%]">Keywords</th>
            <th className="text-center p-4 font-black text-zinc-500 text-[10px] uppercase tracking-[0.2em] w-[110px] pr-8">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          <AnimatePresence mode="popLayout">
            {files.map((file) => (
              <motion.tr 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  backgroundColor: file.status === "success" ? "rgba(16, 185, 129, 0.02)" : "transparent"
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                key={file.id} 
                className="hover:bg-white/[0.02] transition-colors align-top group"
              >
              <td className="p-4 pl-8 border-r border-white/5 relative align-top">
                <div className="flex flex-col gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative shadow-2xl group-hover:border-indigo-500/50 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <img
                      src={file.previewUrl}
                      alt={file.originalFileName || file.file.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                    {file.originalType === 'video' && (
                      <div className="absolute bottom-2 left-2 w-7 h-7 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center text-white/90 shadow-sm border border-white/10">
                        <Video className="w-4 h-4" />
                      </div>
                    )}
                    <button
                      onClick={() => onRemove(file.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-rose-500 transition-all opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 border border-white/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[10px] font-black text-zinc-500 truncate w-20 uppercase tracking-widest" title={file.originalFileName || file.file.name}>
                    {file.originalFileName || file.file.name}
                  </div>
                  {file.status === "success" && (
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => onUpdate(file.id, { rating: star })}
                          className="focus:outline-none transition-transform hover:scale-125"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              (file.metadata?.rating || 0) >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-zinc-700 hover:text-amber-400/50"
                            } transition-colors`}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              
              {/* Title Column */}
              <td className="p-4 border-r border-white/5 align-top">
                {file.metadata?.title ? (
                  editingId === file.id ? (
                    <div className="flex flex-col gap-3 h-full">
                      <textarea
                        value={editValues?.title}
                        onChange={(e) => setEditValues(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                        className="w-full h-28 bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
                      />
                      {file.metadata.category && (
                        <div className="opacity-80">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                            {file.metadata.category}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex flex-col h-full gap-4"
                    >
                      <p className="leading-relaxed text-white font-bold text-[13px] tracking-tight">{file.metadata.title}</p>
                      {file.metadata.category && (
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                            {file.metadata.category}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-auto pt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <button 
                          onClick={() => copyToClipboard(file.metadata!.title!)}
                          className="px-3 py-1.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-[0.15em]"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button 
                          onClick={() => startEditing(file)}
                          className="px-3 py-1.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-[0.15em]"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                    </motion.div>
                  )
                ) : (
                  <span className="text-zinc-600 italic text-[11px] font-medium flex items-center gap-3 mt-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 animate-pulse"></div>
                    Neural Processing Pending...
                  </span>
                )}
              </td>

              {/* Description Column */}
              <td className="p-4 border-r border-white/5 align-top">
                {file.metadata ? (
                  file.metadata.description ? (
                    editingId === file.id ? (
                      <div className="flex flex-col gap-3 h-full">
                        <textarea
                          value={editValues?.description}
                          onChange={(e) => setEditValues(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                          className="w-full h-36 bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
                        />
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="flex flex-col h-full gap-4"
                      >
                        <p className="leading-relaxed text-zinc-400 text-[11px] font-medium">{file.metadata.description}</p>
                        <div className="flex items-center gap-3 mt-auto pt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                          <button 
                            onClick={() => copyToClipboard(file.metadata!.description!)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-[0.15em]"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <button 
                            onClick={() => startEditing(file)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-[0.15em]"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      </motion.div>
                    )
                  ) : (
                    <span className="text-zinc-600 italic text-[11px] font-medium flex items-center gap-3 mt-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                      Not requested
                    </span>
                  )
                ) : (
                  <span className="text-zinc-600 italic text-[11px] font-medium flex items-center gap-3 mt-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 animate-pulse"></div>
                    Neural Processing Pending...
                  </span>
                )}
              </td>

              {/* Keywords Column */}
              <td className="p-4 border-r border-white/5 align-top">
                {file.metadata?.keywords ? (
                  editingId === file.id ? (
                    <div className="flex flex-col gap-3 h-full">
                      <textarea
                        value={editValues?.keywords}
                        onChange={(e) => setEditValues(prev => prev ? ({ ...prev, keywords: e.target.value }) : null)}
                        className="w-full h-44 bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
                      />
                      <div className="flex items-center gap-3 mt-2">
                        <button 
                          onClick={() => saveEditing(file.id)}
                          className="flex-1 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                          <Save className="w-3 h-3" /> Commit
                        </button>
                        <button 
                          onClick={cancelEditing}
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                          <X className="w-3 h-3" /> Abort
                        </button>
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex flex-col h-full gap-4"
                    >
                      <div className="flex flex-wrap gap-2 content-start max-h-[140px] overflow-y-auto custom-scrollbar pr-2">
                        {file.metadata.keywords.split(',').map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white hover:border-indigo-500/30 transition-all cursor-default uppercase tracking-wider">
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                          {file.metadata.keywords.split(',').length} TOKENS
                        </span>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                          <button 
                            onClick={() => copyToClipboard(file.metadata!.keywords!)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-[0.15em]"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <button 
                            onClick={() => startEditing(file)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-[0.15em]"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                ) : (
                  <span className="text-zinc-600 italic text-[11px] font-medium flex items-center gap-3 mt-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 animate-pulse"></div>
                    Neural Processing Pending...
                  </span>
                )}
              </td>
              
              {/* Status Column */}
              <td className="p-4 pr-8 text-center align-middle">
                {file.status === "pending" && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                    </div>
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Queued</span>
                  </div>
                )}
                {file.status === "generating" && (
                  <div className="flex flex-col items-center gap-2 group/status">
                    <div className="w-8 h-8 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Analyzing</span>
                    <button 
                      onClick={() => onRegenerate(file.id)}
                      disabled={isGenerating}
                      className="mt-2 px-2 py-1 bg-white/5 border border-white/10 text-indigo-300 rounded-lg text-[9px] font-black transition-all opacity-0 group-hover/status:opacity-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                      title="Force Reprocess if stuck"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} /> Reset
                    </button>
                  </div>
                )}
                {file.status === "success" && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="flex flex-col items-center gap-2 group/status"
                  >
                    <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Verified</span>
                    <button 
                      onClick={() => onRegenerate(file.id)}
                      disabled={isGenerating}
                      className="mt-2 px-2 py-1 bg-white/5 border border-white/10 text-emerald-300 rounded-lg text-[9px] font-black transition-all opacity-0 group-hover/status:opacity-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                      title="Regenerate metadata"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} /> Re-Run
                    </button>
                  </motion.div>
                )}
                {file.status === "error" && (
                  <div className="flex flex-col items-center max-w-[150px]">
                    <div className="w-8 h-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    </div>
                    <span className="text-[10px] text-rose-400 font-black uppercase tracking-[0.2em]">Failed</span>
                    <button 
                      onClick={() => onRegenerate(file.id)}
                      disabled={isGenerating}
                      className="mt-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} /> Retry
                    </button>
                  </div>
                )}
              </td>
            </motion.tr>
          ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
