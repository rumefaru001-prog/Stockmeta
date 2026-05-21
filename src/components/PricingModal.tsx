import React, { useState, useEffect } from "react";
import { X, Copy, Check, Shield, Zap, ArrowLeft, CreditCard } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";

interface PricingModalProps {
  onClose: () => void;
  isPro: boolean;
  user: User | null;
  freeLimit: number;
  freeLimitType: 'daily' | 'monthly' | 'lifetime';
}

export function PricingModal({ onClose, isPro, user, freeLimit, freeLimitType }: PricingModalProps) {
  const [step, setStep] = useState<"plans" | "payment">("plans");
  const [selectedPlan, setSelectedPlan] = useState<"1_month" | "2_months">("1_month");
  const [bkashNumber, setBkashNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [plan1, setPlan1] = useState({ months: 1, price: 70 });
  const [plan2, setPlan2] = useState({ months: 2, price: 130 });

  const merchantNumber = "01867705047";

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.plan1) setPlan1(data.plan1);
          if (data.plan2) setPlan2(data.plan2);
        }
      } catch (error) {
        console.error("Error fetching pricing:", error);
      }
    };
    fetchPricing();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(merchantNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!bkashNumber.trim()) {
      alert("Please enter your bKash number");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        userEmail: user.email,
        bkashNumber: bkashNumber.trim(),
        transactionId: transactionId.trim(),
        plan: selectedPlan,
        status: "pending",
        createdAt: new Date()
      });

      alert("Payment request submitted successfully! Please wait for admin approval.");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "requests");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] rounded-3xl">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors bg-black/40 hover:bg-black/60 rounded-full p-2"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "plans" ? (
          <div className="flex flex-col md:flex-row h-full overflow-y-auto">
            {/* Free Tier */}
            <div className="flex-1 p-8 md:p-12 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg)]/40">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-[var(--border)] flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text)] mb-2">Free Plan</h3>
              <p className="text-[var(--text-muted)] text-sm mb-6 h-10">Perfect for testing the AI metadata generation.</p>
              <div className="text-4xl font-bold text-[var(--text)] mb-8">$0<span className="text-lg text-[var(--text-muted)] font-normal">/mo</span></div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-[var(--text)]">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Generate up to {freeLimit} items {freeLimitType === 'daily' ? 'daily' : freeLimitType === 'monthly' ? 'monthly' : 'lifetime'}</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--text)]">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Standard AI Model</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <X className="w-5 h-5 text-[var(--text-muted)]/30 shrink-0" />
                  <span>Batch Processing</span>
                </li>
              </ul>
              
              <button 
                onClick={onClose}
                disabled={!isPro}
                className="w-full py-3 rounded-xl font-bold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)] transition-colors disabled:opacity-50 mt-auto"
              >
                {isPro ? "Downgrade to Free" : "Current Plan"}
              </button>
            </div>

            {/* Pro Tier */}
            <div className="flex-1 p-8 md:p-12 relative bg-gradient-to-b from-indigo-500/10 to-transparent">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="absolute top-6 right-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-lg">
                Premium
              </div>

              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-6 relative z-10">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text)] mb-2">Pro Subscription</h3>
              <p className="text-indigo-200/60 text-sm mb-6 h-10 relative z-10">Unlimited access for professional stock contributors.</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                <button
                  onClick={() => setSelectedPlan("1_month")}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedPlan === "1_month" ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-[var(--border)] hover:border-indigo-500/30 bg-[var(--bg)]"}`}
                >
                  <div className="text-[var(--text-muted)] text-xs font-medium mb-1">{plan1.months} Month</div>
                  <div className="text-[var(--text)] font-bold text-xl">{plan1.price} BDT</div>
                </button>
                <button
                  onClick={() => setSelectedPlan("2_months")}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedPlan === "2_months" ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-[var(--border)] hover:border-indigo-500/30 bg-[var(--bg)]"}`}
                >
                  <div className="text-[var(--text-muted)] text-xs font-medium mb-1">{plan2.months} Months</div>
                  <div className="text-[var(--text)] font-bold text-xl">{plan2.price} BDT</div>
                </button>
              </div>
              
              <ul className="space-y-4 mb-8 relative z-10">
                <li className="flex items-center gap-3 text-sm text-[var(--text)]">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span><strong>Unlimited</strong> image generation</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--text)]">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Fast batch processing</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--text)]">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Advanced SEO Keywords</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setStep("payment")}
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] relative z-10 mt-auto"
              >
                {isPro ? "Extend Subscription" : "Upgrade Now"}
              </button>
            </div>
          </div>
        ) : (
            <div className="p-6 md:p-10 max-w-2xl mx-auto w-full overflow-y-auto bg-[var(--card-bg)] border-0 rounded-none">
              <button 
                onClick={() => setStep("plans")}
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-6 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Plans
              </button>

            <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Complete Payment</h2>
            <p className="text-[var(--text-muted)] text-sm mb-8">Send money via bKash to activate your Pro subscription.</p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column: QR & Instructions */}
              <div className="space-y-6">
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6 text-center shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                  <div className="bg-white/10 p-3 rounded-xl inline-block mb-4 shadow-lg backdrop-blur-md border border-white/20">
                    {/* The QR Code Image */}
                    <img 
                      src="/bkash-qr.jpg" 
                      alt="bKash QR Code" 
                      className="w-40 h-40 object-contain rounded-lg"
                      onError={(e) => {
                        // Fallback if the user hasn't uploaded the image yet
                        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://qr.bka.sh/281014021PhlHLczXEBCF65F15`;
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-[var(--text)] font-mono text-lg tracking-wider">{merchantNumber}</span>
                    <button 
                      onClick={handleCopy}
                      className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20"
                      title="Copy Number"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-indigo-400 font-medium text-sm">bKash Personal Account</p>
                  <p className="text-[var(--text-muted)] text-xs mt-2">Only Send Money</p>
                </div>
              </div>

              {/* Right Column: Form */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Select Plan</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedPlan("1_month")}
                      className={`p-3 rounded-xl border text-left transition-all ${selectedPlan === "1_month" ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-[var(--border)] hover:border-indigo-500/30 bg-[var(--bg)]"}`}
                    >
                      <div className="text-[var(--text)] font-medium text-sm">{plan1.months} Month{plan1.months > 1 ? 's' : ''}</div>
                      <div className="text-indigo-400 font-bold">{plan1.price} BDT</div>
                    </button>
                    <button
                      onClick={() => setSelectedPlan("2_months")}
                      className={`p-3 rounded-xl border text-left transition-all ${selectedPlan === "2_months" ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-[var(--border)] hover:border-indigo-500/30 bg-[var(--bg)]"}`}
                    >
                      <div className="text-[var(--text)] font-medium text-sm">{plan2.months} Month{plan2.months > 1 ? 's' : ''}</div>
                      <div className="text-indigo-400 font-bold">{plan2.price} BDT</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Your bKash Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 017XXXXXXXX" 
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Transaction ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 8N7A6B5C4D" 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <button 
                  onClick={handleSubmit}
                  disabled={!user || isSubmitting}
                  className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Submitting..." : (
                    <>
                      <CreditCard className="w-5 h-5" /> Submit Payment Request
                    </>
                  )}
                </button>
                
                {!user && (
                  <p className="text-yellow-500 text-xs text-center mt-2">You must be signed in to submit a request.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
