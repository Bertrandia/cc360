"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  collectionGroup,
  query,
  where,
  onSnapshot,
  doc,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs
} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, app } from "../../firebase/config";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
const auth = getAuth(app);
// UI Card Component
function Card({ children }) {
  return (
    <div className="bg-white/80 backdrop-blur-md shadow-xl shadow-[#A3472A]/10 border border-white/60 rounded-2xl p-4 mb-4 ring-1 ring-[#A3472A]/5">
      {children}
    </div>
  );
}

// Converts string/number/Timestamp → readable datetime
function formatTs(ts) {
  if (!ts) return "-";
  if (ts?.toDate) return ts.toDate().toLocaleString();
  if (typeof ts === "number") return new Date(ts).toLocaleString();
  if (typeof ts === "string") {
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  return String(ts);
}

export default function CandidateAttendancePage() {
  const [candidateId, setCandidateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [uploadsMap, setUploadsMap] = useState({});
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("open"); // "open" or "completed"
  const router = useRouter(); // 2. MUST INITIALIZE

  useEffect(() => {
    // 3. Auto-detect Candidate ID from URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("candidateId") || "";
      setCandidateId(id);
    }

    // 4. Persistence Check: If session exists, stay here. If not, go to login.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/ycw");
      }
    });

    return () => unsubscribe();
  }, [router]);
  useEffect(() => {
    // PROTECT THIS ROUTE
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // If no user is logged in, send them back to login

        router.push("/ycw"); // Adjust path as per your folder structure
      }
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("candidateId") || "";
      setCandidateId(id);
    }

    return () => unsubscribe();
  }, []);
  // Read candidateId from URL

  // Fetch candidateDetails and uploads
  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);

    const q = query(
      collectionGroup(db, "candidateDetails"),
      where("candidateId", "==", candidateId)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const docs = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const candidateDocId = docSnap.id;

        // Fetch parent and uploads counts
        let parentData = {};
        const parentRef = docSnap.ref.parent.parent;
        if (parentRef) {
          const p = await getDoc(parentRef);
          parentData = p.exists() ? p.data() : {};
        }

        const uploadsCol = collection(docSnap.ref, "uploads");
        const uploadsSnap = await getDocs(uploadsCol);
        const uploadsArr = uploadsSnap.docs.map(d => d.data());
        const inCount = uploadsArr.filter(u => u.type === "in").length;
        const outCount = uploadsArr.filter(u => u.type === "out").length;

        setUploadsMap(prev => ({ ...prev, [candidateDocId]: { in: inCount, out: outCount } }));

        docs.push({
          id: candidateDocId,
          data,
          parent: parentData,
          ref: docSnap.ref
        });
      }

      // CORRECT DESCENDING SORT FOR TIMESTAMPS
      docs.sort((a, b) => {
        const getLatestTime = (d) => {
          const getTs = (arr) => {
            if (!arr || arr.length === 0) return 0;
            const last = arr[arr.length - 1];
            return last?.toMillis ? last.toMillis() : new Date(last).getTime() || 0;
          };
          return Math.max(getTs(d.taskStartTime), getTs(d.taskEndTime));
        };
        return getLatestTime(b.data) - getLatestTime(a.data);
      });

      setResults(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [candidateId]);

  // Upload Handler
  const handleFileSelect = async (file, candidateItem, type) => {
    if (!file) return;
    setUploading(true);

    try {
      const ts = Date.now();
      const path = `attendance/${candidateId}/${candidateItem.id}/${type}-${ts}-${file.name}`;
      const sRef = storageRef(storage, path);
      const snapshot = await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      const uploadsCol = collection(candidateItem.ref, "uploads");
      await addDoc(uploadsCol, {
        type,
        photoUrl: url,
        createdAt: serverTimestamp()
      });

      alert("Upload successful!");

      // Update uploadsMap to immediately hide the button
      setUploadsMap(prev => ({
        ...prev,
        [candidateItem.id]: {
          ...prev[candidateItem.id],
          [type]: (prev[candidateItem.id]?.[type] || 0) + 1
        }
      }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // trigger camera
  const triggerCamera = (candidateItem, type) => {
    if (!fileInputRef.current) return;

    fileInputRef.current.onchange = async (e) => {
      const file = e.target.files?.[0];
      e.target.value = null;

      if (file) {
        await handleFileSelect(file, candidateItem, type);
      }
    };

    fileInputRef.current.click();
  };
  const filteredResults = results.filter(item => {
    const sLen = item.data.taskStartTime?.length || 0;
    const eLen = item.data.taskEndTime?.length || 0;
    const ups = uploadsMap[item.id] || { in: 0, out: 0 };
    const isDone = ups.in >= sLen && ups.out >= eLen;
    return filterStatus === "completed" ? isDone : !isDone;
  });
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#A3472A]/5 via-white to-orange-50/30 p-4">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">YCW</h1>

          <button
            onClick={() => history.back()}
            className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm"
          >
            Log Out
          </button>
        </header>

        <Card>
          <div className="text-sm text-slate-600 mb-1">
            Filtering for <span className="font-bold text-slate-900">{candidateId}</span>
          </div>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setFilterStatus("open")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filterStatus === 'open' ? 'bg-white text-[#A3472A] shadow-sm' : 'text-slate-500'}`}
            >
              Open Tasks
            </button>
            <button
              onClick={() => setFilterStatus("completed")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filterStatus === 'completed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              Completed
            </button>
          </div>
        </Card>

        {loading && <div className="text-center py-8">Loading candidate details...</div>}

        {!loading && results.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No candidateDetails found for this ID.
          </div>
        )}

        {filteredResults.map((item) => {
          const { id, data, parent } = item;
          const startTimes = Array.isArray(data.taskStartTime) ? data.taskStartTime : [];
          const endTimes = Array.isArray(data.taskEndTime) ? data.taskEndTime : [];
          const uploaded = uploadsMap[id] || { in: 0, out: 0 };

          return (
            <Card key={id}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-500">Patron</div>
                  <div className="font-semibold text-lg">{parent.patronName || "-"}</div>
                  <div className="text-sm text-slate-600">{parent.patronAddress || "-"}</div>
                </div>
              </div>

              <hr className="my-3" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Times */}
                <div>
                  <div className="text-sm font-bold mb-2">Task Start Times</div>
                  <div className="space-y-2">
                    {startTimes.length === 0 && <div className="text-slate-400">None</div>}

                    {startTimes.map((ts, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="text-sm">{formatTs(ts)}</div>
                        {uploaded.in === idx && (  // only show for the next pending index
                          <button
                            disabled={uploading}
                            onClick={() => triggerCamera(item, "in")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-700 text-xs font-semibold border border-emerald-200/50 hover:bg-emerald-200/80 transition-all"                          >
                            Upload In Time
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="text-sm font-bold mb-2">Task End Times</div>
                    {endTimes.length === 0 && <div className="text-slate-400">None</div>}
                    {endTimes.map((ts, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="text-sm">{formatTs(ts)}</div>
                        {uploaded.out === idx && (  // only show for the next pending index
                          <button
                            disabled={uploading}
                            onClick={() => triggerCamera(item, "out")}
                            className="px-2.5 py-1 rounded-lg bg-rose-100/80 text-rose-700 text-xs font-semibold border border-rose-200/50 hover:bg-rose-200/80 transition-all"                          >
                            Upload Out Time
                          </button>
                        )}
                      </div>
                    ))}

                  </div>
                </div>
              </div>

              <div className="mt-4">
                <details className="group p-2 rounded-xl bg-[#A3472A]/5 border border-[#A3472A]/10 transition-all duration-300 open:bg-[#A3472A]/10">
                  <summary className="cursor-pointer list-none flex items-center gap-2 text-[#A3472A] font-semibold text-sm">
                    {/* Optional: Simple Chevron that rotates when open */}
                    <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
                    Previous Uploads
                  </summary>
                  <div className="mt-2 pt-2 border-t border-[#A3472A]/10">
                    <UploadsList candidateRef={item.ref} />
                  </div>
                </details>
              </div>
            </Card>
          );
        })}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
        />
      </div>
    </div>
  );
}

// Upload List Component
function UploadsList({ candidateRef }) {
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    if (!candidateRef) return;

    const q = query(collection(candidateRef, "uploads"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setUploads(arr);
    });

    return () => unsub();
  }, [candidateRef]);

  return (
    <div className="mt-3 space-y-2">
      {uploads.length === 0 && <div className="text-slate-400">No uploads yet.</div>}

      {uploads.map((u) => (
        <div key={u.id} className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100">
            <img src={u.photoUrl} className="object-cover w-full h-full" alt="upload" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium capitalize">{u.type}</div>
            <div className="text-xs text-slate-400">
              {u.createdAt?.toDate ? String(u.createdAt.toDate()) : "—"}
            </div>
          </div>

          <div>
            <a
              href={u.photoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline"
            >
              View
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
