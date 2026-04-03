'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, app } from "../../firebase/config";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";


export default function YCWLoginPage() {
  const auth = getAuth(app);
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  useEffect(() => {
    // Reset any existing verifier to prevent "already rendered" errors
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA solved
      }
    });

    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          // Important: remove the reference entirely
          window.recaptchaVerifier = null;
        } catch (e) {
          console.error("Cleanup error", e);
        }
      }
    };
  }, [auth]); // Add auth as dependency
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !otpSent) { // If logged in and not currently in the middle of an OTP flow
        setLoading(true);
        try {
          const fullPhone = user.phoneNumber;
          const q = query(collection(db, "patronYcwHelps"), where("mobileNumber", "==", fullPhone));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const helpData = snap.docs[0].data();
            router.push(`/ycwOtsService?candidateId=${helpData.id}`);
          }
        } catch (err) {
          console.error("Auto-redirect error:", err);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [router, otpSent]);
  const validatePhone = () => /^[0-9]{10}$/.test(phone);
  const sendOTP = async () => {
    if (!validatePhone()) {
      alert("Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;

      // 1. Check Records & Get ID
      const q = query(collection(db, "patronYcwHelps"), where("mobileNumber", "==", fullPhone));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Mobile number not found.");
        setLoading(false);
        return;
      }

      const helpData = snap.docs[0].data();
      setCandidateId(helpData.id); // Ensure this is set!

      // 2. RE-INITIALIZE RECAPTCHA RIGHT BEFORE SENDING
      // This solves the 'invalid-app-credential' issue
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });

      // 3. Trigger SMS
      const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
    } catch (err) {
      console.error("Firebase Error:", err.code, err.message);
      alert(`Failed: ${err.message}`);
      if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
    }
    setLoading(false);
  };
  const verifyOTP = async () => {
    if (!otp) { alert("Enter OTP"); return; }
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      router.push(`/ycwOtsService?candidateId=${candidateId}`);
    } catch (err) {
      alert("Invalid OTP. Please check and try again.");
    }
    setLoading(false);
  };

  return (
    /* 1. OUTER WRAPPER: Centering logic and Background */
    <div className="min-h-screen bg-gradient-to-br from-[#A3472A]/5 via-white to-orange-50/30 flex items-center justify-center p-4">

      {/* 2. RECAPTCHA: Must be present for Firebase */}
      <div id="recaptcha-container"></div>

      {/* 3. LOGIN CONTAINER */}
      <div className="w-full max-w-md">

        {/* Branding Header */}
        <header className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-[#A3472A]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#A3472A]/20">
            <span className="text-[#A3472A] font-bold text-xl">YCW</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[#A3472A] tracking-tight">
            Candidate Login
          </h2>
          <p className="text-slate-500 text-sm mt-2">Enter your mobile number to login</p>
        </header>

        {/* 4. THE GLASS CARD */}
        <div className="bg-white/80 backdrop-blur-md shadow-xl shadow-[#A3472A]/10 border border-white/60 rounded-3xl p-8 mb-4">
          {!otpSent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 10 digit number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#A3472A] focus:ring-2 focus:ring-[#A3472A]/20 outline-none transition-all bg-white/50"
                />
              </div>

              <button
                onClick={sendOTP}
                disabled={loading}
                className="w-full bg-[#A3472A] hover:bg-[#8e3d24] text-white py-3 rounded-xl font-semibold shadow-md shadow-[#A3472A]/20 transition-all active:scale-[0.98] disabled:bg-[#A3472A]/40 disabled:cursor-not-allowed"
              >
                {loading ? "Checking Records..." : "Send OTP"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Enter OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#A3472A] focus:ring-2 focus:ring-[#A3472A]/20 outline-none transition-all bg-white/50"
                />
              </div>

              <button
                onClick={verifyOTP}
                disabled={loading}
                className="w-full bg-[#A3472A] hover:bg-[#8e3d24] text-white py-3 rounded-xl font-semibold shadow-md shadow-[#A3472A]/20 transition-all active:scale-[0.98] disabled:bg-[#A3472A]/40 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>

              <button
                onClick={() => setOtpSent(false)}
                className="w-full text-xs text-slate-400 hover:text-[#A3472A] transition-colors font-medium underline underline-offset-4"
              >
                Change Phone Number
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-400 text-xs">
          Secure Login
        </p>
      </div>
    </div>
  );
}