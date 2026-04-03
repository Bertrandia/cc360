'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  getAuth,
  signOut,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { app } from '../firebase/config';
import {
  getFirestore,
  doc,
  getDoc
} from 'firebase/firestore';
import Cookies from 'js-cookie'; // optional helper, or use document.cookie


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);         // Firebase Auth user
  const [userData, setUserData] = useState(null); // Firestore data
  const [role, setRole] = useState(null);         // 'finance' or 'patron'
  const [loading, setLoading] = useState(true);   // loading state

  const auth = getAuth(app);
  const db = getFirestore(app);

  // 🔐 Login Function
  const login = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Step 1: Check if in "user" (finance)
      const userDoc = await getDoc(doc(db, "user", uid));
      if (userDoc.exists()) {
        setUser(userCredential.user);
        setUserData(userDoc.data());
        const data = userDoc.data();
        console.log(`"supplyRole : " ${data.supplyRole}`);

        // ✅ Check supplyRole
        if (data.otsRole === "LM") {
          setRole("LM");
          document.cookie = `isFinanceRole=LM; path=/`;
          Cookies.set('userRole', 'LM', { path: '/' });
          return "LM";
        } else if (data.otsRole === "supply") {
          setRole("supply");
          document.cookie = `isFinanceRole=supply; path=/`;
          Cookies.set('userRole', 'supply', { path: '/' });
          return "supply";
        } else if (data.supplyRole === "OTS") {
          setRole("OTS");
          document.cookie = `isFinanceRole=ots; path=/`;
          Cookies.set('userRole', 'OTS', { path: '/' });
          return "supply";
        } else {
          setRole("Training");
          document.cookie = `isFinanceRole=true; path=/`;
          Cookies.set('userRole', 'Training', { path: '/' });
          return "Training";
        }
      }

      // Step 2: Check if in "addPatronDetails" (patron)
      const patronDoc = await getDoc(doc(db, "addPatronDetails", uid));
      if (patronDoc.exists()) {
        setUser(userCredential.user);
        setUserData(patronDoc.data());
        setRole("patron");
        document.cookie = `isFinanceRole=false; path=/`;
        return "patron";
      }

      // Not found
      throw new Error("User authenticated but not found in Firestore");

    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 🚪 Logout
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
    setRole(null);
    document.cookie = `isFinanceRole=; Max-Age=0; path=/`;
  };

  //  Keep user in memory on reload
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      setUser(userAuth);

      if (userAuth) {
        const uid = userAuth.uid;
        const userDoc = await getDoc(doc(db, "user", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);

          // ✅ Check supplyRole
          if (data.otsRole === "LM") {
            setRole("LM");
            document.cookie = `isFinanceRole=LM; path=/`;
          } else if (data.otsRole === "Training") {
            setRole("Training");
            document.cookie = `isFinanceRole=Training; path=/`;
          }
          else if (data.supplyRole === "OTS") {
            setRole("OTS");
            document.cookie = `isFinanceRole=OTS; path=/`;
          } else {
            setRole("");
            document.cookie = `isFinanceRole=true; path=/`;
          }
          console.log(`"OtsRole : " ${data.otsRole}`);

          setLoading(false);
          return;
        }

        const patronDoc = await getDoc(doc(db, "addPatronDetails", uid));
        if (patronDoc.exists()) {
          setUserData(patronDoc.data());
          setRole("patron");
          document.cookie = `isFinanceRole=false; path=/`;
          setLoading(false);
          return;
        }

        // Neither found
        setUserData(null);
        setRole(null);
        setLoading(false);
      } else {
        setUser(null);
        setUserData(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        role,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
