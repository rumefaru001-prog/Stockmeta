import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { FileUpload } from "./components/FileUpload";
import { SettingsPanel } from "./components/SettingsPanel";
import { ResultsTable } from "./components/ResultsTable";
import { ProgressBoard } from "./components/ProgressBoard";
import { PricingModal } from "./components/PricingModal";
import { CompletionModal } from "./components/CompletionModal";
import { WelcomeModal } from "./components/WelcomeModal";
import { TutorialModal } from "./components/TutorialModal";
import { LandingContent } from "./components/LandingContent";
import { PromptGenerator } from "./components/PromptGenerator";
import { BackgroundRemover } from "./components/BackgroundRemover";
import { MediaFile, GenerationSettings } from "./types";
import { generateMetadata, testApiKey } from "./services/gemini";
import { generateCSV } from "./utils/csv";
import { parseGeminiError } from "./utils/error";
import { ChatWidget } from "./components/ChatWidget";
import { 
  X, Check, Clipboard, Trash2, Key, Crown, ShieldAlert, AlertTriangle, Upload, Sparkles, Send, Globe, Activity, Square, RefreshCw, Loader2, FileText, FileArchive, Download, Bell, Wand2, Info, ChevronDown, LogOut, ShieldCheck, Folder, Archive,
  Moon, Sun, UploadCloud,
  Image as ImageIcon,
  LayoutGrid,
  User as UserIcon,
  MessageCircle,
  Zap,
  Facebook,
  Youtube
} from "lucide-react";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot, query, collection, where, getDocFromCache, getDocFromServer, addDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import toast, { Toaster } from 'react-hot-toast';

import { HowToUseModal } from "./components/HowToUseModal";

const AdminPage = lazy(() => import("./pages/AdminPage"));

const getDeviceId = () => {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
};

