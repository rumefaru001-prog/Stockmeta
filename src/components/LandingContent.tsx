import React, { useState } from 'react';
import { Zap, Shield, Image as ImageIcon, FileSpreadsheet, TrendingUp, Cpu, ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  lang: 'en' | 'bn';
  onGetStarted: () => void;
}

const content = {
  en: {
    heroTitle: "Supercharge Your Microstock Sales",
    heroSub: "The ultimate AI-powered stock metadata generator. Create highly relevant, SEO-optimized titles, descriptions, and keywords for your images and videos. Boost your stock photography SEO, rank higher in search results, and increase your downloads across Shutterstock, Adobe Stock, and all major stock agencies.",
    featuresTitle: "Why Top Contributors Use Our Tool",
    features: [
      { icon: TrendingUp, title: "Boost Your Downloads", desc: "AI analyzes your images to generate buyer-focused keywords, pushing your portfolio to the top of search results." },
      { icon: Cpu, title: "Smart AI Analysis", desc: "Our advanced vision models understand context, objects, and concepts better than traditional auto-taggers." },
      { icon: ImageIcon, title: "Direct EXIF Embedding", desc: "Embed metadata directly into your JPG files. No more copy-pasting—just upload straight to agencies." },
      { icon: FileSpreadsheet, title: "Multi-Platform CSV", desc: "Export perfectly formatted CSVs ready for Adobe Stock, Shutterstock, Freepik, and more." },
      { icon: Zap, title: "Lightning Fast Batching", desc: "Process hundreds of vectors, photos, and videos in minutes without breaking a sweat." },
      { icon: Shield, title: "100% Privacy & Secure", desc: "Your API keys and files never leave your browser. We don't store your data or steal your work." }
    ],
    howItWorksTitle: "How It Works",
    steps: [
      { step: "01", title: "Upload Media", desc: "Drag and drop your photos, vectors (EPS/AI), or videos. We handle the previews automatically." },
      { step: "02", title: "AI Generation", desc: "Our AI analyzes each file and generates highly accurate, spam-free metadata tailored for stock sites." },
      { step: "03", title: "Export & Earn", desc: "Download embedded JPGs or platform-ready CSVs and submit to agencies faster than ever." }
    ],
    platformsTitle: "Supported Platforms",
    platforms: ["Adobe Stock", "Shutterstock", "Freepik", "Vecteezy", "Pond5", "123RF", "iStock", "Dreamstime", "Depositphotos", "Envato Elements", "Creative Fabrica", "Wirestock", "Alamy"],
    faqTitle: "Frequently Asked Questions",
    faqs: [
      { q: "How does this increase my sales?", a: "Stock agencies rely heavily on search algorithms. Our AI generates highly relevant, buyer-intent keywords that human taggers often miss, ensuring your images appear when buyers search for them." },
      { q: "Does it support EPS and Video files?", a: "Yes! We automatically extract previews from EPS/AI and video files to generate metadata. You can then export a CSV to upload alongside your original files." },
      { q: "Is my data safe?", a: "Absolutely. All processing happens locally in your browser using your own API key. We do not have servers that store your images or metadata." }
    ]
  },
  bn: {
    heroTitle: "মাইক্রোস্টকে আপনার ডাউনলোড এবং সেলস বহুগুণ বাড়ান",
    heroSub: "স্টক মেটাডাটা জেনারেটর (Stock Metadata Generator) হিসেবে এটি সেরা এআই টুল। আপনার ছবি এবং ভিডিওর জন্য এসইও-ফ্রেন্ডলি টাইটেল, ডেসক্রিপশন এবং কিওয়ার্ড তৈরি করুন। শাটারস্টক (Shutterstock), অ্যাডোবি স্টক (Adobe Stock) সহ সব বড় স্টক এজেন্সিতে আপনার সেলস এবং র‍্যাংকিং বহুগুণ বাড়ান।",
    featuresTitle: "কেন প্রফেশনালরা আমাদের টুল ব্যবহার করেন?",
    features: [
      { icon: TrendingUp, title: "ডাউনলোড বৃদ্ধি করুন", desc: "এআই আপনার ছবি বিশ্লেষণ করে ক্রেতাদের চাহিদাসম্পন্ন কিওয়ার্ড তৈরি করে, যা আপনার পোর্টফোলিওকে সার্চের শীর্ষে নিয়ে যায়।" },
      { icon: Cpu, title: "স্মার্ট এআই অ্যানালাইসিস", desc: "আমাদের এআই মডেল সাধারণ অটো-ট্যাগারের চেয়ে ছবির বিষয়বস্তু এবং কনসেপ্ট অনেক ভালোভাবে বুঝতে পারে।" },
      { icon: ImageIcon, title: "সরাসরি EXIF এমবেড", desc: "সরাসরি JPG ফাইলে মেটাডাটা সেভ করুন। বারবার কপি-পেস্ট করার ঝামেলা নেই, সরাসরি এজেন্সিতে আপলোড করুন।" },
      { icon: FileSpreadsheet, title: "মাল্টি-প্ল্যাটফর্ম CSV", desc: "অ্যাডোবি স্টক, শাটারস্টক, ফ্রিপিক সহ অন্যান্য সাইটের জন্য রেডিমেড CSV এক্সপোর্ট করুন।" },
      { icon: Zap, title: "সুপারফাস্ট ব্যাচ প্রসেসিং", desc: "কয়েক মিনিটের মধ্যে শত শত ভেক্টর, ছবি এবং ভিডিও প্রসেস করুন খুব সহজেই।" },
      { icon: Shield, title: "১০০% প্রাইভেসি এবং সুরক্ষিত", desc: "আপনার এপিআই কি এবং ফাইল ব্রাউজারেই থাকে। আমরা আপনার কোনো ডেটা সেভ করি না বা চুরি করি পণ্ডিত করি না।" }
    ],
    howItWorksTitle: "কীভাবে কাজ করে?",
    steps: [
      { step: "01", title: "ফাইল আপলোড করুন", desc: "আপনার ছবি, ভেক্টর (EPS/AI) বা ভিডিও ড্র্যাগ অ্যান্ড ড্রপ করুন। আমরা স্বয়ংক্রিয়ভাবে প্রিভিউ তৈরি করে নেব।" },
      { step: "02", title: "এআই জেনারেশন", desc: "আমাদের এআই প্রতিটি ফাইল বিশ্লেষণ করে স্টক সাইটের জন্য একদম সঠিক এবং স্প্যাম-মুক্ত মেটাডাটা তৈরি করে।" },
      { step: "03", title: "এক্সপোর্ট এবং আয়", desc: "এমবেড করা JPG অথবা রেডিমেড CSV ডাউনলোড করুন এবং আগের চেয়ে দ্রুত এজেন্সিতে সাবমিট করুন।" }
    ],
    platformsTitle: "যেসব প্ল্যাটফর্ম সাপোর্ট করে",
    platforms: ["Adobe Stock", "Shutterstock", "Freepik", "Vecteezy", "Pond5", "123RF", "iStock", "Dreamstime", "Depositphotos", "Envato Elements", "Creative Fabrica", "Wirestock", "Alamy"],
    faqTitle: "সাধারণ জিজ্ঞাসা (FAQ)",
    faqs: [
      { q: "এটি কীভাবে আমার সেলস বাড়াবে?", a: "স্টক এজেন্সিগুলো মূলত সার্চ অ্যালগরিদমের ওপর নির্ভরশীল। আমাদের এআই এমন সব কিওয়ার্ড জেনারেট করে যা ক্রেতারা আসলেই সার্চ করে, ফলে আপনার ছবিগুলো সহজেই ক্রেতাদের চোখে পড়ে এবং ডাউনলোড বাড়ে।" },
      { q: "এটি কি EPS এবং ভিডিও সাপোর্ট করে?", a: "হ্যাঁ! আমরা স্বয়ংক্রিয়ভাবে EPS/AI এবং ভিডিও থেকে প্রিভিউ বের করে মেটাডাটা তৈরি করি। এরপর আপনি CSV এক্সপোর্ট করে মূল ফাইলের সাথে আপলোড করতে পারবেন।" },
      { q: "আমার ফাইলগুলো কি সুরক্ষিত?", a: "সম্পূর্ণরূপে। সব কাজ আপনার ব্রাউজারে লোকালি হয়। আমাদের কোনো সার্ভার নেই যেখানে আপনার ছবি বা ডেটা সেভ থাকে।" }
    ]
  }
};

