import React, { useState } from "react";
import { X, BookOpen, Key, Upload, Download, Settings, Sparkles } from "lucide-react";

interface HowToUseModalProps {
  onClose: () => void;
}

export function HowToUseModal({ onClose }: HowToUseModalProps) {
  const [lang, setLang] = useState<"en" | "bn">("en");

  const content = {
    en: {
      title: "How to Use AI Stock Metadata Generator",
      desc: "Follow these simple steps to generate SEO-optimized metadata for your stock images.",
      steps: [
        {
          icon: <Key className="w-5 h-5 text-indigo-400" />,
          title: "1. Add API Key (Optional for Free Tier)",
          text: "The app uses a built-in API key for up to 50 free generations. For unlimited use, get your own free Gemini API key from Google AI Studio and add it in the Settings panel."
        },
        {
          icon: <Upload className="w-5 h-5 text-indigo-400" />,
          title: "2. Upload Images",
          text: "Drag and drop your images (JPG, PNG, EPS, AI) into the upload area. The app will automatically compress them to save your data and API limits."
        },
        {
          icon: <Settings className="w-5 h-5 text-indigo-400" />,
          title: "3. Configure Settings",
          text: "Select your target platform (Shutterstock, Adobe Stock, etc.), set keyword limits, and add any negative keywords you want to avoid."
        },
        {
          icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
          title: "4. Generate Metadata",
          text: "Click 'Generate Metadata'. The AI will analyze your images and create highly relevant titles, descriptions, and keywords. It processes 2 images at a time to prevent API errors."
        },
        {
          icon: <Download className="w-5 h-5 text-indigo-400" />,
          title: "5. Export to CSV",
          text: "Once generation is complete, click 'Export CSV' to download a file formatted perfectly for your selected stock platform."
        }
      ]
    },
    bn: {
      title: "কীভাবে এআই স্টক মেটাডাটা জেনারেটর ব্যবহার করবেন",
      desc: "আপনার স্টক ইমেজের জন্য এসইও-অপ্টিমাইজড মেটাডাটা তৈরি করতে এই সহজ ধাপগুলো অনুসরণ করুন।",
      steps: [
        {
          icon: <Key className="w-5 h-5 text-indigo-400" />,
          title: "১. এপিআই কী যুক্ত করুন (ফ্রি টিয়ারের জন্য ঐচ্ছিক)",
          text: "অ্যাপটিতে ৫০টি ফ্রি জেনারেশনের জন্য বিল্ট-ইন এপিআই কী রয়েছে। আনলিমিটেড ব্যবহারের জন্য Google AI Studio থেকে আপনার নিজের ফ্রি Gemini API কী সংগ্রহ করে সেটিংসে যুক্ত করুন।"
        },
        {
          icon: <Upload className="w-5 h-5 text-indigo-400" />,
          title: "২. ছবি আপলোড করুন",
          text: "আপনার ছবিগুলো (JPG, PNG, EPS, AI) আপলোড এরিয়াতে ড্র্যাগ অ্যান্ড ড্রপ করুন। আপনার ডাটা এবং এপিআই লিমিট বাঁচাতে অ্যাপটি স্বয়ংক্রিয়ভাবে ছবিগুলো কম্প্রেস (ছোট) করে নেবে।"
        },
        {
          icon: <Settings className="w-5 h-5 text-indigo-400" />,
          title: "৩. সেটিংস কনফিগার করুন",
          text: "আপনার টার্গেট প্ল্যাটফর্ম (Shutterstock, Adobe Stock ইত্যাদি) নির্বাচন করুন, কিওয়ার্ড লিমিট সেট করুন এবং কোনো নেগেটিভ কিওয়ার্ড থাকলে তা যুক্ত করুন।"
        },
        {
          icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
          title: "৪. মেটাডাটা জেনারেট করুন",
          text: "'Generate Metadata' বাটনে ক্লিক করুন। এআই আপনার ছবিগুলো বিশ্লেষণ করে নিখুঁত টাইটেল, ডেসক্রিপশন এবং কিওয়ার্ড তৈরি করবে। এপিআই এরর এড়াতে এটি একসাথে ২টি করে ছবি প্রসেস করে।"
        },
        {
          icon: <Download className="w-5 h-5 text-indigo-400" />,
          title: "৫. সিএসভি (CSV) এক্সপোর্ট করুন",
          text: "জেনারেশন শেষ হলে 'Export CSV' বাটনে ক্লিক করে আপনার নির্বাচিত স্টক প্ল্যাটফর্মের জন্য পারফেক্ট ফরম্যাটের ফাইলটি ডাউনলোড করে নিন।"
        }
      ]
    }
  };

  const currentContent = content[lang];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative max-h-[90vh] flex flex-col group">
        
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <BookOpen className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">{currentContent.title}</h2>
              <p className="text-sm text-[var(--text-muted)]">{currentContent.desc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors border border-[var(--border)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Toggle */}
        <div className="px-6 pt-4 shrink-0 flex justify-end relative z-10">
          <div className="flex bg-[var(--bg)] rounded-lg p-1 border border-[var(--border)]">
            <button
              onClick={() => setLang("en")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                lang === "en" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang("bn")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                lang === "bn" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar relative z-10">
          <div className="space-y-4">
            {currentContent.steps.map((step, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--border)] transition-colors group/item">
                <div className="shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                    {step.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text)] mb-1 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] shrink-0 bg-[var(--card-bg)] relative z-10">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            {lang === "en" ? "Got it!" : "বুঝতে পেরেছি!"}
          </button>
        </div>
      </div>
    </div>
  );
}
