import React from "react";
import { GenerationSettings } from "../types";
import { Settings, Key, Info, ChevronDown, RefreshCw, Archive, Folder } from "lucide-react";

interface SettingsPanelProps {
  settings: GenerationSettings;
  onChange: (settings: GenerationSettings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const [showNegative, setShowNegative] = React.useState(false);
  const [showReference, setShowReference] = React.useState(false);

  const updateSetting = (key: keyof GenerationSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  const platforms = [
    { id: "general", label: "General" },
    { id: "adobe", label: "Adobe Stock", domain: "stock.adobe.com" },
    { id: "shutterstock", label: "Shutterstock", domain: "shutterstock.com" },
    { id: "freepik", label: "Freepik", domain: "freepik.com" },
    { id: "vecteezy", label: "Vecteezy", domain: "vecteezy.com" },
    { id: "dreamstime", label: "Dreamstime", domain: "dreamstime.com" },
    { id: "pond5", label: "Pond5", domain: "pond5.com" },
    { id: "istock", label: "iStock / Getty", domain: "istockphoto.com" },
    { id: "123rf", label: "123RF", domain: "123rf.com" },
    { id: "depositphotos", label: "Depositphotos", domain: "depositphotos.com" },
    { id: "envato", label: "Envato Elements", domain: "elements.envato.com" },
    { id: "creativefabrica", label: "Creative Fabrica", domain: "creativefabrica.com" },
    { id: "wirestock", label: "Wirestock", domain: "wirestock.io" },
    { id: "alamy", label: "Alamy", domain: "alamy.com" },
  ];

  return (
    <div className="glass-panel rounded-[2rem] p-6 shadow-[0_32px_64px_rgba(0,0,0,0.4)] h-full flex flex-col gap-6 relative overflow-hidden border border-white/10">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full -mr-24 -mt-24 animate-pulse"></div>
      
      <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/5 rounded-xl shadow-inner border border-white/10">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-white tracking-tight leading-none mb-1 uppercase">Configuration</h2>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Neural Parameters</span>
          </div>
        </div>
        <button 
          onClick={() => document.dispatchEvent(new CustomEvent('openApiModal'))}
          className={`text-[9px] px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 font-bold uppercase tracking-wider ${
            settings.apiKey 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
              : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 animate-pulse"
          }`}
        >
          <Key className="w-3 h-3" />
          {settings.apiKey ? "ACTIVE" : "KEYS"}
        </button>
      </div>

      <div className="flex flex-col gap-6 relative z-10 overflow-y-auto custom-scrollbar pr-2">
        {/* Platform Selection */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
              Target Platforms
            </label>
            <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md uppercase tracking-wider border border-indigo-500/20">
              {settings.platform.length} SELECTED
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {platforms.map((p) => {
              const isSelected = settings.platform.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    const newPlatforms = isSelected
                      ? settings.platform.filter(id => id !== p.id)
                      : [...settings.platform, p.id];
                    
                    const updatedPlatforms = newPlatforms.length > 0 ? newPlatforms : ["general"];
                    
                    let newTitleLength = settings.titleLength;
                    if (updatedPlatforms.includes("freepik")) {
                      newTitleLength = 98;
                    } else if (updatedPlatforms.includes("adobe")) {
                      newTitleLength = 150;
                    }
                    
                    onChange({ ...settings, platform: updatedPlatforms, titleLength: newTitleLength });
                  }}
                  className={`relative overflow-visible aspect-square rounded-2xl border transition-all flex items-center justify-center group ${
                    isSelected
                      ? `border-indigo-500 bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105 z-10`
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm text-white text-[9px] sm:text-[10px] font-bold px-1 text-center rounded-2xl opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none leading-tight">
                    {p.label}
                  </div>
                  <span className="relative z-10 flex items-center justify-center w-full h-full overflow-hidden rounded-2xl">
                    {p.domain ? (
                      <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=64`} alt={p.label} className={`w-8 h-8 object-contain transition-all duration-300 drop-shadow-sm ${!isSelected ? 'opacity-80 group-hover:opacity-100 scale-95' : 'scale-110 drop-shadow-lg filter brightness-110'}`} />
                    ) : (
                      <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 ${isSelected ? 'text-white shadow-inner scale-110' : 'text-zinc-400 group-hover:text-zinc-200 scale-95'}`}>
                        <Settings className="w-5 h-5" />
                      </div>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 rounded-2xl bg-black/20 border border-white/5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Title Precision</label>
              <span className="text-[9px] font-bold text-indigo-400">{settings.titleLength} CHR</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              value={settings.titleLength}
              onChange={(e) => updateSetting("titleLength", parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Keyword Density</label>
              <span className="text-[9px] font-bold text-indigo-400">{settings.keywordsCount} TAGS</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={settings.keywordsCount}
              onChange={(e) => updateSetting("keywordsCount", parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className={`flex flex-col gap-3 ${settings.platform.includes('adobe') && settings.platform.length === 1 ? 'opacity-30 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Description Depth</label>
              <span className="text-[9px] font-bold text-indigo-400">{settings.descriptionLength} CHR</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={settings.descriptionLength}
              disabled={settings.platform.includes('adobe') && settings.platform.length === 1}
              onChange={(e) => updateSetting("descriptionLength", parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Media Type Hint</label>
          <div className="relative">
            <select
              value={settings.mediaTypeHint}
              onChange={(e) => updateSetting("mediaTypeHint", e.target.value)}
              className="w-full bg-white/5 text-white rounded-lg px-3 py-2 text-[10px] font-bold focus:outline-none border border-white/10 hover:border-white/20 transition-all appearance-none [&>option]:bg-zinc-900"
            >
              <option value="None / Auto-detect">None / Auto-detect</option>
              <option value="Photo">Photo</option>
              <option value="Video">Video</option>
              <option value="Vector">Vector</option>
              <option value="Illustration">Illustration</option>
              <option value="Transparent PNG (isolated)">Transparent PNG (isolated)</option>
              <option value="3D icon">3D icon</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between gap-4 group">
            <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors uppercase tracking-wider">Single Word Keywords</span>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.singleWordKeywords}
                onChange={(e) => updateSetting("singleWordKeywords", e.target.checked)}
              />
              <div className="w-9 h-5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white border border-white/10"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between gap-4 group">
            <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors uppercase tracking-wider">Transparent Background</span>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.transparentBackground}
                onChange={(e) => updateSetting("transparentBackground", e.target.checked)}
              />
              <div className="w-9 h-5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white border border-white/10"></div>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Negative Keywords</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showNegative}
                onChange={(e) => setShowNegative(e.target.checked)}
              />
              <div className="w-9 h-5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white border border-white/10"></div>
            </label>
          </div>
          {showNegative && (
            <input
              type="text"
              value={settings.negativeKeywords}
              onChange={(e) => updateSetting("negativeKeywords", e.target.value)}
              placeholder="e.g. text, watermark"
              className="w-full bg-white/5 text-white rounded-lg px-3 py-2 text-[10px] font-bold focus:outline-none border border-white/10 hover:border-white/20 transition-all placeholder:text-zinc-600 animate-in slide-in-from-top-1 duration-200"
            />
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Reference Context</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showReference}
                onChange={(e) => setShowReference(e.target.checked)}
              />
              <div className="w-9 h-5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-600 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white border border-white/10"></div>
            </label>
          </div>
          {showReference && (
            <textarea
              value={settings.customPrompt || ""}
              onChange={(e) => updateSetting("customPrompt", e.target.value)}
              placeholder="e.g. Samsung S24, $1200"
              className="w-full bg-white/5 text-white rounded-lg px-3 py-2 text-[10px] font-bold focus:outline-none border border-white/10 hover:border-white/20 transition-all placeholder:text-zinc-600 min-h-[60px] resize-none animate-in slide-in-from-top-1 duration-200"
            />
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
            Embed & Save Mode / এমবেড ও সেভ মাধ্যম
          </label>
          <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => updateSetting("exportMode", "zip")}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg border transition-all ${
                (settings.exportMode || "zip") === "zip"
                  ? "bg-indigo-500/15 border-indigo-500/40 text-white shadow-lg"
                  : "bg-transparent border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <Archive className="w-4 h-4 mb-1 text-indigo-400" />
              <span className="text-[10px] font-bold">ZIP Format</span>
              <span className="text-[8px] text-zinc-500 font-medium">জিপ ফরম্যাট</span>
            </button>
            
            <button
              type="button"
              onClick={() => updateSetting("exportMode", "individual")}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg border transition-all ${
                settings.exportMode === "individual"
                  ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-lg"
                  : "bg-transparent border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <Folder className="w-4 h-4 mb-1 text-emerald-400" />
              <span className="text-[10px] font-bold leading-tight text-center">Direct Replace</span>
              <span className="text-[8px] text-zinc-500 font-medium font-bengali">ফাইল রিপ্লেসমেন্ট</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 border-t border-white/5 mt-auto">
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to refresh the app? This will reload the page to ensure you have the latest updates.")) {
                window.location.reload();
              }
            }}
            className="w-full py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[9px] font-bold uppercase tracking-wider hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2 shadow-lg group"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Synchronize App
          </button>
        </div>
      </div>
    </div>
  );
}
