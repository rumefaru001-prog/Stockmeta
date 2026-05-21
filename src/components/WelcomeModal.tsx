import React from "react";
import { X, Send, MessageCircle, Facebook, Youtube } from "lucide-react";

interface WelcomeModalProps {
  onClose: () => void;
  telegramLink: string;
  whatsappLink: string;
  facebookLink: string;
  youtubeLink: string;
}

export function WelcomeModal({ onClose, telegramLink, whatsappLink, facebookLink, youtubeLink }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
        
        <div className="relative p-8">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-8 mt-2">
            <h2 className="text-xl font-bold text-white mb-2">কোন সমস্যা হলে আমাদেরকে সাথে যোগাযোগ করুন </h2>
            <p className="text-gray-400 text-sm">
              Please contact us if you have any problems.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a 
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#1e293b] border border-[#334155] hover:bg-[#334155] text-white transition-colors"
            >
              <Send className="w-5 h-5 text-[#38bdf8]" />
              <span className="font-medium text-sm">Telegram Group</span>
            </a>

            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#1e293b] border border-[#059669] hover:bg-[#064e3b] text-white transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-[#34d399]" />
              <span className="font-medium text-sm">WhatsApp Group</span>
            </a>

            <a 
              href={facebookLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#1e293b] border border-[#0284c7] hover:bg-[#0c4a6e] text-white transition-colors"
            >
              <Facebook className="w-5 h-5 text-[#38bdf8]" />
              <span className="font-medium text-sm">Facebook Link</span>
            </a>

            <a 
              href={youtubeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#1e293b] border border-[#e11d48] hover:bg-[#881337] text-white transition-colors"
            >
              <Youtube className="w-5 h-5 text-[#fb7185]" />
              <span className="font-medium text-sm">Youtube Link</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