export function LandingContent({ lang, onGetStarted }: Props) {
  const t = content[lang];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="w-full max-w-7xl mx-auto mt-16 mb-32 space-y-40 animate-in fade-in duration-1000 px-4 sm:px-6">
      {/* Hero Section - Editorial/Magazine Style */}
      <div className="text-center max-w-6xl mx-auto space-y-12 relative py-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[160px] -z-10 pointer-events-none"></div>
        
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 shadow-[0_0_50px_rgba(99,102,241,0.1)] backdrop-blur-xl">
          <Sparkles className="w-4 h-4" />
          <span>{lang === 'en' ? 'Intelligence Platform // v2.0' : 'ইন্টেলিজেন্স প্ল্যাটফর্ম // v2.0'}</span>
        </div>
        
        <h1 className="text-7xl md:text-9xl lg:text-[140px] font-black tracking-tighter text-[var(--text)] leading-[0.82] uppercase">
          {lang === 'en' ? (
            <>Supercharge <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">Microstock</span> <br /> <span className="text-indigo-500">Sales</span></>
          ) : (
            <>মাইক্রোস্টকে আপনার <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">ডাউনলোড</span> <br /> <span className="text-indigo-500">বহুগুণ বাড়ান</span></>
          )}
        </h1>
        
        <p className="text-xl md:text-2xl text-[var(--text-muted)] leading-relaxed max-w-3xl mx-auto font-medium tracking-tight opacity-80">
          {t.heroSub}
        </p>

        <div className="flex flex-wrap justify-center gap-6 pt-12">
          <button 
            onClick={onGetStarted}
            className="px-12 py-6 rounded-2xl bg-indigo-500 text-white font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all hover:scale-105 shadow-[0_30px_60px_rgba(99,102,241,0.3)] flex items-center gap-4 group"
          >
            {lang === 'en' ? 'Initialize System' : 'সিস্টেম শুরু করুন'}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </button>
          <button 
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-12 py-6 rounded-2xl bg-white/5 text-white font-black text-sm uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/10 backdrop-blur-xl"
          >
            {lang === 'en' ? 'View Capabilities' : 'ক্যাপাবিলিটিস দেখুন'}
          </button>
        </div>
      </div>

      {/* Features - Technical Dashboard Style */}
      <div id="features" className="space-y-20 relative">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 border-b border-[var(--border)] pb-12">
          <div className="space-y-4">
            <span className="text-indigo-500 font-mono text-xs tracking-[0.4em] uppercase font-black">01 // Capabilities</span>
            <h2 className="text-5xl md:text-7xl font-black text-[var(--text)] tracking-tighter uppercase leading-none">{t.featuresTitle}</h2>
          </div>
          <p className="text-[var(--text-muted)] max-w-md text-right hidden md:block font-medium leading-relaxed opacity-70">
            Advanced AI integration designed specifically for high-volume contributors and professional studios.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl">
          {t.features.map((f, i) => (
            <div key={i} className="bg-[var(--panel)] p-12 group relative transition-all duration-500 hover:bg-[var(--card-bg)]/50 backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-indigo-500/5">
                <f.icon className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-[var(--text)] mb-6 tracking-tight uppercase">{f.title}</h3>
              <p className="text-[var(--text-muted)] leading-relaxed text-sm font-medium opacity-80">{f.desc}</p>
              
              <div className="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                <ArrowRight className="w-6 h-6 text-indigo-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works - Hardware/Specialist Style */}
      <div className="space-y-20">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 border-b border-[var(--border)] pb-8">
          <div className="space-y-4">
            <span className="text-emerald-500 font-mono text-sm tracking-widest uppercase">02 // Workflow</span>
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--text)] tracking-tight">{t.howItWorksTitle}</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {t.steps.map((s, i) => (
            <div key={i} className="space-y-8 group">
              <div className="flex items-center gap-4">
                <span className="text-6xl font-black text-indigo-500/20 font-mono tracking-tighter group-hover:text-indigo-500/40 transition-colors">{s.step}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent"></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[var(--text)] tracking-tight">{s.title}</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platforms - Minimal Marquee */}
      <div className="py-20 border-y border-[var(--border)] relative overflow-hidden bg-indigo-500/[0.02]">
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[var(--bg)] to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[var(--bg)] to-transparent z-10"></div>
        
        <div className="flex flex-col gap-12">
          <h2 className="text-xs font-bold text-indigo-500/50 text-center uppercase tracking-[0.3em]">{t.platformsTitle}</h2>
          <div className="flex overflow-hidden">
            <div className="flex gap-16 items-center animate-[marquee_40s_linear_infinite] whitespace-nowrap px-4">
              {[...t.platforms, ...t.platforms].map((p, i) => (
                <span key={i} className="text-4xl md:text-6xl font-black text-[var(--text)] opacity-5 hover:opacity-100 transition-opacity cursor-default uppercase tracking-tighter">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ - Clean Utility */}
      <div className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-purple-500 font-mono text-sm tracking-widest uppercase">03 // Support</span>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text)] tracking-tight">{t.faqTitle}</h2>
        </div>
        
        <div className="space-y-4">
          {t.faqs.map((faq, i) => (
            <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-8 py-8 flex items-center justify-between text-left focus:outline-none"
              >
                <span className="font-bold text-xl text-[var(--text)] tracking-tight">{faq.q}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${openFaq === i ? 'bg-indigo-500 text-white rotate-180' : 'bg-[var(--bg)] text-[var(--text-muted)]'}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>
              {openFaq === i && (
                <div className="px-8 pb-8 text-[var(--text-muted)] leading-relaxed animate-in slide-in-from-top-2 duration-300 border-t border-[var(--border)] pt-6 text-lg font-light">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