const renderMarqueeText = (text: string) => {
  const parts = text.split(/(\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const match = part.match(/\[(.*?)\]\((.*?)\)/);
    if (match) {
      return (
        <a 
          key={i} 
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors inline-block mx-1"
        >
          {match[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export function MainApp() {
  const APP_VERSION = "1.0.3"; // Increment this to force a refresh for all users
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [appMode, setAppMode] = useState<'metadata' | 'prompt' | 'bg-remover'>('metadata');
  const [promptMode, setPromptMode] = useState<'trending' | 'image'>('trending');

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
        // Skip logging for other errors, as this is simply a connection test.
      }
    }
    testConnection();
  }, []);

  // Version control to force refresh on updates
  useEffect(() => {
    const savedVersion = localStorage.getItem("app_version");
    if (savedVersion !== APP_VERSION) {
      localStorage.setItem("app_version", APP_VERSION);
      if (savedVersion) {
        sessionStorage.setItem("app_updated", "true");
        // Force a clean reload from server
        window.location.reload();
      }
    }

    // Show update notification
    if (sessionStorage.getItem("app_updated") === "true") {
      toast.success("App updated to the latest version!");
      sessionStorage.removeItem("app_updated");
    }
    
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.update();
      });
    }
  }, []);

  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [nextMode, setNextMode] = useState<'metadata' | 'prompt' | 'bg-remover' | null>(null);
  const [nextSubMode, setNextSubMode] = useState<'trending' | 'image' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPromptDirty, setIsPromptDirty] = useState(false);
  const [isMetadataDirty, setIsMetadataDirty] = useState(false);
  const [isBgRemoverDirty, setIsBgRemoverDirty] = useState(false);
  const [isBgRemoverProcessing, setIsBgRemoverProcessing] = useState(false);

  // Browser exit confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (files.length > 0 || isPromptDirty || isMetadataDirty || isGenerating || isBgRemoverDirty || isBgRemoverProcessing) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [files.length, isPromptDirty, isMetadataDirty, isGenerating]);
  
  const [settings, setSettings] = useState<GenerationSettings>({
    platform: ["general"],
    titleLength: 98,
    keywordsCount: 50,
    singleWordKeywords: false,
    transparentBackground: false,
    negativeKeywords: "",
    descriptionLength: 200,
    mediaTypeHint: "None / Auto-detect",
    apiKey: "",
    exportMode: "zip",
  });

  const platforms = [
    { id: "general", label: "General" },
    { id: "adobe", label: "Adobe Stock" },
    { id: "shutterstock", label: "Shutterstock" },
    { id: "freepik", label: "Freepik" },
    { id: "vecteezy", label: "Vecteezy" },
    { id: "pond5", label: "Pond5" },
    { id: "istock", label: "iStock / Getty" },
    { id: "dreamstime", label: "Dreamstime" },
    { id: "123rf", label: "123RF" },
    { id: "depositphotos", label: "Depositphotos" },
    { id: "envato", label: "Envato Elements" },
    { id: "creativefabrica", label: "Creative Fabrica" },
    { id: "wirestock", label: "Wirestock" },
    { id: "alamy", label: "Alamy" },
  ];

  const stopRef = useRef(false);
  const keyCooldownsRef = useRef<Record<string, number>>({});
  const [showApiModal, setShowApiModal] = useState(false);
  const [showProgressBoard, setShowProgressBoard] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showEmbedOptionsModal, setShowEmbedOptionsModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDeviceLogoutModal, setShowDeviceLogoutModal] = useState(false);
  const [showDeviceEmailLockModal, setShowDeviceEmailLockModal] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [proUntil, setProUntil] = useState<Date | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [todayProcessedCount, setTodayProcessedCount] = useState(0);
  const [monthlyProcessedCount, setMonthlyProcessedCount] = useState(0);
  const [lastProcessedDate, setLastProcessedDate] = useState("");

  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [apiNotice, setApiNotice] = useState("১টি API Key দিয়ে ২৪ ঘণ্টায় প্রায় ১৫০০ ছবি প্রসেস করা যায়। ফাইল আপলোডের পর ১০ সেকেন্ড অপেক্ষা করুন। কোনো এরর আসলে সিস্টেম অটোমেটিক পুনরায় চেষ্টা করবে।");
  const [marqueeText, setMarqueeText] = useState("কারো বুঝতে কোনো অসুবিধা হলে কিংবা কোনা ধরনের ইরর আসলে আমাদের সাথে যোগাযোগ করুন: [WhatsApp](https://wa.me/) [Telegram](https://t.me/)");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [telegramLink, setTelegramLink] = useState("https://t.me/");
  const [whatsappLink, setWhatsappLink] = useState("https://wa.me/");
  const [facebookLink, setFacebookLink] = useState("https://facebook.com/");
  const [youtubeLink, setYoutubeLink] = useState("https://youtube.com/");
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);
  const [freeLimit, setFreeLimit] = useState(50);
  const [freeLimitType, setFreeLimitType] = useState<'daily' | 'monthly' | 'lifetime'>('lifetime');
  const [systemKeys, setSystemKeys] = useState<string[]>([]);
  
  interface AppNotification {
    id: string;
    title: string;
    message: string;
    createdAt: any;
    read: boolean;
    type?: 'success' | 'warning' | 'info';
    timestamp?: any;
  }
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [deletedNotifs, setDeletedNotifs] = useState<string[]>(() => JSON.parse(localStorage.getItem("deletedNotifications") || "[]"));

  const handleDeleteNotifLocal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newDeleted = [...deletedNotifs, id];
    setDeletedNotifs(newDeleted);
    localStorage.setItem("deletedNotifications", JSON.stringify(newDeleted));
  };

  const processedCountRef = useRef(0);
  const todayProcessedCountRef = useRef(0);
  const monthlyProcessedCountRef = useRef(0);
  const freeLimitRef = useRef(50);
  const freeLimitTypeRef = useRef<'daily' | 'monthly' | 'lifetime'>('lifetime');
  const lastProcessedDateRef = useRef("");
  const navigate = useNavigate();
  const [outputDirHandle, setOutputDirHandle] = useState<any>(null);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // Keep refs synced
  useEffect(() => {
    processedCountRef.current = processedCount;
  }, [processedCount]);
  useEffect(() => {
    todayProcessedCountRef.current = todayProcessedCount;
  }, [todayProcessedCount]);
  useEffect(() => {
    monthlyProcessedCountRef.current = monthlyProcessedCount;
  }, [monthlyProcessedCount]);
  useEffect(() => {
    freeLimitRef.current = freeLimit;
  }, [freeLimit]);
  useEffect(() => {
    freeLimitTypeRef.current = freeLimitType;
  }, [freeLimitType]);
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  const [tempApiKeys, setTempApiKeys] = useState<string[]>(['']);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const availableKeys = React.useMemo(() => {
    const keys = [...savedKeys];
    if (systemKeys.length > 0) {
      systemKeys.forEach(key => {
        if (!keys.includes(key)) {
          keys.push(key);
        }
      });
    }
    return keys;
  }, [savedKeys, systemKeys]);
  const [extensionOverride, setExtensionOverride] = useState<'eps' | 'ai' | 'jpg' | 'png' | 'mp4' | null>(null);

  // Prevent accidental tab close during generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating || isBgRemoverProcessing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating, isBgRemoverProcessing]);

  useEffect(() => {
    const docRef = doc(db, "settings", "general");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.noticeText !== undefined) {
          setApiNotice(data.noticeText);
        }
        if (data.marqueeText !== undefined) {
          setMarqueeText(data.marqueeText);
        }
        if (data.telegramLink !== undefined) {
          setTelegramLink(data.telegramLink);
        }
        if (data.whatsappLink !== undefined) {
          setWhatsappLink(data.whatsappLink);
        }
        if (data.facebookLink !== undefined) {
          setFacebookLink(data.facebookLink);
        }
        if (data.youtubeLink !== undefined) {
          setYoutubeLink(data.youtubeLink);
        }
        if (data.subscriptionEnabled !== undefined) {
          setSubscriptionEnabled(data.subscriptionEnabled);
        }
        if (data.freeLimit !== undefined) {
          setFreeLimit(data.freeLimit);
        }
        if (data.freeLimitType !== undefined) {
          setFreeLimitType(data.freeLimitType);
        }
      }
    }, (error) => {
      console.warn("Settings fetch failed:", error.message);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const docRef = doc(db, "settings", "keys");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().keys) {
        setSystemKeys(docSnap.data().keys);
      }
    }, (error) => {
      console.warn("System keys fetch failed:", error.message);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const readIds = JSON.parse(localStorage.getItem("readNotifications") || "[]");
      const notifs = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
          };
        })
        .filter((n: any) => !n.target || n.target === 'all' || n.target === user.uid)
        .map((n: any) => ({
          ...n,
          read: readIds.includes(n.id)
        })) as AppNotification[];
      
      setNotifications(prev => {
        if (prev.length > 0 && notifs.length > 0) {
          const newNotifs = notifs.filter(n => !prev.find(p => p.id === n.id));
          if (newNotifs.length > 0) {
            playBeep();
          }
        }
        return notifs;
      });
    }, (error) => {
      console.warn("Notification fetch failed:", error.message);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        const lockedEmail = localStorage.getItem("device_locked_email");
        if (lockedEmail && lockedEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
          setShowDeviceEmailLockModal(true);
          await auth.signOut();
          setUser(null);
          return;
        } else if (!lockedEmail) {
          localStorage.setItem("device_locked_email", currentUser.email);
        }
      }
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          let data = userSnap.exists() ? userSnap.data() : null;
          
          if (!data) {
            // Create profile if it doesn't exist
            data = {
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              processedCount: 0,
              todayProcessedCount: 0,
              lastProcessedDate: new Date().toISOString().split('T')[0],
              isPro: false,
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, data);
          } else if (data.displayName !== currentUser.displayName || data.photoURL !== currentUser.photoURL) {
            // Update profile if details changed or are missing
            await updateDoc(userRef, {
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL
            });
            data.displayName = currentUser.displayName;
            data.photoURL = currentUser.photoURL;
          }

          // Check if Pro subscription has expired
          let isUserPro = data.isPro || false;
          let expirationDate: Date | null = null;
          if (data.proUntil) {
            expirationDate = data.proUntil.toDate();
            if (isUserPro && expirationDate && expirationDate < new Date()) {
              isUserPro = false;
              expirationDate = null;
              await updateDoc(userRef, { isPro: false, proUntil: null });
              toast.error("Your Pro subscription has expired. Please renew to continue using Pro features.");
            }
          }
          
          setIsPro(isUserPro);
          setProUntil(expirationDate);
          setProcessedCount(data.processedCount || 0);
          setIsBlocked(data.isBlocked || false);
          
          const today = new Date().toISOString().split('T')[0];
          let todayCount = data.todayProcessedCount || 0;
          if (data.lastProcessedDate !== today) {
            todayCount = 0;
          }
          setTodayProcessedCount(todayCount);
          lastProcessedDateRef.current = data.lastProcessedDate || "";

        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setIsPro(false);
        setProUntil(null);
        setProcessedCount(0);
        setIsBlocked(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const deviceId = getDeviceId();
    const userRef = doc(db, "users", user.uid);
    
    // Update device ID
    setDoc(userRef, { currentDeviceId: deviceId }, { merge: true }).catch(console.error);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        if (data.currentDeviceId && data.currentDeviceId !== deviceId) {
          setShowDeviceLogoutModal(true);
          auth.signOut();
        }
        
        if (data.isBlocked) {
          setIsBlocked(true);
          auth.signOut();
          toast.error("Your account has been blocked by the administrator.");
        }

        // Sync other data
        setIsPro(data.isPro || false);
        setProcessedCount(data.processedCount || 0);
        
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = today.substring(0, 7);

        let todayCount = data.todayProcessedCount || 0;
        if (data.lastProcessedDate !== today) {
          todayCount = 0;
        }

        let monthCount = data.monthlyProcessedCount || 0;
        if (data.lastProcessedMonth !== currentMonth) {
          monthCount = 0;
        }

        setTodayProcessedCount(todayCount);
        setMonthlyProcessedCount(monthCount);
        lastProcessedDateRef.current = data.lastProcessedDate || today;
      }
    });

    return () => unsubscribe();
  }, [user]);

  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const fileUploadRef = useRef<{ handleGlobalDrop: (e: DragEvent) => void }>(null);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (appMode === 'metadata' && !isGenerating) {
        setIsGlobalDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) {
        setIsGlobalDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsGlobalDragging(false);
      
      if (appMode === 'metadata' && !isGenerating && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        if (fileUploadRef.current) {
          fileUploadRef.current.handleGlobalDrop(e);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [appMode, isGenerating]);

  useEffect(() => {
    if (!user) {
      setHasPendingRequest(false);
      return;
    }

    const q = query(
      collection(db, "requests"),
      where("userId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasPendingRequest(!snapshot.empty);
    }, (error) => {
      console.error("Error checking pending requests:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const savedKeysStr = localStorage.getItem("geminiApiKeys");
    if (savedKeysStr) {
      try {
        const keys = JSON.parse(savedKeysStr);
        setSavedKeys(keys);
        
        const activeKey = localStorage.getItem("geminiApiKeyActive");
        if (activeKey && keys.includes(activeKey)) {
          setSettings((prev) => ({ ...prev, apiKey: activeKey }));
        } else if (keys.length > 0) {
          setSettings((prev) => ({ ...prev, apiKey: keys[0] }));
          localStorage.setItem("geminiApiKeyActive", keys[0]);
        }
      } catch (e) {
        console.error("Failed to parse saved keys");
      }
    }

    const handleOpenModal = () => setShowApiModal(true);
    document.addEventListener('openApiModal', handleOpenModal);
    
    // Show welcome modal for new users
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcomeModal(true);
    }
    
    return () => {
      document.removeEventListener('openApiModal', handleOpenModal);
    };
  }, []);

  const handleCloseWelcomeModal = () => {
    sessionStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcomeModal(false);
  };

  const handleSaveNewKeys = async () => {
    const validKeys = tempApiKeys.map(k => k.trim()).filter(k => k !== '');
    if (validKeys.length === 0) return;
    
    const newKeys = [...new Set([...validKeys, ...savedKeys])];
    setSavedKeys(newKeys);
    localStorage.setItem("geminiApiKeys", JSON.stringify(newKeys));
    
    let newActiveKey = settings.apiKey;
    if (!settings.apiKey && validKeys.length > 0) {
      newActiveKey = validKeys[0];
      setSettings((prev) => ({ ...prev, apiKey: newActiveKey }));
      localStorage.setItem("geminiApiKeyActive", newActiveKey);
    }
    
    setTempApiKeys(['']);

    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          apiKeys: newKeys,
          activeApiKey: newActiveKey
        });
      } catch (error) {
        console.error("Failed to save keys to Firestore", error);
      }
    }
  };

  const handleSetActiveKey = async (key: string) => {
    setSettings((prev) => ({ ...prev, apiKey: key }));
    localStorage.setItem("geminiApiKeyActive", key);

    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          activeApiKey: key
        });
      } catch (error) {
        console.error("Failed to update active key in Firestore", error);
      }
    }
  };

  const [testingKey, setTestingKey] = useState<string | null>(null);

  const handleTestKey = async (keyToTest: string) => {
    setTestingKey(keyToTest);
    try {
      const isValid = await testApiKey(keyToTest);
      if (isValid) {
        toast.success(`API Key (...${keyToTest.slice(-4)}) is valid and working!`);
      } else {
        toast.error(`API Key (...${keyToTest.slice(-4)}) returned an empty response.`);
      }
    } catch (error: any) {
      const cleanError = parseGeminiError(error);
      toast.error(`API Key (...${keyToTest.slice(-4)}) failed: ${cleanError}`);
    } finally {
      setTestingKey(null);
    }
  };

  const handleDeleteKey = async (keyToDelete: string) => {
    const newKeys = savedKeys.filter(k => k !== keyToDelete);
    setSavedKeys(newKeys);
    localStorage.setItem("geminiApiKeys", JSON.stringify(newKeys));
    
    let nextActive = settings.apiKey;
    if (settings.apiKey === keyToDelete) {
      nextActive = newKeys.length > 0 ? newKeys[0] : "";
      setSettings((prev) => ({ ...prev, apiKey: nextActive }));
      if (nextActive) {
        localStorage.setItem("geminiApiKeyActive", nextActive);
      } else {
        localStorage.removeItem("geminiApiKeyActive");
      }
    }

    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          apiKeys: newKeys,
          activeApiKey: nextActive
        });
      } catch (error) {
        console.error("Failed to delete key from Firestore", error);
      }
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && result.user.email) {
        const lockedEmail = localStorage.getItem("device_locked_email");
        if (lockedEmail && lockedEmail.toLowerCase() !== result.user.email.toLowerCase()) {
          setShowDeviceEmailLockModal(true);
          await auth.signOut();
          setUser(null);
          setIsLoggingIn(false);
          return;
        } else if (!lockedEmail) {
          localStorage.setItem("device_locked_email", result.user.email);
        }
      }
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
      }
      
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        toast.error(`Firebase Error: This domain (${domain}) is not authorized. Please add it to your Firebase Console.`);
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Popup blocked by your browser. Please allow popups or open the app in a new tab.");
      } else if (error.code === 'auth/configuration-not-found') {
        toast.error("Firebase Error: Google Sign-in is not enabled in Firebase Console.");
      } else if (error.code === 'auth/network-request-failed') {
        toast.error("Network error. Please check your connection and try again.");
      } else if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        toast.error(`Login failed: ${error.message}. Try opening in a new tab.`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatKeyDisplay = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const handleFilesSelected = (newFiles: MediaFile[], dirHandle?: any) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    let currentUsage = processedCount;
    if (freeLimitType === 'daily') currentUsage = todayProcessedCount;
    if (freeLimitType === 'monthly') currentUsage = monthlyProcessedCount;
    
    if (subscriptionEnabled && !isPro && currentUsage + newFiles.length > freeLimit) {
      toast.error(`Free limit reached (${freeLimit} images). Please upgrade to Pro.`);
      setShowPricingModal(true);
      return;
    }
    setFiles((prev) => [...newFiles, ...prev]);
    if (dirHandle) {
      setOutputDirHandle(dirHandle);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateFile = (id: string, updates: Partial<MediaFile['metadata']>) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, metadata: { ...f.metadata, ...updates } }
          : f
      )
    );
  };

  const processFiles = async (filesToProcess: MediaFile[]) => {
    if (filesToProcess.length === 0) return;
    
    if (isBlocked) {
      toast.error("Your account has been blocked. You cannot process images.");
      return;
    }
    
    let currentUsageRef = processedCountRef.current;
    if (freeLimitTypeRef.current === 'daily') currentUsageRef = todayProcessedCountRef.current;
    if (freeLimitTypeRef.current === 'monthly') currentUsageRef = monthlyProcessedCountRef.current;

    if (subscriptionEnabled && !isPro && currentUsageRef >= freeLimitRef.current) {
      setShowPricingModal(true);
      return;
    }
    
    if (availableKeys.length === 0) {
      toast.error("Please add at least 1 API key for processing.");
      setShowApiModal(true);
      return;
    }

    const AVAILABLE_MODELS = [
      "gemini-3.1-flash-lite-preview",
      "gemini-flash-latest",
      "gemini-3-flash-preview",
      "gemini-3.1-pro-preview",
      "gemini-2.5-flash",
      "gemini-2.0-flash"
    ];

    setIsGenerating(true);
    setShowProgressBoard(true);
    stopRef.current = false;

    // Reset cooldowns for a fresh start
    keyCooldownsRef.current = {};

    const pendingQueue = [...filesToProcess];
    const localStatus = new Map<string, string>();
    filesToProcess.forEach(f => localStatus.set(f.id, "pending"));
    
    // Immediately update UI to show pending status and clear old metadata
    const idsToProcess = new Set(filesToProcess.map(f => f.id));
    setFiles(prev => prev.map(f => idsToProcess.has(f.id) ? { ...f, status: "pending", error: undefined, metadata: undefined } : f));

    // Scale concurrency based on number of available keys. Max 15 concurrent requests.
    const CONCURRENCY = Math.min(15, availableKeys.length * 3);

    const getAvailableResource = async () => {
      while (!stopRef.current) {
        let earliestCooldown = Infinity;
        let hasValidKeys = false;

        for (const key of availableKeys) {
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
        
        // If we get here, all resources are on cooldown.
        const now = Date.now();
        if (earliestCooldown > now && earliestCooldown !== Infinity) {
           const waitTime = earliestCooldown - now;
           if (waitTime > 3600000) { // If wait time is > 1 hour, it means all models are 403'd or invalid
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

    const worker = async () => {
      while (pendingQueue.length > 0 && !stopRef.current) {
        if (isBlocked) {
          toast.error("Your account has been blocked. You cannot process images.");
          break;
        }

        let currentUsageRef = processedCountRef.current;
        if (freeLimitTypeRef.current === 'daily') currentUsageRef = todayProcessedCountRef.current;
        if (freeLimitTypeRef.current === 'monthly') currentUsageRef = monthlyProcessedCountRef.current;

        if (subscriptionEnabled && !isPro && currentUsageRef >= freeLimitRef.current) {
          setShowPricingModal(true);
          break;
        }

        // Pull a batch of files (up to 5)
        const batchSize = 5;
        const currentBatch: MediaFile[] = [];
        for (let i = 0; i < batchSize; i++) {
          const f = pendingQueue.shift();
          if (f) currentBatch.push(f);
        }
        
        if (currentBatch.length === 0) break;

        // Update UI for all files in batch
        currentBatch.forEach(file => {
          localStatus.set(file.id, "generating");
        });
        setFiles(prev => prev.map(f => {
          const inBatch = currentBatch.find(bf => bf.id === f.id);
          return inBatch ? { ...f, status: "generating", error: undefined, metadata: undefined } : f;
        }));

        let success = false;
        let fileRetries = 0;
        const MAX_FILE_RETRIES = Math.max(5, availableKeys.length * AVAILABLE_MODELS.length);

        try {
          while (!success && fileRetries < MAX_FILE_RETRIES && !stopRef.current) {
             const resource = await getAvailableResource();
             if (!resource) break;

             try {
               const inputItems = currentBatch.map(file => ({
                 type: file.originalType || 'image',
                 file: file.file,
                 frames: file.videoFrames
               }));

               const metadataResults = await generateMetadata(
                 inputItems, 
                 { ...settings, apiKey: resource.key },
                 resource.model
               );
               
               if (stopRef.current) break;
               
               // Map results back to files
               currentBatch.forEach((file, index) => {
                 const metadata = metadataResults[index] || metadataResults[0];
                 localStatus.set(file.id, "success");
                 setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: "success", metadata } : f));
               });
               
               setProcessedCount(prev => prev + currentBatch.length);
               setTodayProcessedCount(prev => prev + currentBatch.length);
               setMonthlyProcessedCount(prev => prev + currentBatch.length);
               success = true;
               
               if (user) {
                 try {
                   const today = new Date().toISOString().split('T')[0];
                   const currentMonth = today.substring(0, 7);
                   const isSameDay = lastProcessedDateRef.current === today;
                   const isSameMonth = lastProcessedDateRef.current.substring(0, 7) === currentMonth;
                   const userRef = doc(db, "users", user.uid);
                   await updateDoc(userRef, { 
                     processedCount: increment(currentBatch.length),
                     todayProcessedCount: isSameDay ? increment(currentBatch.length) : currentBatch.length,
                     lastProcessedDate: today,
                     monthlyProcessedCount: isSameMonth ? increment(currentBatch.length) : currentBatch.length,
                     lastProcessedMonth: currentMonth
                   });
                   lastProcessedDateRef.current = today;
                 } catch (dbError) {
                   console.error("Failed to update processed count:", dbError);
                 }
               }
               
               keyCooldownsRef.current[resource.resourceId] = Date.now() + 2000;
               
              } catch (error: any) {
               if (stopRef.current) break;
               
               const errMsg = (error.message || "").toLowerCase();
               let parsedErrorMsg = error.message || "Unknown error";
               try {
                 const parsed = JSON.parse(parsedErrorMsg);
                 if (parsed.error && parsed.error.message) {
                   parsedErrorMsg = parsed.error.message;
                 }
               } catch (e) {}
               
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
               } else if (errMsg.includes("429") || errMsg.includes("rate limit") || errMsg.includes("too many requests") || errMsg.includes("quota") || errMsg.includes("exhausted")) {
                 let cooldownTime = 60000; // Default 60s
                 const retryMatch = parsedErrorMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
                 if (retryMatch && retryMatch[1]) {
                   cooldownTime = Math.ceil(parseFloat(retryMatch[1])) * 1000 + 2000; // Add 2s buffer
                 } else if (errMsg.includes("daily") || errMsg.includes("perday") || errMsg.includes("limit: 0")) {
                   cooldownTime = 24 * 60 * 60 * 1000; // 24 hours
                 }
                 
                 // Apply cooldown to the entire key if it's a quota issue
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
                 // Other error - disable this specific model for this key for a short time
                 console.error("Unknown API error:", error);
                 toast.error(`API Error: ${parsedErrorMsg.substring(0, 100)}`, { id: `unknown-${resource.resourceId}` });
                 keyCooldownsRef.current[resource.resourceId] = Date.now() + 10000; // 10s cooldown
               }
               
               fileRetries++;
               if (fileRetries >= MAX_FILE_RETRIES) {
                  currentBatch.forEach(file => {
                    localStatus.set(file.id, "error");
                    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: "error", error: `Failed after retries: ${parsedErrorMsg}` } : f));
                  });
               }
             }
          }
        } catch (workerError: any) {
          console.error("Worker error:", workerError);
          currentBatch.forEach(file => {
            localStatus.set(file.id, "error");
            setFiles(prev => prev.map(f => f.id === file.id && f.status === "generating" ? { ...f, status: "error", error: workerError.message || "Worker error" } : f));
          });
        }
      }
    };

    try {
      const workers = Array(CONCURRENCY).fill(null).map(() => worker());
      await Promise.all(workers);
      
      if (!stopRef.current) {
        let failedFiles = filesToProcess.filter(f => localStatus.get(f.id) === "error");
        let globalRetries = 0;
        const MAX_GLOBAL_RETRIES = 3;

        while (failedFiles.length > 0 && globalRetries < MAX_GLOBAL_RETRIES && !stopRef.current) {
          globalRetries++;
          toast.loading(`Retrying ${failedFiles.length} failed images (Attempt ${globalRetries}/${MAX_GLOBAL_RETRIES})...`, { id: 'retry-toast' });
          
          // Add them back to the queue
          pendingQueue.push(...failedFiles);
          
          // Run workers again
          const retryWorkers = Array(CONCURRENCY).fill(null).map(() => worker());
          await Promise.all(retryWorkers);
          
          toast.dismiss('retry-toast');
          failedFiles = filesToProcess.filter(f => localStatus.get(f.id) === "error");
        }

        if (failedFiles.length > 0) {
           toast.error(`${failedFiles.length} images failed to process after retries.`, { duration: 5000 });
        }
        setShowProgressBoard(false);
        setShowCompletionModal(true);
        playBeep();
      }
    } catch (e: any) {
      if (!stopRef.current) {
        toast.error(e.message || "An error occurred during processing.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    const pendingFiles = files.filter(f => f.status === "pending" || f.status === "error");
    processFiles(pendingFiles);
  };

  const handleRegenerate = (id?: string) => {
    if (isGenerating) return;
    const targetFiles = files.filter(f => id ? f.id === id : f.status === "error");
    processFiles(targetFiles);
  };

  const handleStop = () => {
    stopRef.current = true;
    setIsGenerating(false);
    setFiles(prev => prev.map(f => f.status === "generating" ? { ...f, status: "pending", metadata: undefined, error: undefined } : f));
  };

  const handleExportCSV = async () => {
    const successfulFiles = files.filter((f) => f.status === "success");
    if (successfulFiles.length === 0) {
      toast.error("No successfully generated files to export.");
      return;
    }
    await generateCSV(successfulFiles, settings, extensionOverride, outputDirHandle);
    if (outputDirHandle) {
      toast.success("CSV saved automatically to the selected folder!");
    }
  };

  const handleExportZIP = async (overrideMode?: "zip" | "individual") => {
    const successfulFiles = files.filter((f) => f.status === "success");
    if (successfulFiles.length === 0) {
      toast.error("No successfully generated files to export.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const { embedMetadata } = await import("./utils/metadata");
      
      const zip = new JSZip();
      const addedNames = new Set<string>();
      
      let savedDirectly = false;
      const mode = overrideMode || settings.exportMode || "zip";

      if (outputDirHandle) {
        try {
          // Verify permission
          const options = { mode: 'readwrite' };
          if ((await outputDirHandle.queryPermission(options)) !== 'granted') {
            if ((await outputDirHandle.requestPermission(options)) !== 'granted') {
              throw new Error("Permission not granted to write to the selected directory.");
            }
          }
          
          if (mode === "individual") {
            // "অটোমেটিক ইমেজ replacement" - Save files individually inside outputDirHandle without creating a zip
            for (const f of successfulFiles) {
              if (!f.metadata || !f.originalFile) continue;
              
              const title = f.metadata.title || "";
              const description = f.metadata.description || "";
              const keywords = f.metadata.keywords || "";
              
              // Embed metadata into the original file
              const rating = f.metadata.rating !== undefined ? f.metadata.rating : 5;
              const newBlob = await embedMetadata(f.originalFile, title, description, keywords, rating);
              
              // CRITICAL: Strictly use the original file name as uploaded. Name of the file is NEVER edited to include the title.
              let filename = f.originalFileName || f.file.name;
              if (extensionOverride) {
                filename = filename.replace(/\.[^/.]+$/, `.${extensionOverride}`);
              }
              
              let finalName = filename;
              let counter = 1;
              while (addedNames.has(finalName)) {
                const parts = filename.split('.');
                const ext = parts.pop();
                const name = parts.join('.');
                finalName = `${name}_${counter}.${ext}`;
                counter++;
              }
              addedNames.add(finalName);
              
              const fileHandle = await outputDirHandle.getFileHandle(finalName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(newBlob);
              await writable.close();
            }
            toast.success("All images with embedded metadata have been updated directly inside your folder!");
          } else {
            // "ZIP containing embedded files"
            for (const f of successfulFiles) {
              if (!f.metadata || !f.originalFile) continue;
              
              const title = f.metadata.title || "";
              const description = f.metadata.description || "";
              const keywords = f.metadata.keywords || "";
              
              const rating = f.metadata.rating !== undefined ? f.metadata.rating : 5;
              const newBlob = await embedMetadata(f.originalFile, title, description, keywords, rating);
              
              // CRITICAL: Strictly use the original file name as uploaded. Name of the file is NEVER edited to include the title.
              let filename = f.originalFileName || f.file.name;
              if (extensionOverride) {
                filename = filename.replace(/\.[^/.]+$/, `.${extensionOverride}`);
              }
              
              let finalName = filename;
              let counter = 1;
              while (addedNames.has(finalName)) {
                const parts = filename.split('.');
                const ext = parts.pop();
                const name = parts.join('.');
                finalName = `${name}_${counter}.${ext}`;
                counter++;
              }
              addedNames.add(finalName);
              
              zip.file(finalName, newBlob);
            }
            
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const fileHandle = await outputDirHandle.getFileHandle("metadata_embedded_images.zip", { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(zipBlob);
            await writable.close();
            toast.success("ZIP containing embedded files saved directly to the selected folder!");
          }
          
          savedDirectly = true;
        } catch (err: any) {
          console.error("Failed to write to folder directly, falling back to download", err);
          toast.error(`Direct folder save failed: ${err.message || err}. Downloading ZIP instead.`);
          savedDirectly = false;
        }
      }
      
      if (!savedDirectly) {
        // Fallback ZIP generation and standard browser download
        const fallbackZip = new JSZip();
        addedNames.clear();
        for (const f of successfulFiles) {
          if (!f.metadata || !f.originalFile) continue;
          
          const title = f.metadata.title || "";
          const description = f.metadata.description || "";
          const keywords = f.metadata.keywords || "";
          
          const rating = f.metadata.rating !== undefined ? f.metadata.rating : 5;
          const newBlob = await embedMetadata(f.originalFile, title, description, keywords, rating);
          
          // CRITICAL: Strictly use the original file name as uploaded. Name of the file is NEVER edited to include the title.
          let filename = f.originalFileName || f.file.name;
          if (extensionOverride) {
            filename = filename.replace(/\.[^/.]+$/, `.${extensionOverride}`);
          }
          
          let finalName = filename;
          let counter = 1;
          while (addedNames.has(finalName)) {
            const parts = filename.split('.');
            const ext = parts.pop();
            const name = parts.join('.');
            finalName = `${name}_${counter}.${ext}`;
            counter++;
          }
          addedNames.add(finalName);
          
          fallbackZip.file(finalName, newBlob);
        }
        
        const zipBlob = await fallbackZip.generateAsync({ type: "blob" });
        saveAs(zipBlob, "metadata_embedded_images.zip");
        if (mode === "individual") {
          toast.success("Direct folder save requires a 'Select Folder' setup first. Downloaded as ZIP instead!");
        } else {
          toast.success("ZIP containing embedded files downloaded!");
        }
      }
    } catch (error) {
      console.error("Error creating export file:", error);
      toast.error("Failed to export files.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearAll = () => {
    setFiles([]);
    setShowProgressBoard(false);
  };

    const doneCount = files.filter(f => f.status === "success").length;
    const pendingCount = files.filter(f => f.status === "pending" || f.status === "generating").length;
    const errorCount = files.filter(f => f.status === "error").length;

    const handleModeSwitch = (newMode: 'metadata' | 'prompt' | 'bg-remover', subMode?: 'trending' | 'image') => {
      if (appMode === newMode && (!subMode || promptMode === subMode)) return;
      
      let hasWork = false;
      if (appMode === 'metadata') {
        hasWork = files.length > 0;
      } else if (appMode === 'prompt') {
        hasWork = isPromptDirty;
      } else if (appMode === 'bg-remover') {
        hasWork = isBgRemoverDirty;
      }
      
      if (hasWork) {
        setNextMode(newMode);
        if (subMode) setNextSubMode(subMode);
        setShowSwitchConfirm(true);
      } else {
        setAppMode(newMode);
        if (subMode) setPromptMode(subMode);
      }
    };

    return (
      <>
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#18181b',
          border: '1px solid #27272a',
          color: '#fff',
        },
      }} />

      {/* Completion Modal */}
      {showCompletionModal && (
        <CompletionModal
          done={doneCount}
          pending={pendingCount}
          error={errorCount}
          onDownloadCSV={handleExportCSV}
          onDownloadZIP={handleExportZIP}
          exportMode={settings.exportMode}
          onSetExportMode={(mode) => setSettings(prev => ({ ...prev, exportMode: mode }))}
          onClose={() => setShowCompletionModal(false)}
        />
      )}

      {/* Embed Choice Options Dialog / এমবেড ও ডাউনলোডের অপশন */}
      {showEmbedOptionsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#18181b] border border-zinc-800 rounded-[2rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.6)] relative overflow-hidden p-6 sm:p-8">
            <button 
              onClick={() => setShowEmbedOptionsModal(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 shadow-lg inline-block mb-3 animate-pulse">
                Save Options / সেভ অপশন
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Select Embed & Save Mode</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                আপনার মেটাডেটা ইমেজগুলো কিভাবে সেভ করতে চান তা নির্ধারণ করুন
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Option 1: ZIP format */}
              <button
                type="button"
                onClick={async () => {
                  setShowEmbedOptionsModal(false);
                  setSettings(prev => ({ ...prev, exportMode: 'zip' }));
                  await handleExportZIP('zip');
                }}
                className="group relative flex flex-col items-center justify-start p-5 rounded-2xl border border-zinc-800 bg-black/30 hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.98] min-h-[220px]"
              >
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                  <Archive className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-0.5">ZIP Format</h4>
                <p className="text-[10px] font-bold text-indigo-400 mb-2 font-bengali">জিপ ফরম্যাট</p>
                <p className="text-[11px] font-medium text-zinc-400 leading-relaxed font-bengali">
                  এটিতে ক্লিক করলে আপনার ফাইলগুলো জিপ ফরম্যাটে কম্প্রেস হয়ে ডাউনলোড হয়ে যাবে।
                </p>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Check className="w-4 h-4 text-indigo-400" />
                </div>
              </button>

              {/* Option 2: Direct Replace */}
              <button
                type="button"
                onClick={async () => {
                  setShowEmbedOptionsModal(false);
                  setSettings(prev => ({ ...prev, exportMode: 'individual' }));
                  await handleExportZIP('individual');
                }}
                className="group relative flex flex-col items-center justify-start p-5 rounded-2xl border border-zinc-800 bg-black/30 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-[0.98] min-h-[220px]"
              >
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <Folder className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-0.5">Direct File Replacement</h4>
                <p className="text-[10px] font-bold text-emerald-400 mb-2 font-bengali">ডিরেক্ট ফাইল রিপ্লেসমেন্ট</p>
                <p className="text-[11px] font-medium text-zinc-400 leading-relaxed font-bengali">
                  এটিতে ক্লিক করলে আপনার ফাইলগুলো আগে যে ছবি থাকবে ওগুলোর সাথে সরাসরি রিপ্লেস হয়ে যাবে, আলাদাভাবে কিছুই করতে হবে না।
                </p>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
              </button>
            </div>

            <p className="text-[10px] text-zinc-500 text-center leading-relaxed max-w-sm mx-auto">
              * Direct Replace অপশনটি কাজ করার জন্য ডানপাশের সেটিংসে গিয়ে &quot;Select Folder&quot; বোতামের মাধ্যমে সোর্স ফোল্ডারটি কানেক্ট করা থাকতে হবে।
            </p>
          </div>
        </div>
      )}

      {/* Progress Board */}
      {showProgressBoard && (
        <ProgressBoard 
          total={files.length}
          done={doneCount}
          pending={pendingCount}
          error={errorCount}
          processedCount={processedCount}
          isPro={isPro}
          onClose={() => setShowProgressBoard(false)}
        />
      )}

      {/* API Key Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowApiModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-white">API Configuration</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Connect your Google Gemini API key to enable AI generation. Keys are stored locally in your browser.
              <br/><br/>
              <span className="text-amber-400 font-medium">Requirement:</span> You must add at least <strong>1 API key</strong> to ensure smooth processing.
              <br/><br/>
              <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 w-fit"><Activity className="w-3 h-3" /> নোট</span> 
              <span className="text-white font-bold text-xs block mt-2 p-3 bg-indigo-500/20 rounded-lg border border-indigo-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] leading-relaxed backdrop-blur-md">
                {apiNotice}
              </span>
            </p>
            
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tempApiKeys[0] || ""}
                  onChange={(e) => {
                    const newKeys = [e.target.value];
                    setTempApiKeys(newKeys);
                  }}
                  placeholder="Paste Gemini API key (AIza...)"
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNewKeys()}
                />
                <button
                  onClick={handleSaveNewKeys}
                  disabled={!tempApiKeys[0]?.trim()}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {savedKeys.map((key) => {
                const isActive = settings.apiKey === key;
                return (
                  <div 
                    key={key} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isActive 
                        ? "bg-indigo-500/10 border-indigo-500/50" 
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-zinc-700'}`}></div>
                      <span className={`font-mono text-sm ${isActive ? "text-indigo-200" : "text-zinc-500"}`}>
                        {formatKeyDisplay(key)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleTestKey(key)}
                        disabled={testingKey === key}
                        className={`px-2 py-1 rounded-md transition-all flex items-center gap-1.5 text-[10px] font-bold ${
                          testingKey === key 
                            ? "bg-amber-500/20 text-amber-400 animate-pulse" 
                            : "bg-white/5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                        title="Test API Key"
                      >
                        <Activity className={`w-3.5 h-3.5 ${testingKey === key ? 'animate-pulse text-amber-400' : ''}`} />
                        <span>{testingKey === key ? "Testing..." : "Test API Key"}</span>
                      </button>
                      {!isActive && (
                        <button 
                          onClick={() => handleSetActiveKey(key)}
                          className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                          title="Set as active"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => copyToClipboard(key)}
                        className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
                        title="Copy key"
                      >
                        <Clipboard className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteKey(key)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                        title="Delete key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1 group"
              >
                Get a free API key <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </a>
              <button
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && (
        <PricingModal 
          onClose={() => setShowPricingModal(false)} 
          isPro={isPro}
          user={user}
          freeLimit={freeLimit}
          freeLimitType={freeLimitType}
        />
      )}

      <aside className="w-20 border-r border-[var(--border)] bg-[var(--bg)] hidden lg:flex flex-col sticky top-0 h-screen z-50 py-6 items-center transition-colors duration-300">
        <div className="mb-8">
          <div className="w-10 h-10 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.2)] rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5">
            <div className="w-full h-full bg-[#05070a] rounded-[14px] flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 35 L50 18 L80 35" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 52 L50 35 L80 52" stroke="#818cf8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M50 52 L80 69 L50 86 L20 69 Z" stroke="#a78bfa" strokeWidth="8" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-6 flex-1 items-center">
          <button 
            onClick={() => handleModeSwitch('metadata')} 
            className="flex flex-col items-center gap-1.5 group relative"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${appMode === 'metadata' ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/10'}`}>
              <FileText className={`w-5 h-5 ${appMode === 'metadata' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
            </div>
            <span className={`text-[8px] font-black tracking-widest uppercase transition-colors ${appMode === 'metadata' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
              Metadata
            </span>
          </button>

          <button 
            onClick={() => handleModeSwitch('prompt', 'trending')} 
            className="flex flex-col items-center gap-1.5 group relative"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${appMode === 'prompt' && promptMode === 'trending' ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/10'}`}>
              <Wand2 className={`w-5 h-5 ${appMode === 'prompt' && promptMode === 'trending' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
            </div>
            <span className={`text-[8px] font-black tracking-widest uppercase transition-colors ${appMode === 'prompt' && promptMode === 'trending' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
              Trending Items Prompt
            </span>
          </button>

          <button 
            onClick={() => handleModeSwitch('prompt', 'image')} 
            className="flex flex-col items-center gap-1.5 group relative"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${appMode === 'prompt' && promptMode === 'image' ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/10'}`}>
              <ImageIcon className={`w-5 h-5 ${appMode === 'prompt' && promptMode === 'image' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
            </div>
            <span className={`text-[8px] font-black tracking-widest uppercase transition-colors ${appMode === 'prompt' && promptMode === 'image' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
              Img Prompt
            </span>
          </button>

          <button 
            onClick={() => handleModeSwitch('bg-remover')} 
            className="flex flex-col items-center gap-1.5 group relative"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border ${appMode === 'bg-remover' ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/10'}`}>
              <Sparkles className={`w-5 h-5 ${appMode === 'bg-remover' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
            </div>
            <span className={`text-[8px] font-black tracking-widest uppercase transition-colors ${appMode === 'bg-remover' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
              BG Remover
            </span>
          </button>

          <button 
            onClick={() => setShowContactModal(true)}
            className="flex flex-col items-center gap-1.5 group relative"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/10">
              <MessageCircle className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
            </div>
            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-500 group-hover:text-zinc-300">
              Contact
            </span>
          </button>

          <button 
            onClick={() => setShowTutorialModal(true)}
            className="flex flex-col items-center gap-1.5 group relative"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border bg-white/5 border-white/5 group-hover:bg-white/10 group-hover:border-white/10">
              <Youtube className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
            </div>
            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-500 group-hover:text-zinc-300">
              Tutorial
            </span>
          </button>
        </nav>

        <div className="pt-4 border-t border-white/5 flex flex-col items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 group-hover:bg-white/10 transition-all">
              {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </div>
            <span className="text-[7px] font-black tracking-widest uppercase text-zinc-500 group-hover:text-zinc-300">
              {isDarkMode ? 'Dark' : 'Light'}
            </span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/10 bg-indigo-500/10 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 px-4 py-1 sm:px-6 max-w-[1800px] mx-auto w-full">
          <span className="shrink-0 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 border border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/30">
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-ping absolute"></span>
            <span className="w-1 h-1 rounded-full bg-indigo-400 relative"></span>
            System Active
          </span>
          <div className="relative flex-1 overflow-hidden h-5 flex items-center group">
            <div className="whitespace-nowrap text-[10px] font-bold text-white w-max animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused] flex items-center drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              <span className="mr-8">{renderMarqueeText(marqueeText)}</span>
              <span className="mr-8">{renderMarqueeText(marqueeText)}</span>
              <span className="mr-8">{renderMarqueeText(marqueeText)}</span>
              <span className="mr-8">{renderMarqueeText(marqueeText)}</span>
              <span className="mr-8">{renderMarqueeText(marqueeText)}</span>
              <span className="mr-8">{renderMarqueeText(marqueeText)}</span>
            </div>
          </div>
        </div>
      </div>

      <header className={`sticky top-3 z-40 mx-4 sm:mx-6 mb-4 ${files.length > 0 ? 'max-w-full' : 'max-w-[1800px] xl:mx-auto'} rounded-2xl border border-[var(--border)] glass-panel shadow-2xl bg-[var(--panel)] backdrop-blur-2xl px-3 sm:px-6 py-2`}>
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            {/* Session Stats */}
            <div className="flex items-center gap-3 px-3 py-1 rounded-xl glass-panel border border-[var(--border)] bg-[var(--card-bg)]/20">
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-none mb-1">Today Process</span>
                <span className="text-emerald-400 font-black text-xs leading-none tabular-nums">{todayProcessedCount}</span>
              </div>
              <div className="w-px h-5 bg-[var(--border)]"></div>
              <div className="flex flex-col items-start">
                <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-none mb-1">Total Process</span>
                <span className="text-indigo-400 font-black text-xs leading-none tabular-nums">{processedCount}</span>
              </div>
            </div>
            
            {/* Credits */}
            {subscriptionEnabled && !isPro && (
              <div className="flex items-center gap-3 px-3 py-1 rounded-xl glass-panel border border-[var(--border)] bg-[var(--card-bg)]/20">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-none">
                      {freeLimitType === 'daily' ? 'Daily' : freeLimitType === 'monthly' ? 'Monthly' : 'Lifetime'} Credits
                    </span>
                    <span className="text-[var(--text)] font-black text-[10px] leading-none">
                      {Math.max(0, freeLimit - (freeLimitType === 'daily' ? todayProcessedCount : freeLimitType === 'monthly' ? monthlyProcessedCount : processedCount))}
                    </span>
                  </div>
                  <div className="w-20 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                      style={{ width: `${(Math.max(0, freeLimit - (freeLimitType === 'daily' ? todayProcessedCount : freeLimitType === 'monthly' ? monthlyProcessedCount : processedCount)) / freeLimit) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Button */}
            {user && (user.email === "ahfarhan001@gmail.com" || user.email === "rume.faru001@gmail.com") && (
              <button 
                onClick={() => navigate("/admin")}
                className="h-10 px-4 rounded-xl bg-red-500/10 text-red-400 text-[11px] font-black tracking-widest uppercase hover:bg-red-500/20 transition border border-red-500/20 flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                Admin
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {subscriptionEnabled && !isPro && (
                <button 
                  onClick={() => setShowPricingModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-black tracking-widest uppercase">
                    Update to Pro
                  </span>
                </button>
              )}
              
              <button
                onClick={() => setLanguage(l => l === 'en' ? 'bn' : 'en')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--text)]/5 text-[var(--text-muted)] hover:text-[var(--text)] transition-all border border-[var(--border)]"
                title={language === 'en' ? 'বাংলা' : 'English'}
              >
                <Globe className="w-4 h-4" />
                <span className="text-[10px] font-black tracking-widest uppercase">
                  {language === 'en' ? 'EN' : 'BN'}
                </span>
              </button>
              
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-2.5 rounded-xl bg-[var(--text)]/5 text-[var(--text-muted)] hover:text-[var(--text)] transition-all relative"
                    >
                      <Bell className="w-5 h-5" />
                      {notifications.filter(n => !n.read && !deletedNotifs.includes(n.id)).length > 0 && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg)]"></span>
                      )}
                    </button>
                    
                    {showNotifications && (
                      <div className="absolute right-0 mt-4 w-80 bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="p-4 border-b border-[var(--border)] bg-[var(--text)]/5 flex items-center justify-between">
                          <h3 className="text-xs font-black tracking-widest uppercase text-[var(--text)]">Intelligence Feed</h3>
                          <span className="text-[10px] text-[var(--text-muted)] font-bold">{notifications.filter(n => !n.read && !deletedNotifs.includes(n.id)).length} New</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          {notifications.filter(n => !deletedNotifs.includes(n.id)).length > 0 ? (
                            notifications.filter(n => !deletedNotifs.includes(n.id)).map((notification) => (
                              <div 
                                key={notification.id}
                                className={`p-4 border-b border-[var(--border)] hover:bg-[var(--text)]/[0.02] transition-colors relative group ${!notification.read ? 'bg-indigo-500/[0.03]' : ''}`}
                              >
                                <div className="flex gap-3">
                                  <div className={`mt-1 p-1.5 rounded-lg ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : notification.type === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                    <Info className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1">
                                    {notification.title && (
                                      <h4 className="text-[11px] font-black text-[var(--text)] mb-1 uppercase tracking-wider">{notification.title}</h4>
                                    )}
                                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mb-2">{notification.message}</p>
                                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                                      {notification.timestamp instanceof Date ? notification.timestamp.toLocaleTimeString() : 'Just now'}
                                    </span>
                                  </div>
                                </div>
                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notification.read && (
                                    <button 
                                      onClick={() => {
                                        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                                        const readIds = JSON.parse(localStorage.getItem("readNotifications") || "[]");
                                        if (!readIds.includes(notification.id)) {
                                          readIds.push(notification.id);
                                          localStorage.setItem("readNotifications", JSON.stringify(readIds));
                                        }
                                      }}
                                      className="p-1 hover:text-indigo-400 text-[var(--text-muted)] transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => handleDeleteNotifLocal(e, notification.id)}
                                    className="p-1 hover:text-rose-400 text-[var(--text-muted)] transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-10 text-center">
                              <Bell className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-20" />
                              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">No active alerts</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-[var(--text)]/5 border border-[var(--border)] hover:border-[var(--text)]/10 transition-all"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-lg">
                        {user.displayName ? user.displayName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showProfileMenu && (
                      <div className="absolute right-0 mt-4 w-56 bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="p-4 border-b border-[var(--border)] bg-[var(--text)]/5">
                          <p className="text-[11px] font-black text-[var(--text)] truncate mb-0.5">{user.displayName || 'Neural Entity'}</p>
                          <p className="text-[9px] text-[var(--text-muted)] truncate font-medium">{user.email}</p>
                        </div>

                        {subscriptionEnabled && (
                          <div className="p-3 border-b border-[var(--border)]">
                            <div className="bg-[var(--text)]/5 rounded-xl p-3 border border-[var(--border)]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Current Plan</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isPro ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                                  {isPro ? 'PRO' : 'FREE'}
                                </span>
                              </div>
                              {!isPro ? (
                                <div className="text-[11px] font-medium text-[var(--text)]">
                                  {freeLimit} Items / {freeLimitType === 'daily' ? 'Daily' : freeLimitType === 'monthly' ? 'Monthly' : 'Lifetime'}
                                </div>
                              ) : (
                                <div className="text-[11px] font-medium text-[var(--text)]">
                                  Valid until: {proUntil ? new Date(proUntil).toLocaleDateString() : 'Lifetime'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="p-2">
                          <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          >
                            <LogOut className="w-4 h-4" />
                            Terminate Session
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="h-10 px-6 rounded-xl bg-white text-black text-[11px] font-black tracking-widest uppercase hover:bg-zinc-200 transition-all shadow-xl"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {appMode === 'metadata' ? (
        <main className={`flex-1 flex flex-col gap-4 p-4 sm:p-6 ${files.length > 0 ? 'max-w-full' : 'max-w-[1800px] mx-auto'} w-full relative z-10`}>
          {/* Top Section: Settings + Upload */}
          <div className={`flex flex-col lg:flex-row gap-4 ${files.length > 0 ? 'items-start' : ''}`}>
            <aside className={`${isSidebarCollapsed ? 'hidden' : 'w-full lg:w-[320px] xl:w-[340px]'} flex-shrink-0 flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-700 self-start lg:sticky lg:top-24 h-[calc(100vh-7rem)] overflow-y-auto no-scrollbar`}>
              <SettingsPanel settings={settings} onChange={setSettings} />
            </aside>

            <div className="flex-1 flex flex-col gap-4 min-w-0 animate-in fade-in slide-in-from-right-4 duration-700 relative">
              {isGlobalDragging && (
                <div 
                  className="absolute inset-0 z-50 bg-[var(--bg)]/60 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
                  onClick={() => setIsGlobalDragging(false)}
                >
                  <div 
                    className="bg-slate-900/90 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 border border-white/10 w-[400px] pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center animate-bounce">
                      <UploadCloud className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-wider">Drop Files Here</h3>
                    <p className="text-sm text-zinc-400 text-center max-w-xs leading-relaxed">
                      Release to instantly process multiple files or entire folders.
                    </p>
                  </div>
                </div>
              )}
              <div className={`${files.length > 0 ? '' : 'max-w-3xl mx-auto'} w-full`}>
                <FileUpload ref={fileUploadRef} onFilesSelected={handleFilesSelected} isGenerating={isGenerating} compact={files.length > 0} pendingCount={files.filter(f => f.status === "pending" || f.status === "error").length} />
              </div>

              {/* Bottom Section: Controls & Results Table */}
              {files.length > 0 && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                  {/* Action Bar */}
                  <div className="flex flex-col xl:flex-row items-center justify-between gap-4 py-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Left Section (File count + Extensions) */}
                    <div className="flex items-center gap-4 flex-wrap w-full xl:w-auto">
                      <div className="px-5 py-2.5 rounded-2xl border border-white/5 bg-black/40 shadow-inner text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center justify-center shrink-0">
                        {files.length} FILES QUEUED
                      </div>
                      <div className="w-[1px] h-6 bg-white/10 hidden sm:block shrink-0"></div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-white/5 bg-black/40 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                        {['eps', 'ai', 'jpg', 'png', 'mp4'].map((ext) => {
                          const isActive = extensionOverride === ext;
                          let activeColors = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
                          if (ext === 'eps') activeColors = "bg-orange-500/20 text-orange-300 border-orange-500/30";
                          if (ext === 'ai') activeColors = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
                          if (ext === 'jpg') activeColors = "bg-blue-500/20 text-blue-300 border-blue-500/30";
                          if (ext === 'png') activeColors = "bg-purple-500/20 text-purple-300 border-purple-500/30";
                          if (ext === 'mp4') activeColors = "bg-red-500/20 text-red-300 border-red-500/30";
                          
                          return (
                            <button
                              key={ext}
                              onClick={() => setExtensionOverride(isActive ? null : ext as any)}
                              className={`px-4 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all ${
                                isActive
                                  ? `${activeColors} shadow-inner scale-95`
                                  : "bg-white/5 text-zinc-500 border-white/10 hover:bg-white/10 hover:text-zinc-300"
                              }`}
                            >
                              .{ext}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Section (Actions) */}
                    <div className="flex flex-col items-center sm:items-end gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                      <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end w-full">
                        <button
                          onClick={handleClearAll}
                          disabled={isGenerating}
                          className="px-5 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0 flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Clear
                        </button>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center p-1.5 rounded-2xl sm:rounded-[1.25rem] border border-white/5 bg-black/40 gap-1.5 sm:gap-2">
                          {isGenerating ? (
                            <button
                              onClick={handleStop}
                              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 text-xs font-bold uppercase tracking-widest shadow-[0_4px_14px_rgba(245,158,11,0.4)] transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0 flex items-center justify-center gap-2 shrink-0"
                            >
                              <span className="w-3.5 h-3.5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin"></span>
                              Stop
                            </button>
                          ) : (
                            <button
                              onClick={handleGenerate}
                              disabled={files.length === 0}
                              className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest shadow-[0_4px_14px_rgba(99,102,241,0.4)] transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100 shrink-0"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Generate All
                            </button>
                          )}
                          
                          <div className="w-[1px] h-6 bg-white/10 mx-1 hidden sm:block"></div>

                          <button
                            onClick={handleExportCSV}
                            disabled={files.filter((f) => f.status === "success").length === 0 || isGenerating}
                            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100 shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5" /> Export CSV
                          </button>

                          <button
                            onClick={() => {
                              const successfulFiles = files.filter((f) => f.status === "success");
                              if (successfulFiles.length === 0) {
                                toast.error("No successfully generated files to export.");
                                return;
                              }
                              setShowEmbedOptionsModal(true);
                            }}
                            disabled={files.filter((f) => f.status === "success").length === 0 || isGenerating}
                            className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100 shrink-0 ${
                              settings.exportMode === "individual"
                                ? "bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 shadow-[0_4px_14px_rgba(99,102,241,0.3)]"
                                : "bg-sky-500 hover:bg-sky-400 active:bg-sky-600 shadow-[0_4px_14px_rgba(14,165,233,0.3)]"
                            }`}
                          >
                            {settings.exportMode === "individual" ? (
                              <>
                                <Folder className="w-3.5 h-3.5" /> Embed & Replace
                              </>
                            ) : (
                              <>
                                <Archive className="w-3.5 h-3.5" /> Embed & ZIP
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="pr-2">
                        <span className="text-[10px] text-sky-400/80 font-medium uppercase tracking-wider flex items-center justify-center sm:justify-end gap-1.5">
                          <Check className="w-3 h-3" /> Applicable for JPG and PNG only
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--card-bg)]/50 border border-[var(--border)] rounded-xl p-4 shadow-inner">
                      <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="text-[var(--text-muted)]">Summary:</span>
                        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                          <Check className="w-3.5 h-3.5" /> {doneCount} done
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                          <Loader2 className="w-3.5 h-3.5" /> {pendingCount} pending
                        </div>
                        <div className="flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-md">
                          <X className="w-3.5 h-3.5" /> {errorCount} error
                        </div>
                      </div>
                      <div className="text-[9px] text-[var(--text)] font-bold flex items-center gap-2 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 shadow-sm">
                        <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
                        <span className="tracking-wide">{apiNotice}</span>
                      </div>
                    </div>

                    <div className="border border-[var(--border)] rounded-xl overflow-hidden glass-panel min-h-[400px] shadow-xl relative">
                      <ResultsTable 
                        files={files} 
                        onRemove={handleRemoveFile} 
                        onRegenerate={handleRegenerate}
                        onUpdate={handleUpdateFile}
                        isGenerating={isGenerating}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-zinc-500 mt-2 gap-4 border-t border-white/5 pt-6 animate-in fade-in duration-500 delay-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span>SECURE ENCLAVE ACTIVE • NO API KEYS STORED ON SERVER</span>
                    </div>
                    <button 
                      onClick={() => setShowHowToUse(true)}
                      className="px-4 py-2 rounded-lg glass-button text-zinc-400 text-[11px] hover:text-white transition self-start sm:self-auto font-medium tracking-wide uppercase"
                    >
                      Documentation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {files.length === 0 && <LandingContent lang={language} onGetStarted={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />}
        </main>
      ) : appMode === 'prompt' ? (
        <main className="flex-1 flex flex-col gap-8 p-4 sm:p-8 max-w-[1800px] mx-auto w-full">
          <PromptGenerator 
            mode={promptMode}
            apiKeys={availableKeys} 
            user={user}
            isPro={isPro}
            subscriptionEnabled={subscriptionEnabled}
            freeLimit={freeLimit}
            freeLimitType={freeLimitType}
            processedCount={processedCount}
            todayProcessedCount={todayProcessedCount}
            monthlyProcessedCount={monthlyProcessedCount}
            onDirtyChange={setIsPromptDirty}
            onGeneratingChange={setIsGenerating}
            onShowPricing={() => setShowPricingModal(true)}
            onShowLogin={() => setShowLoginModal(true)}
            onShowApiSettings={() => setShowApiModal(true)}
            onGenerate={async (count) => {
              const today = new Date().toISOString().split('T')[0];
              const currentMonth = today.substring(0, 7);
              const isSameDay = lastProcessedDateRef.current === today;
              const isSameMonth = lastProcessedDateRef.current.substring(0, 7) === currentMonth;
              
              setProcessedCount(prev => prev + count);
              setTodayProcessedCount(prev => isSameDay ? prev + count : count);
              setMonthlyProcessedCount(prev => isSameMonth ? prev + count : count);
              lastProcessedDateRef.current = today;
              
              if (user) {
                try {
                  const userRef = doc(db, "users", user.uid);
                  await updateDoc(userRef, { 
                    processedCount: increment(count),
                    todayProcessedCount: isSameDay ? increment(count) : count,
                    lastProcessedDate: today,
                    monthlyProcessedCount: isSameMonth ? increment(count) : count,
                    lastProcessedMonth: currentMonth
                  });
                } catch (dbError) {
                  console.error("Failed to update processed count:", dbError);
                }
              }
            }}
          />
        </main>
      ) : (
        <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-[1800px] mx-auto w-full h-full relative z-10">
          <BackgroundRemover 
            user={user}
            apiKeys={availableKeys}
            isPro={isPro}
            subscriptionEnabled={subscriptionEnabled}
            freeLimit={freeLimit}
            freeLimitType={freeLimitType}
            processedCount={processedCount}
            todayProcessedCount={todayProcessedCount}
            monthlyProcessedCount={monthlyProcessedCount}
            onDirtyChange={setIsBgRemoverDirty}
            onGeneratingChange={setIsBgRemoverProcessing}
            onShowPricing={() => setShowPricingModal(true)}
            onShowLogin={() => setShowLoginModal(true)}
            onShowApiSettings={() => setShowApiModal(true)}
            onGenerate={async (count) => {
              const today = new Date().toISOString().split('T')[0];
              const currentMonth = today.substring(0, 7);
              const isSameDay = lastProcessedDateRef.current === today;
              const isSameMonth = lastProcessedDateRef.current.substring(0, 7) === currentMonth;
              
              setProcessedCount(prev => prev + count);
              setTodayProcessedCount(prev => isSameDay ? prev + count : count);
              setMonthlyProcessedCount(prev => isSameMonth ? prev + count : count);
              lastProcessedDateRef.current = today;
              
              if (user) {
                try {
                  const userRef = doc(db, "users", user.uid);
                  await updateDoc(userRef, { 
                    processedCount: increment(count),
                    todayProcessedCount: isSameDay ? increment(count) : count,
                    lastProcessedDate: today,
                    monthlyProcessedCount: isSameMonth ? increment(count) : count,
                    lastProcessedMonth: currentMonth
                  });
                } catch (dbError) {
                  console.error("Failed to update processed count:", dbError);
                }
              }
            }}
          />
        </main>
      )}
      
      <footer className="py-16 border-t border-[var(--border)] mt-auto bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="font-bold text-2xl tracking-tight text-[var(--text)]">StockMeta <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span></span>
            </div>
            <p className="text-[var(--text-muted)] text-sm max-w-2xl leading-relaxed">
              The world's most advanced AI-powered <strong>stock metadata generator</strong>. Optimize your <strong>stock photography SEO</strong> with high-converting titles, descriptions, and keywords. Perfect for Shutterstock, Adobe Stock, Getty Images, and more.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[11px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
            <span className="hover:text-[var(--text)] transition-colors cursor-default">Stock Metadata Generator</span>
            <span className="hover:text-[var(--text)] transition-colors cursor-default">Image Keyword Generator</span>
            <span className="hover:text-[var(--text)] transition-colors cursor-default">Stock Photo SEO</span>
            <span className="hover:text-[var(--text)] transition-colors cursor-default">AI Keywording Tool</span>
            <span className="hover:text-[var(--text)] transition-colors cursor-default">CSV Metadata Export</span>
          </div>

          <div className="flex items-center gap-4 mt-4">
            {facebookLink && (
              <a href={facebookLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-[var(--text)]/5 text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
            )}
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-[var(--text)]/5 text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="WhatsApp">
                <MessageCircle className="w-5 h-5" />
              </a>
            )}
            {telegramLink && (
              <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-[var(--text)]/5 text-[var(--text-muted)] hover:text-sky-400 hover:bg-sky-500/10 transition-all" title="Telegram">
                <Send className="w-5 h-5" />
              </a>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-[var(--text-muted)] text-[10px] font-medium tracking-[0.2em] uppercase">
              © {new Date().getFullYear()} StockMeta AI • Empowering Stock Contributors Worldwide
            </p>
          </div>
        </div>
      </footer>
      
      {showHowToUse && <HowToUseModal onClose={() => setShowHowToUse(false)} />}

      {showSwitchConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md overflow-hidden shadow-2xl relative border border-amber-500/20">
            <div className="p-8">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">আপনি কি লিভ নিবেন? / Leave Page?</h2>
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                Any unsaved progress in the current mode will be lost. Are you sure you want to switch?<br/><br/>
                <span className="text-amber-400/80">বর্তমান মোডের কোনো সেভ না করা কাজ হারিয়ে যাবে। আপনি কি নিশ্চিতভাবে মোড পরিবর্তন করতে চান?</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSwitchConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-zinc-800 text-white hover:bg-zinc-700 transition-all"
                >
                  Cancel / বাতিল
                </button>
                <button
                  onClick={() => {
                    if (nextMode) {
                      setFiles([]);
                      setIsPromptDirty(false);
                      setIsMetadataDirty(false);
                      setIsBgRemoverDirty(false);
                      setAppMode(nextMode);
                      if (nextSubMode) setPromptMode(nextSubMode);
                    }
                    setShowSwitchConfirm(false);
                    setNextMode(null);
                    setNextSubMode(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-500 transition-all"
                >
                  Yes, Switch / হ্যাঁ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showWelcomeModal && (
        <WelcomeModal 
          onClose={handleCloseWelcomeModal} 
          telegramLink={telegramLink}
          whatsappLink={whatsappLink}
          facebookLink={facebookLink}
          youtubeLink={youtubeLink}
        />
      )}

      {showTutorialModal && (
        <TutorialModal 
          onClose={() => setShowTutorialModal(false)} 
          isAdmin={user?.email === "ahfarhan001@gmail.com" || user?.email === "rume.faru001@gmail.com"} 
        />
      )}

      {showContactModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md overflow-hidden shadow-2xl relative border border-indigo-500/20">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-8">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Contact Admin / অ্যাডমিনের সাথে যোগাযোগ</h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                If you have any issues, suggestions, or need help, send us a message directly.<br/>
                <span className="text-indigo-400/80">আপনার কোনো সমস্যা বা পরামর্শ থাকলে সরাসরি আমাদের মেসেজ পাঠান।</span>
              </p>

              <div className="flex flex-col gap-3 mb-8">
                {facebookLink && (
                  <a 
                    href={facebookLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-400 hover:bg-blue-600/20 transition-all text-sm font-bold w-full"
                  >
                    <Facebook className="w-5 h-5" /> Facebook
                  </a>
                )}
                {whatsappLink && (
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20 transition-all text-sm font-bold w-full"
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </a>
                )}
                {telegramLink && (
                  <a 
                    href={telegramLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-sky-600/10 border border-sky-600/20 text-sky-400 hover:bg-sky-600/20 transition-all text-sm font-bold w-full"
                  >
                    <Send className="w-5 h-5" /> Telegram
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeviceLogoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md overflow-hidden shadow-2xl relative border border-rose-500/20">
            <div className="p-8">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Logged Out / লগ আউট</h2>
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                Your account was accessed from another device. To ensure security, you can only be logged in on one device at a time.<br/><br/>
                <span className="text-rose-400/80">আপনার অ্যাকাউন্টটি অন্য একটি ডিভাইসে লগইন করা হয়েছে। নিরাপত্তার স্বার্থে একই সাথে একাধিক ডিভাইসে লগইন থাকা সম্ভব নয়।</span>
              </p>
              <button
                onClick={() => setShowDeviceLogoutModal(false)}
                className="w-full py-3 rounded-xl font-bold bg-zinc-800 text-white hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeviceEmailLockModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md overflow-hidden shadow-2xl relative border border-rose-500/30">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500"></div>
            <div className="p-8">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Access Denied / প্রবেশাধিকার নিষিদ্ধ</h2>
              <div className="text-sm text-zinc-300 mb-8 space-y-4 leading-relaxed font-medium">
                <p className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl font-bengali text-[15px] leading-relaxed">
                  আপনি ইতিমধ্যে একটি ভিন্ন জিমেইল দিয়ে এই ডিভাইসে লগইন করেছেন। নিরাপত্তার স্বার্থে এক ডিভাইসে একাধিক জিমেইল অ্যাকাউন্ট ব্যবহার করার অনুমতি নেই।
                </p>
                <p className="text-zinc-400 text-xs text-center border-t border-zinc-800/80 pt-4 leading-relaxed font-sans">
                  Locked email on this device :<br />
                  <span className="text-zinc-200 font-bold bg-zinc-900 border border-zinc-800/50 px-2.5 py-1 rounded inline-block mt-1 select-all">{localStorage.getItem("device_locked_email")}</span>
                </p>
                <p className="text-[10px] text-zinc-500 text-center select-none leading-normal">
                  You have already logged into this device with a different Gmail account. Accessing multiple accounts on a single device is strictly blocked.
                </p>
              </div>
              <button
                onClick={() => setShowDeviceEmailLockModal(false)}
                className="w-full py-3.5 rounded-xl font-extrabold text-sm bg-zinc-800 text-white hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                ঠিক আছে / OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-8">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <Key className="w-6 h-6 text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
                Please sign in with Google to access the neural engine. This ensures secure handling of your data and API quotas.
              </p>
              <button
                onClick={async () => {
                  if (isLoggingIn) return;
                  setIsLoggingIn(true);
                  try {
                    const result = await signInWithPopup(auth, googleProvider);
                    if (result.user && result.user.email) {
                      const lockedEmail = localStorage.getItem("device_locked_email");
                      if (lockedEmail && lockedEmail.toLowerCase() !== result.user.email.toLowerCase()) {
                        setShowDeviceEmailLockModal(true);
                        await auth.signOut();
                        setUser(null);
                        setIsLoggingIn(false);
                        setShowLoginModal(false);
                        return;
                      } else if (!lockedEmail) {
                        localStorage.setItem("device_locked_email", result.user.email);
                      }
                    }
                    setShowLoginModal(false);
                  } catch (error: any) {
                    if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
                      console.error("Login failed:", error);
                      if (error.code === 'auth/unauthorized-domain') {
                        const domain = window.location.hostname;
                        toast.error(`Login failed: Unauthorized domain (${domain}). Please add it to your Firebase Console.`);
                      } else if (error.code === 'auth/popup-blocked') {
                        toast.error("Popup blocked by your browser. Please allow popups or open the app in a new tab.");
                      } else if (error.code === 'auth/network-request-failed') {
                        toast.error("Network error. Please check your connection and try again.");
                      } else {
                        toast.error(`Login failed: ${error.message}. Try opening in a new tab.`);
                      }
                    }
                  } finally {
                    setIsLoggingIn(false);
                  }
                }}
                disabled={isLoggingIn}
                className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-black transition-all font-bold ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-zinc-200'}`}
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="text-lg font-bold">G</span>
                )}
                {isLoggingIn ? "Connecting..." : "Sign in with Google"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ChatWidget />
      </div>
    </div>
    </>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}
