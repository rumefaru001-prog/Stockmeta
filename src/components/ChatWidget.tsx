import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, User, Bell } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: any;
  isNotification?: boolean;
  title?: string;
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [notifMessages, setNotifMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!user) return;

    const qMessages = query(
      collection(db, "chats", user.uid, "messages"),
      orderBy("timestamp", "asc")
    );

    const qNotifications = query(
      collection(db, "notifications"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setChatMessages(msgs);
    }, (error) => {
      console.error("Chat messages error:", error);
    });

    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      const notifs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((n: any) => !n.target || n.target === 'all' || n.target === user.uid)
        .map((n: any) => ({
          id: n.id,
          text: n.message,
          title: n.title,
          sender: 'admin' as const,
          timestamp: n.createdAt,
          isNotification: true
        })) as Message[];
      setNotifMessages(notifs);
    }, (error) => {
      console.error("Chat notifications error:", error);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeNotifications();
    };
  }, [user]);

  const messages = React.useMemo(() => {
    return [...chatMessages, ...notifMessages].sort((a, b) => {
      const getMs = (ts: any) => {
        if (!ts) return 0;
        if (ts.toMillis) return ts.toMillis();
        if (ts.seconds) return ts.seconds * 1000;
        if (ts instanceof Date) return ts.getTime();
        if (typeof ts === 'number') return ts;
        return 0;
      };
      return getMs(a.timestamp) - getMs(b.timestamp);
    });
  }, [chatMessages, notifMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track last seen message timestamp
  useEffect(() => {
    if (!user) return;
    
    const lastSeenKey = `chat_last_seen_${user.uid}`;
    
    if (isOpen) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        const ts = lastMsg.timestamp?.toMillis?.() || (lastMsg.timestamp?.seconds ? lastMsg.timestamp.seconds * 1000 : null) || lastMsg.timestamp || Date.now();
        localStorage.setItem(lastSeenKey, ts.toString());
      }
      setHasUnread(false);
    } else if (messages.length > 0) {
      const lastSeen = localStorage.getItem(lastSeenKey);
      const lastMsg = messages[messages.length - 1];
      
      if (lastMsg.sender === 'admin') {
        const currentTs = lastMsg.timestamp?.toMillis?.() || (lastMsg.timestamp?.seconds ? lastMsg.timestamp.seconds * 1000 : null) || lastMsg.timestamp || Date.now();
        if (!lastSeen || currentTs > parseInt(lastSeen)) {
          setHasUnread(true);
        }
      }
    }
  }, [isOpen, messages, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setLoading(true);
    try {
      // Ensure chat document exists
      const chatRef = doc(db, "chats", user.uid);
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || 'User',
          lastMessage: message.trim(),
          lastTimestamp: serverTimestamp(),
          unreadCount: 0
        });
      } else {
        await setDoc(chatRef, {
          lastMessage: message.trim(),
          lastTimestamp: serverTimestamp(),
        }, { merge: true });
      }

      await addDoc(collection(db, "chats", user.uid, "messages"), {
        text: message.trim(),
        sender: 'user',
        timestamp: serverTimestamp()
      });

      setMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${user.uid}/messages`);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed top-auto bottom-6 left-1/2 -translate-x-1/2 z-[100]" ref={chatRef}>
      {isOpen ? (
        <div className="bg-[#1a1d2d] w-[350px] sm:w-[380px] h-[550px] rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300 relative">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-sm shadow-inner">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wider uppercase drop-shadow-sm">Contact Admin</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <span className="text-[9px] font-bold opacity-90 uppercase tracking-widest text-emerald-100">Online Support</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 bg-black/20 hover:bg-black/40 rounded-xl transition-all relative z-10 border border-white/10 text-white hover:text-rose-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0f111a] relative">
            {messages.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center shadow-inner mt-4">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                  আসসালামু আলাইকুম! আমি আপনার সহকারী। আপনাকে কীভাবে সাহায্য করতে পারি?
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
              >
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] font-medium leading-relaxed shadow-md relative ${
                  msg.sender === 'user' 
                    ? 'bg-rose-600 text-white rounded-br-none border border-rose-500' 
                    : msg.isNotification
                      ? 'bg-amber-500/10 border border-amber-500/30 text-white rounded-bl-none shadow-amber-500/5'
                      : 'bg-[#1a1d2d] text-zinc-200 border border-white/10 rounded-bl-none shadow-black/20'
                }`}>
                  {msg.isNotification && (
                    <div className="flex flex-col gap-1 mb-2 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                          <Bell className="w-3 h-3 text-amber-400" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 drop-shadow-sm">Announcement</span>
                      </div>
                      {msg.title && (
                        <div className="text-[11px] font-bold text-amber-100 mt-1 leading-snug">
                          {msg.title}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">
                    {msg.text}
                  </div>
                  <div className={`text-[8px] mt-2 font-bold tracking-widest uppercase opacity-60 ${msg.sender === 'user' ? 'text-right text-rose-200' : 'text-left text-zinc-400'}`}>
                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#1a1d2d]">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="আপনার প্রশ্ন লিখুন..."
                disabled={loading}
                className="flex-1 bg-[#0f111a] border border-white/10 text-white rounded-xl px-4 py-3 text-[11px] focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-transparent border border-rose-500 text-white p-3 rounded-xl transition-all shadow-lg flex items-center justify-center min-w-[3rem]"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="relative group/btn animate-in fade-in slide-in-from-bottom-6">
          {hasUnread && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black px-3 py-1.5 rounded-xl shadow-[0_10px_20px_rgba(245,158,11,0.4)] animate-bounce whitespace-nowrap uppercase tracking-widest z-20">
              New Notification!
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-500 rotate-45 border-r border-b border-black/10"></div>
            </div>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(225,29,72,0.5)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.6)] transition-all hover:-translate-y-1 relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <MessageCircle className="w-7 h-7 relative z-10" />
            {hasUnread ? (
              <div className="absolute -top-1 -right-1 flex h-5 w-5 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 border-2 border-[#1a1d2d] items-center justify-center text-[10px] text-black font-black">!</span>
              </div>
            ) : (
              <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-rose-600 shadow-sm z-20"></div>
            )}
          </button>
          <div className="absolute top-1/2 right-full mr-4 -translate-y-1/2 px-4 py-2 bg-[#1a1d2d] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none shadow-xl origin-right scale-95 group-hover/btn:scale-100">
            Contact Admin
          </div>
        </div>
      )}
    </div>
  );
};
