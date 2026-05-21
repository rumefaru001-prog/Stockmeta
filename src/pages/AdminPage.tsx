import React, { useEffect, useState } from "react";
import { X, Check, Trash2, Settings, List, Save, Users, Edit2, Key, Activity, Plus, Loader2, ArrowLeft, Bell, MessageSquare, CheckCircle, MessageCircle, Send } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot, where, serverTimestamp, addDoc, limit } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { testApiKey } from "../services/gemini";
import { parseGeminiError } from "../utils/error";
import { useNavigate } from "react-router-dom";

interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  bkashNumber: string;
  transactionId: string;
  plan: string;
  status: string;
  createdAt: any;
}

interface UserData {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isPro: boolean;
  proUntil?: any;
  processedCount: number;
  todayProcessedCount?: number;
  lastProcessedDate?: string;
  createdAt: any;
  isBlocked?: boolean;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"requests" | "pricing" | "users" | "keys" | "notifications" | "chats">("requests");
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const [plan1, setPlan1] = useState({ months: 1, price: 90 });
  const [plan2, setPlan2] = useState({ months: 6, price: 490 });
  const [noticeText, setNoticeText] = useState("");
  const [marqueeText, setMarqueeText] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);
  const [freeLimit, setFreeLimit] = useState(50);
  const [freeLimitType, setFreeLimitType] = useState<"daily" | "monthly" | "lifetime">("lifetime");
  const [savingPricing, setSavingPricing] = useState(false);
  
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [customDays, setCustomDays] = useState<number>(30);

  const [systemKeys, setSystemKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState("");
  const [testingKey, setTestingKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && (currentUser.email === "ahfarhan001@gmail.com" || currentUser.email === "rume.faru001@gmail.com")) {
        setUser(currentUser);
        fetchRequests();
        fetchPricing();
        fetchNotice();
        fetchUsers();
        fetchSystemKeys();
        fetchNotifications();
      } else if (currentUser) {
        // Not an admin
        navigate("/");
      } else {
        // Not logged in
        navigate("/");
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user || (user.email !== "ahfarhan001@gmail.com" && user.email !== "rume.faru001@gmail.com")) return;

    // Fetch Chats
    const chatsQuery = query(collection(db, "chats"), orderBy("lastTimestamp", "desc"));
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Chats fetch error:", error);
    });

    return () => unsubscribeChats();
  }, [user]);

  useEffect(() => {
    if (!selectedChat) {
      setChatMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, "chats", selectedChat.id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Messages fetch error:", error);
    });

    return () => unsubscribeMessages();
  }, [selectedChat]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedChat) return;

    setSendingReply(true);
    try {
      await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
        text: replyMessage.trim(),
        sender: 'admin',
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", selectedChat.id), {
        lastMessage: replyMessage.trim(),
        lastTimestamp: serverTimestamp()
      });

      setReplyMessage("");
    } catch (error) {
      console.error("Error sending reply:", error);
      setMessage({ text: "Failed to send reply", type: "error" });
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => {
    if (!user || (user.email !== "ahfarhan001@gmail.com" && user.email !== "rume.faru001@gmail.com")) return;

    const q = query(collection(db, "users"));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
      
      // Sort client-side to handle missing createdAt fields
      userData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setUsers(userData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => unsubscribeUsers();
  }, [user]);

  const fetchUsers = async () => {
    // Kept for compatibility if called elsewhere, but real-time is handled by useEffect
  };

  const fetchSystemKeys = async () => {
    try {
      const docSnap = await getDoc(doc(db, "settings", "keys"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.keys) setSystemKeys(data.keys);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "settings/keys");
    }
  };

  const fetchNotifications = () => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdminNotifications(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "notifications");
    });
  };

  useEffect(() => {
    if (!user || (user.email !== "ahfarhan001@gmail.com" && user.email !== "rume.faru001@gmail.com")) return;
    const unsubscribeNotifs = fetchNotifications();
    return () => unsubscribeNotifs();
  }, [user]);

  const handleSaveSystemKeys = async (updatedKeys: string[]) => {
    setSavingPricing(true);
    try {
      await setDoc(doc(db, "settings", "keys"), { keys: updatedKeys });
      setSystemKeys(updatedKeys);
      setMessage({ text: "System API keys updated successfully!", type: "success" });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, "settings/keys");
      setMessage({ text: `Failed to update system keys: ${error.message}`, type: "error" });
    } finally {
      setSavingPricing(false);
    }
  };

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    if (systemKeys.includes(newKey.trim())) {
      setMessage({ text: "This key is already in the list.", type: "error" });
      return;
    }
    const updated = [...systemKeys, newKey.trim()];
    handleSaveSystemKeys(updated);
    setNewKey("");
  };

  const handleDeleteKey = (keyToDelete: string) => {
    const updated = systemKeys.filter(k => k !== keyToDelete);
    handleSaveSystemKeys(updated);
  };

  const handleTestSystemKey = async (key: string) => {
    setTestingKey(key);
    setMessage(null);
    try {
      const isValid = await testApiKey(key);
      if (isValid) {
        setMessage({ text: `API Key (...${key.slice(-4)}) is valid and working!`, type: "success" });
      } else {
        setMessage({ text: `API Key (...${key.slice(-4)}) test failed. Key might be invalid or restricted.`, type: "error" });
      }
    } catch (error: any) {
      console.error("API test error:", error);
      const cleanError = parseGeminiError(error);
      setMessage({ text: `API Key (...${key.slice(-4)}) failed: ${cleanError}`, type: "error" });
    } finally {
      setTestingKey(null);
    }
  };

  const fetchNotice = async () => {
    try {
      const docSnap = await getDoc(doc(db, "settings", "general"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.noticeText !== undefined) setNoticeText(data.noticeText);
        if (data.marqueeText !== undefined) setMarqueeText(data.marqueeText);
        if (data.telegramLink !== undefined) setTelegramLink(data.telegramLink);
        if (data.whatsappLink !== undefined) setWhatsappLink(data.whatsappLink);
        if (data.facebookLink !== undefined) setFacebookLink(data.facebookLink);
        if (data.youtubeLink !== undefined) setYoutubeLink(data.youtubeLink);
        if (data.subscriptionEnabled !== undefined) setSubscriptionEnabled(data.subscriptionEnabled);
        if (data.freeLimit !== undefined) setFreeLimit(data.freeLimit);
        if (data.freeLimitType !== undefined) setFreeLimitType(data.freeLimitType);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "settings/general");
    }
  };

  const fetchPricing = async () => {
    try {
      const docSnap = await getDoc(doc(db, "settings", "pricing"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.plan1) setPlan1(data.plan1);
        if (data.plan2) setPlan2(data.plan2);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "settings/pricing");
    }
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    setMessage(null);
    try {
      await setDoc(doc(db, "settings", "pricing"), { plan1, plan2 });
      setMessage({ text: "Pricing updated successfully!", type: "success" });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, "settings/pricing");
      setMessage({ text: `Failed to update pricing: ${error.message}`, type: "error" });
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSaveNotice = async () => {
    setSavingPricing(true);
    setMessage(null);
    try {
      await setDoc(doc(db, "settings", "general"), {
        noticeText,
        marqueeText,
        telegramLink,
        whatsappLink,
        facebookLink,
        youtubeLink,
        subscriptionEnabled,
        freeLimit,
        freeLimitType
      });
      setMessage({ text: "General settings updated successfully!", type: "success" });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, "settings/general");
      setMessage({ text: `Failed to update settings: ${error.message}`, type: "error" });
    } finally {
      setSavingPricing(false);
    }
  };

  const handleDeleteAdminNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setMessage({ text: "Notification deleted successfully.", type: "success" });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
      setMessage({ text: `Failed to delete notification: ${error.message}`, type: "error" });
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) return;
    setSendingNotif(true);
    setMessage(null);
    try {
      await addDoc(collection(db, "notifications"), {
        title: notifTitle,
        message: notifMessage,
        createdAt: serverTimestamp(),
        read: false,
        type: 'info',
        target: 'all'
      });
      setNotifTitle("");
      setNotifMessage("");
      setMessage({ text: "Notification sent successfully!", type: "success" });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, "notifications");
      setMessage({ text: `Failed to send notification: ${error.message}`, type: "error" });
    } finally {
      setSendingNotif(false);
    }
  };

  useEffect(() => {
    if (!user || (user.email !== "ahfarhan001@gmail.com" && user.email !== "rume.faru001@gmail.com")) return;

    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRequest[];
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "requests");
      setMessage({ text: "Failed to load requests.", type: "error" });
      setLoading(false);
    });

    return () => unsubscribeRequests();
  }, [user]);

  const fetchRequests = async () => {
    // Kept for compatibility if called elsewhere, but real-time is handled by useEffect
  };

  const handleApprove = async (request: PaymentRequest, customDuration?: number) => {
    setMessage(null);
    try {
      const planDays = customDuration || (request.plan === "6_months" ? 180 : 30);
      const proUntil = new Date();
      proUntil.setDate(proUntil.getDate() + planDays);

      await updateDoc(doc(db, "requests", request.id), { status: "approved" });
      await updateDoc(doc(db, "users", request.userId), { 
        isPro: true, 
        proUntil: proUntil 
      });
      
      fetchRequests();
      fetchUsers();
      setMessage({ text: `User ${request.userEmail} upgraded to Pro successfully!`, type: "success" });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${request.id}`);
      setMessage({ text: `Failed to approve request: ${error.message}`, type: "error" });
    }
  };

  const handleUpdateUserAccess = async (userId: string, days: number) => {
    setMessage(null);
    try {
      if (days <= 0) {
        await updateDoc(doc(db, "users", userId), { isPro: false, proUntil: null });
        setMessage({ text: "User access revoked successfully.", type: "success" });
      } else {
        const proUntil = new Date();
        proUntil.setDate(proUntil.getDate() + days);
        await updateDoc(doc(db, "users", userId), { isPro: true, proUntil: proUntil });
        setMessage({ text: `User access updated to ${days} days.`, type: "success" });
      }
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setMessage({ text: `Failed to update user: ${error.message}`, type: "error" });
    }
  };

  const handleBlockUser = async (userId: string, isBlocked: boolean) => {
    setMessage(null);
    try {
      await updateDoc(doc(db, "users", userId), { isBlocked });
      setMessage({ text: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully.`, type: "success" });
      fetchUsers();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setMessage({ text: `Failed to update user status: ${error.message}`, type: "error" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    setMessage(null);
    try {
      await deleteDoc(doc(db, "users", userId));
      setMessage({ text: "User deleted successfully.", type: "success" });
      fetchUsers();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      setMessage({ text: `Failed to delete user: ${error.message}`, type: "error" });
    }
  };

  const handleReject = async (id: string) => {
    setMessage(null);
    try {
      await deleteDoc(doc(db, "requests", id));
      fetchRequests();
      setMessage({ text: "Request rejected and deleted.", type: "success" });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${id}`);
      setMessage({ text: `Failed to reject request: ${error.message}`, type: "error" });
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-bg)] p-6 rounded-3xl border border-[var(--border)]">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/")}
                className="p-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all border border-[var(--border)]"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Admin Control Center</h1>
                <p className="text-sm text-[var(--text-muted)]">Manage users, requests, and system settings</p>
              </div>
            </div>
            
            <div className="flex gap-2 bg-black/20 p-1 rounded-xl border border-[var(--border)]">
              {[
                { id: "requests", icon: List, label: "Requests" },
                { id: "users", icon: Users, label: "Users" },
                { id: "keys", icon: Key, label: "API Keys" },
                { id: "notifications", icon: Bell, label: "Notifications" },
                { id: "chats", icon: MessageCircle, label: "Live Chat" },
                { id: "pricing", icon: Settings, label: "Settings" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setMessage(null); }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                    activeTab === tab.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2 duration-300 ${
              message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] overflow-hidden min-h-[600px]">
            <div className="p-6">
              {activeTab === "requests" ? (
                loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-[var(--text-muted)] font-medium">Loading requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center text-[var(--text-muted)] py-20">No payment requests found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">
                          <th className="px-4 py-2">User</th>
                          <th className="px-4 py-2">Plan</th>
                          <th className="px-4 py-2">Transaction</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((req) => (
                          <tr key={req.id} className="group">
                            <td className="px-4 py-4 bg-[var(--bg)]/50 rounded-l-2xl border-y border-l border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors">
                              <div className="font-bold text-[var(--text)]">{req.userEmail}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{new Date(req.createdAt?.toDate()).toLocaleString()}</div>
                            </td>
                            <td className="px-4 py-4 bg-[var(--bg)]/50 border-y border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors">
                              <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                                {req.plan === "1_month" ? "1 Month" : "6 Months"}
                              </span>
                            </td>
                            <td className="px-4 py-4 bg-[var(--bg)]/50 border-y border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors">
                              <div className="text-[var(--text)] font-mono text-xs">{req.bkashNumber}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">{req.transactionId || "N/A"}</div>
                            </td>
                            <td className="px-4 py-4 bg-[var(--bg)]/50 border-y border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                req.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 bg-[var(--bg)]/50 rounded-r-2xl border-y border-r border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors text-right">
                              {req.status === "pending" && (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleApprove(req)}
                                    className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all"
                                    title="Approve"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(req.id)}
                                    className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all"
                                    title="Reject"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : activeTab === "users" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]">
                        <th className="px-4 py-2">User Details</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Daily Usage</th>
                        <th className="px-4 py-2">Lifetime Usage</th>
                        <th className="px-4 py-2 text-right">Management</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const isExpired = u.proUntil ? u.proUntil.toDate() < new Date() : true;
                        const daysLeft = u.proUntil ? Math.max(0, Math.ceil((u.proUntil.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
                        
                        return (
                          <tr key={u.id} className="group">
                            <td className="px-4 py-4 bg-[var(--bg)]/50 rounded-l-2xl border-y border-l border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors font-bold text-[var(--text)]">
                              <div className="flex items-center gap-3">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.displayName || "User"} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs uppercase">
                                    {(u.displayName || u.email || "U").charAt(0)}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-[12px]">{u.displayName || "Unknown User"}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-[var(--text-muted)] font-normal">{u.email || <span className="text-rose-400 italic">No Email</span>}</span>
                                    {u.isBlocked && (
                                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[8px] font-bold uppercase tracking-wider">BLOCKED</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 bg-[var(--bg)]/50 border-y border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors">
                              {u.isPro && !isExpired ? (
                                <div className="flex flex-col">
                                  <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider w-fit">PRO</span>
                                  <span className="text-[10px] text-emerald-400 mt-1 font-bold">{daysLeft} days left</span>
                                </div>
                              ) : (
                                <span className="px-2 py-1 rounded-md bg-[var(--border)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">FREE</span>
                              )}
                            </td>
                            <td className="px-4 py-4 bg-[var(--bg)]/50 border-y border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors">
                              <div className="text-[var(--text)] font-bold">{u.todayProcessedCount || 0}</div>
                              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter">{u.lastProcessedDate || 'Never'}</div>
                            </td>
                            <td className="px-4 py-4 bg-[var(--bg)]/50 border-y border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors">
                              <div className="text-[var(--text)] font-bold">{u.processedCount || 0}</div>
                              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter">Total Images</div>
                            </td>
                            <td className="px-4 py-4 bg-[var(--bg)]/50 rounded-r-2xl border-y border-r border-[var(--border)] group-hover:bg-[var(--bg)] transition-colors text-right">
                              {editingUser?.id === u.id ? (
                                <div className="flex flex-col gap-2 items-end">
                                  <div className="flex items-center justify-end gap-2">
                                    <input 
                                      type="number" 
                                      value={customDays}
                                      onChange={(e) => setCustomDays(Number(e.target.value))}
                                      className="w-20 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text)] focus:border-indigo-500 outline-none"
                                      placeholder="Days"
                                    />
                                    <button 
                                      onClick={() => handleUpdateUserAccess(u.id, customDays)}
                                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button 
                                      onClick={() => setEditingUser(null)}
                                      className="px-3 py-1.5 bg-[var(--border)] text-[var(--text)] rounded-lg text-xs font-bold hover:bg-[var(--bg)] transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleBlockUser(u.id, !u.isBlocked)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isBlocked ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20'}`}
                                    >
                                      {u.isBlocked ? 'Unblock' : 'Block'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setCustomDays(u.isPro && !isExpired ? daysLeft : 30);
                                  }}
                                  className="p-2 bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] rounded-xl transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "keys" ? (
                <div className="max-w-3xl mx-auto space-y-8 py-4">
                  <div className="bg-[var(--bg)]/50 p-8 rounded-3xl border border-[var(--border)]">
                    <h3 className="text-lg font-bold text-[var(--text)] mb-6 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <Plus className="w-5 h-5 text-indigo-400" />
                      </div>
                      Add System API Key
                    </h3>
                    <div className="flex gap-3">
                      <input
                        type="password"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="Enter Gemini API Key (AIza...)"
                        className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-2xl px-5 py-4 text-[var(--text)] focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      <button
                        onClick={handleAddKey}
                        disabled={savingPricing || !newKey.trim()}
                        className="px-8 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                      >
                        Add Key
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-6">Active System Keys</h3>
                    <div className="grid gap-4">
                      {systemKeys.map((key, index) => (
                        <div key={index} className="bg-[var(--bg)]/50 p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center border border-[var(--border)]">
                              <Key className="w-5 h-5 text-[var(--text-muted)]" />
                            </div>
                            <div>
                              <code className="text-sm text-[var(--text)] font-mono tracking-wider">
                                {key.substring(0, 12)}...{key.substring(key.length - 6)}
                              </code>
                              <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold mt-1">System Fallback Key</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleTestSystemKey(key)}
                              disabled={testingKey === key}
                              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold ${
                                testingKey === key 
                                  ? "bg-indigo-500/20 text-indigo-400 animate-pulse" 
                                  : "bg-[var(--bg)] text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              {testingKey === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                              {testingKey === key ? "Testing..." : "Test Key"}
                            </button>
                            <button
                              onClick={() => handleDeleteKey(key)}
                              className="p-2.5 bg-[var(--bg)] text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeTab === "chats" ? (
                <div className="flex h-[700px] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Chat List */}
                  <div className="w-80 bg-[var(--card-bg)]/50 rounded-3xl border border-[var(--border)] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] bg-[var(--text)]/5">
                      <h3 className="text-xs font-black tracking-widest uppercase text-[var(--text)]">Active Conversations</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {chats.length === 0 ? (
                        <div className="p-10 text-center text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">No active chats</div>
                      ) : (
                        chats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => setSelectedChat(chat)}
                            className={`w-full p-4 text-left border-b border-[var(--border)] hover:bg-[var(--text)]/5 transition-all ${selectedChat?.id === chat.id ? 'bg-indigo-500/10 border-l-4 border-l-indigo-500' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-[11px] font-black text-[var(--text)] truncate">{chat.userName || chat.userEmail}</p>
                              {chat.unreadCount > 0 && (
                                <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{chat.unreadCount}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] truncate mb-1">{chat.lastMessage}</p>
                            <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                              {chat.lastTimestamp?.toDate ? chat.lastTimestamp.toDate().toLocaleTimeString() : 'Just now'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Chat Window */}
                  <div className="flex-1 bg-[var(--card-bg)]/50 rounded-3xl border border-[var(--border)] flex flex-col overflow-hidden">
                    {selectedChat ? (
                      <>
                        <div className="p-4 border-b border-[var(--border)] bg-[var(--text)]/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-black text-xs">
                              {selectedChat.userName?.[0] || selectedChat.userEmail?.[0]}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-[var(--text)]">{selectedChat.userName || 'User'}</p>
                              <p className="text-[9px] text-[var(--text-muted)]">{selectedChat.userEmail}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedChat(null)}
                            className="p-2 hover:bg-rose-500/10 hover:text-rose-400 text-[var(--text-muted)] rounded-xl transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                          {chatMessages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] p-4 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                                msg.sender === 'admin' 
                                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                                  : 'bg-[var(--card-bg)] text-[var(--text)] border border-[var(--border)] rounded-tl-none'
                              }`}>
                                {msg.text}
                                <div className={`text-[8px] mt-1 font-bold uppercase tracking-wider opacity-60 ${msg.sender === 'admin' ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <form onSubmit={handleSendReply} className="p-4 border-t border-[var(--border)] bg-black/20">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Type your reply..."
                              className="flex-1 bg-[var(--text)]/5 border border-[var(--border)] rounded-xl px-4 py-3 text-[11px] text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                            />
                            <button
                              type="submit"
                              disabled={sendingReply || !replyMessage.trim()}
                              className="px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-all font-black text-[10px] tracking-widest uppercase shadow-lg shadow-indigo-500/20"
                            >
                              {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-[10px] font-black tracking-widest uppercase">Select a conversation to start chatting</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === "pricing" ? (
                <div className="max-w-2xl mx-auto space-y-8 py-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-[var(--card-bg)]/50 p-6 rounded-3xl border border-[var(--border)]">
                      <h4 className="text-[var(--text)] font-bold mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        Monthly Plan
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Duration (Months)</label>
                          <input
                            type="number"
                            value={plan1.months}
                            onChange={(e) => setPlan1({ ...plan1, months: Number(e.target.value) })}
                            className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Price (BDT)</label>
                          <input
                            type="number"
                            value={plan1.price}
                            onChange={(e) => setPlan1({ ...plan1, price: Number(e.target.value) })}
                            className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-[var(--card-bg)]/50 p-6 rounded-3xl border border-[var(--border)]">
                      <h4 className="text-[var(--text)] font-bold mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        Semi-Annual Plan
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Duration (Months)</label>
                          <input
                            type="number"
                            value={plan2.months}
                            onChange={(e) => setPlan2({ ...plan2, months: Number(e.target.value) })}
                            className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Price (BDT)</label>
                          <input
                            type="number"
                            value={plan2.price}
                            onChange={(e) => setPlan2({ ...plan2, price: Number(e.target.value) })}
                            className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePricing}
                    disabled={savingPricing}
                    className="w-full py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    {savingPricing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Pricing Configuration
                  </button>

                  <div className="pt-8 border-t border-[var(--border)] space-y-6">
                    <div className="bg-[var(--card-bg)]/50 p-6 rounded-3xl border border-[var(--border)]">
                      <h4 className="text-[var(--text)] font-bold mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        Public Announcements
                      </h4>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">API Key Notice (Top Bar)</label>
                          <textarea
                            value={noticeText}
                            onChange={(e) => setNoticeText(e.target.value)}
                            className="w-full h-24 bg-[var(--bg)]/40 border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Scrolling Marquee (Footer)</label>
                          <textarea
                            value={marqueeText}
                            onChange={(e) => setMarqueeText(e.target.value)}
                            className="w-full h-24 bg-[var(--bg)]/40 border border-[var(--border)] rounded-2xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Telegram Link</label>
                            <input
                              type="text"
                              value={telegramLink}
                              onChange={(e) => setTelegramLink(e.target.value)}
                              placeholder="https://t.me/yourname"
                              className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">WhatsApp Link</label>
                            <input
                              type="text"
                              value={whatsappLink}
                              onChange={(e) => setWhatsappLink(e.target.value)}
                              placeholder="https://wa.me/number"
                              className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Facebook Link</label>
                            <input
                              type="text"
                              value={facebookLink}
                              onChange={(e) => setFacebookLink(e.target.value)}
                              placeholder="https://facebook.com/yourpage"
                              className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Youtube Link</label>
                            <input
                              type="text"
                              value={youtubeLink}
                              onChange={(e) => setYoutubeLink(e.target.value)}
                              placeholder="https://youtube.com/c/yourchannel"
                              className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[var(--card-bg)]/50 p-6 rounded-3xl border border-[var(--border)]">
                      <h4 className="text-[var(--text)] font-bold mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        System Toggles & Limits
                      </h4>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-[var(--text)]">Subscription System</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Enable or disable the Pro subscription features.</div>
                          </div>
                          <button
                            onClick={() => setSubscriptionEnabled(!subscriptionEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${subscriptionEnabled ? 'bg-emerald-500' : 'bg-[var(--border)]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${subscriptionEnabled ? 'left-7' : 'left-1'}`}></div>
                          </button>
                        </div>
                        
                        <div className="pt-4 border-t border-[var(--border)]">
                          <h5 className="text-sm font-bold text-[var(--text)] mb-4">Free Tier Limits</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Limit Amount</label>
                              <input
                                type="number"
                                value={freeLimit}
                                onChange={(e) => setFreeLimit(Number(e.target.value))}
                                className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Limit Type</label>
                              <select
                                value={freeLimitType}
                                onChange={(e) => setFreeLimitType(e.target.value as any)}
                                className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all appearance-none"
                              >
                                <option value="daily">Daily</option>
                                <option value="monthly">Monthly</option>
                                <option value="lifetime">Lifetime</option>
                              </select>
                            </div>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-2">
                            This limit applies to both Metadata generation and Prompt generation for free users.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveNotice}
                      disabled={savingPricing}
                      className="w-full py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                      {savingPricing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Update Settings & Notices
                    </button>
                  </div>
                </div>
              ) : activeTab === "notifications" ? (
                <div className="max-w-3xl mx-auto space-y-8 py-4">
                  <div className="bg-[var(--card-bg)]/50 p-8 rounded-3xl border border-[var(--border)]">
                    <h3 className="text-lg font-bold text-[var(--text)] mb-6 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <Bell className="w-5 h-5 text-indigo-400" />
                      </div>
                      Send Global Notification
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Notification Title</label>
                            <input
                              type="text"
                              value={notifTitle}
                              onChange={(e) => setNotifTitle(e.target.value)}
                              placeholder="e.g. New Features Added! 🚀"
                              className="w-full bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Message Content</label>
                            <textarea
                              value={notifMessage}
                              onChange={(e) => setNotifMessage(e.target.value)}
                              placeholder="Write your message here..."
                              className="w-full h-40 bg-[var(--bg)]/40 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-indigo-500 outline-none transition-all resize-none"
                            />
                          </div>
                          <button
                            onClick={handleSendNotification}
                            disabled={sendingNotif || !notifTitle || !notifMessage}
                            className="w-full py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                          >
                            {sendingNotif ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                            Send to All Users
                          </button>
                        </div>

                        <div className="bg-[var(--bg)]/30 p-6 rounded-2xl border border-[var(--border)]">
                          <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">Quick Templates</h4>
                          <div className="space-y-3">
                            {[
                              {
                                title: "New Update Released! 🚀",
                                message: "We've added new features! \n- Improved Prompt Generation \n- New UI Design \n- Faster Metadata Generation \n- Bug Fixes \nCheck it out now!"
                              },
                              {
                                title: "API Key Notice ⚠️",
                                message: "Please ensure your Gemini API key is correctly configured in the settings to avoid generation errors. If you face any issues, contact support."
                              },
                              {
                                title: "Pro Subscription Update 💎",
                                message: "Upgrade to Pro now to get unlimited generations and faster processing! New payment methods added."
                              }
                            ].map((template, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setNotifTitle(template.title);
                                  setNotifMessage(template.message);
                                }}
                                className="w-full text-left p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-indigo-500/50 transition-all group"
                              >
                                <div className="text-sm font-bold text-[var(--text)] group-hover:text-indigo-400 transition-colors">{template.title}</div>
                                <div className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2">{template.message}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--card-bg)]/50 p-8 rounded-3xl border border-[var(--border)]">
                    <h3 className="text-lg font-bold text-[var(--text)] mb-6 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Bell className="w-5 h-5 text-blue-400" />
                      </div>
                      Manage Notifications
                    </h3>
                    <div className="space-y-4">
                      {adminNotifications.length === 0 ? (
                        <div className="text-center text-[var(--text-muted)] py-10">No notifications found.</div>
                      ) : (
                        adminNotifications.map((notif) => (
                          <div key={notif.id} className="bg-[var(--bg)]/50 p-5 rounded-2xl border border-[var(--border)] flex items-start justify-between group hover:border-indigo-500/30 transition-all">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-[var(--text)] mb-1">{notif.title}</h4>
                              <p className="text-xs text-[var(--text-muted)] mb-2">{notif.message}</p>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleString() : 'Just now'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteAdminNotification(notif.id)}
                              className="p-2.5 bg-[var(--bg)] text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all ml-4"
                              title="Delete Notification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
