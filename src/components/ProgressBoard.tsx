import React from "react";
import { X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface ProgressBoardProps {
  total: number;
  done: number;
  pending: number;
  error: number;
  onClose: () => void;
  processedCount: number;
  isPro: boolean;
}

export function ProgressBoard({ total, done, pending, error, onClose, processedCount, isPro }: ProgressBoardProps) {
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="fixed bottom-[100px] right-6 z-40 bg-[var(--card-bg)] rounded-xl p-3 shadow-[0_0_40px_rgba(0,0,0,0.5)] w-56 overflow-hidden group animate-in slide-in-from-bottom-10 duration-500 border border-[var(--border)]">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)] relative z-10">
        <div className="flex flex-col">
          <h3 className="text-[10px] font-bold text-[var(--text)] flex items-center gap-1.5 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
            </div>
            Processing...
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-[var(--text-muted)] font-medium">Processed: {processedCount}</span>
            {isPro && (
              <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">PRO</span>
            )}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text)] bg-[var(--text)]/5 hover:bg-[var(--text)]/10 p-1 rounded-lg transition-colors border border-[var(--border)]"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      
      <div className="space-y-2 mb-4 relative z-10">
        <div className="flex items-center justify-between text-[var(--text-muted)] bg-[var(--text)]/[0.02] p-1.5 rounded-lg border border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-medium">Completed</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{done}</span>
        </div>
        <div className="flex items-center justify-between text-[var(--text-muted)] bg-[var(--text)]/[0.02] p-1.5 rounded-lg border border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-medium">Pending</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{pending}</span>
        </div>
        <div className="flex items-center justify-between text-[var(--text-muted)] bg-[var(--text)]/[0.02] p-1.5 rounded-lg border border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span className="text-[10px] font-medium">Failed</span>
          </div>
          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{error}</span>
        </div>
      </div>

      <div className="w-full h-1 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)] relative z-10">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out relative shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-[var(--text)]/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>
    </div>
  );
}
