
'use client';
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../../firebase/config";
import ExcelTableTemplate from "../../components/ExcelTableTemplate";
import Nav from "../../components/navbar";
import Link from "next/link";
import RoleQuestions from "../../components/rolequestion";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { User, Plus, X } from "lucide-react";
import { StatusBadge, NormalCandidateCards } from "../../components/expandabledrawer";
import AssociateFormDialog from "../../components/FormPopup";
import OTSFormDialog from "../../components/OtsFormPopup";

const db = getFirestore();
const auth = getAuth(app);


function Otssheet() {
    const storage = getStorage(app);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [candidateDetailsCache, setCandidateDetailsCache] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});
    const [loggedInEmail, setLoggedInEmail] = useState(null);
    const [lmName, setLmName] = useState("");


    const [openQuestions, setOpenQuestions] = useState(false);
    const [selectedRole, setSelectedRole] = useState("");

    const [urlFilterRole, setUrlFilterRole] = useState("");
    const [urlFilterStatus, setUrlFilterStatus] = useState("");
    const [urlFilterCity, setUrlFilterCity] = useState("");
    const [urlFilterLm, setUrlFilterLM] = useState("");
    const [urlFilterService, setUrlFilterServiceCode] = useState("");


    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [dialogType, setDialogType] = useState('ots');
    const [refreshKey, setRefreshKey] = useState(0);


    const ensurePatronTrialFields = async (patronId) => {
        try {
            const patronRef = doc(db, "patronOtsAddRequest", patronId);
            const snap = await getDoc(patronRef);
            if (!snap.exists()) return { trialCount: 0, trialsUsed: 0, advancePaymentReceived: "No" };

            const data = snap.data();
            const update = {};
            let changed = false;

            if (data.trialCount === undefined) {
                update.trialCount = data.advancePaymentReceived === "Yes" ? 3 : 0;
                changed = true;
            }
            if (data.trialsUsed === undefined) {
                update.trialsUsed = 0;
                changed = true;
            }
            if (changed) {
                await updateDoc(patronRef, update);
                const newSnap = await getDoc(patronRef);
                return {
                    trialCount: newSnap.data().trialCount || 0,
                    trialsUsed: newSnap.data().trialsUsed || 0,
                    advancePaymentReceived: newSnap.data().advancePaymentReceived || "No"
                };
            }
            return {
                trialCount: data.trialCount || 0,
                trialsUsed: data.trialsUsed || 0,
                advancePaymentReceived: data.advancePaymentReceived || "No"
            };
        } catch (err) {
            console.error("ensurePatronTrialFields error", err);
            return { trialCount: 0, trialsUsed: 0, advancePaymentReceived: "No" };
        }
    };

    // Auth: resolve logged in user email
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setLoggedInEmail(user.email);
            } else {
                setLoggedInEmail(null);
                setRows([]);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (searchParams) {
            const role = searchParams.get("role");
            const status = searchParams.get("status");
            const lm = searchParams.get("lm");
            const city = searchParams.get("city");
            const clientCode = searchParams.get("clientCode");
            const serviceCode = searchParams.get("serviceCode");

            if (role) setUrlFilterRole(role);
            if (status) setUrlFilterStatus(status);
            if (lm) setUrlFilterLM(lm);
            if (city) setUrlFilterCity(city);
            if (serviceCode) setUrlFilterServiceCode(clientCode);
        }
    }, [searchParams]);

    useEffect(() => {
        if (loggedInEmail) {
            fetchLmAndPatronData(loggedInEmail);
        }
    }, [loggedInEmail]);

    const handleQuestionsClose = () => {
        setOpenQuestions(false);
        setSelectedRole("");
    };

    const fetchLmAndPatronData = async (email) => {
        setLoading(true);
        try {
            // ✅ Get current user's UID
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.warn("No authenticated user");
                setRows([]);
                setLoading(false);
                return;
            }

            // ✅ Get user doc directly by UID
            const userDocRef = doc(db, "user", currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                console.warn("No LM found for this user");
                setRows([]);
                setLoading(false);
                return;
            }

            const lmData = userDocSnap.data();
            const lmName = lmData.display_name?.trim();
            const lmEmail = lmData.email?.toLowerCase().trim();

            console.log("✅ OTS LM Found:", lmName, lmEmail);

            setLmName(lmName);

            const patronsSnapshot = await getDocs(collection(db, "patronOtsAddRequest"));

            console.log("📊 Total OTS patrons in DB:", patronsSnapshot.docs.length);

            const patrons = patronsSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => {
                    const assignedName = p.assignedLMName?.trim();
                    const assignedEmail = p.assignedLmEmail?.toLowerCase().trim();
                    const altAssignedName = p.AssignedLMName?.trim();

                    const nameMatch = assignedName === lmName || altAssignedName === lmName;
                    const emailMatch = assignedEmail === lmEmail;

                    if (nameMatch || emailMatch) {
                        console.log("✅ Matched OTS patron:", p.patronName);
                    }

                    return nameMatch || emailMatch;
                });

            console.log("✅ Filtered OTS patrons:", patrons.length);

            await Promise.all(patrons.map(async p => {
                try {
                    await ensurePatronTrialFields(p.id);
                } catch (e) {
                    console.warn("ensurePatronTrialFields fail for", p.id, e);
                }
            }));

            const patronsWithCounts = await Promise.all(patrons.map(async (p) => {
                try {
                    const candidateDetailsRef = collection(db, "patronOtsAddRequest", p.id, "candidateDetails");
                    const candidateSnapshot = await getDocs(candidateDetailsRef);
                    return { ...p, candidateCount: candidateSnapshot.size };
                } catch (e) {
                    return { ...p, candidateCount: 0 };
                }
            }));

            setRows(patronsWithCounts);
        } catch (err) {
            console.error("Error fetching LM/patron data:", err);
        }
        setLoading(false);
    };
    // STEP 1 + 2: Get LM Name and Fetch Patrons

    const fetchCandidateDetails = async (patronId) => {
        if (candidateDetailsCache[patronId]) return;
        setLoadingDetails(prev => ({ ...prev, [patronId]: true }));

        try {
            const candidateDetailsRef = collection(db, "patronOtsAddRequest", patronId, "candidateDetails");
            const snapshot = await getDocs(candidateDetailsRef);
            const details = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setCandidateDetailsCache(prev => ({
                ...prev,
                [patronId]: details
            }));
        } catch (err) {
            console.error(`Error fetching candidate details for ${patronId}:`, err);
            setCandidateDetailsCache(prev => ({
                ...prev,
                [patronId]: []
            }));
        }
        setLoadingDetails(prev => ({ ...prev, [patronId]: false }));
    };

    function ExpandableText({ text, maxLength = 100 }) {
        const [expanded, setExpanded] = useState(false);
        const displayText = expanded ? text : text.substring(0, maxLength) + (text.length > maxLength ? "..." : "");
        return (
            <div
                className="cursor-pointer text-gray-900 hover:text-blue-700 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {displayText}
            </div>
        );
    }


    const columns = [
        { key: "patronName", label: "Patron Name", bold: true },
        { key: "serviceCode", label: "Service Code" },
        { key: "createdAt", label: "Task Created Date", render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "" },
        { key: "clientCode", label: "Client Code" },
        { key: "status", label: "Status", render: (val) => <StatusBadge status={val || 'N/A'} /> },
        { key: "taskStartTime", label: "Task Start Date", render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "" },

    ];

    const renderDrawerContent = (patron, patronId) => {
        const candidateDetails = candidateDetailsCache[patronId] || [];
        const isLoading = loadingDetails[patronId];

        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <div className="text-gray-600">Loading candidate details...</div>
                </div>
            );
        }

        if (candidateDetails.length === 0) {
            return (

                  <div className="text-gray-500 p-4 text-start bg-white rounded border">

                    {/* New Code line */}

                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-3">

                        {/* Header */}
                        

                        {/* Grid Info */}
                      

                        {/* Description Section (Highlight) */}
                        <div className="mt-1">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                                Task Description / Scope of Work
                            </p>

                            <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                                {patron?.scopeOfWork || patron?.taskDescription || "No description available"}
                            </div>
                        </div>

                    </div>

                    {/* new code line end */}

                    <div className="text-gray-800 p-4 text-center bg-white rounded border">
                        No candidate details found for this request
                    </div>
                </div>
                // <div className="text-gray-500 p-4 text-center bg-white rounded border">
                //     No candidate details found for this patron
                // </div>
            );
        }

        // Define fields specific to LM sheet
        const displayFields = [
            { key: 'candidateName', label: 'Candidate Name' },
            { key: 'candidateId', label: 'Candidate ID' },
            { key: 'candidateContact', label: 'Contact No.' },
            { key: "candidateSource", label: "Source" },
            {
                key: 'candidateStatus',
                label: 'Current Stage',
                render: (val) => <StatusBadge status={val || 'N/A'} />
            },
            { key: 'candidateSource', label: 'Source' },
            { key: 'currentLocation', label: 'Current Location', render: (val, candidate) => val || patron.patronCity || 'N/A' },
            { key: 'lmResourceRemarks', label: 'LM Remarks', render: (val) => val || 'Pending' },
            { key: 'patronResourceRemarks', label: 'Patron Remarks', render: (val) => val || 'Pending' },
            { key: 'helpAboutSection', label: 'About' },
        ];

        const boldFields = [
            'patronName',
            'primaryRole',
        ];

        return (
            <div className="bg-gray-50 p-4 sm:p-6">

                     <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-3 mb-3">

                        {/* Description Section (Highlight) */}
                        <div className="mt-1">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                                Task Description / Scope of Work
                            </p>

                            <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                                {patron?.scopeOfWork || patron?.taskDescription || "No description available"}
                            </div>
                        </div>

                    </div>
                {candidateDetails.map((candidate, candIdx) => (
                    <NormalCandidateCards
                        key={candidate.id || candIdx}
                        candidate={candidate}
                        patronData={patron}
                        index={candIdx}
                        displayFields={displayFields}
                        boldFields={boldFields}
                    />
                ))}
            </div>
        );
    };

    const handleOpenPricingSheet = () => {
        router.push('/citywise_pricingsheet');
    };

    return (
        <div className="min-h-screen bg-gray-50">

            <Nav />

            <div className="p-3 sm:p-6">
                {/* Toggle between Associate and OTS */}
                <div className="flex gap-2 mb-4">
                    <Link
                        href="/lmsheet"
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-[#E8E8E8] bg-white text-[#3D3D3D]"
                    >
                        Associate
                    </Link>
                    <Link
                        href="/otsheet"
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-[#E8E8E8] bg-[#F36A23] text-white"
                    >
                        OTS
                    </Link>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-lg">Loading OTS LM Dashboard...</p>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        No patrons found for your LM account.
                    </div>
                ) : (
                    <ExcelTableTemplate
                        title="LM Dashboard"
                        columns={columns}
                        data={rows}
                        defaultRowsPerPage={10}
                        enableRowClick={true}
                        showCandidateCount={true}
                        filters={[
                            { key: "patronCity", label: "City", defaultValue: urlFilterCity },
                            { key: "patronName", label: "Patron" },
                            { key: "serviceCode", label: "Service Code" },
                            { key: "status", label: "Status", defaultValue: urlFilterStatus },
                            { key: "primaryRole", label: "Role", defaultValue: urlFilterRole }
                        ]}
                        onDrawerOpen={fetchCandidateDetails}
                        drawerContent={renderDrawerContent}
                        defaultOrderBy={{ field: "createdAt", direction: "desc" }}
                        // getRowClassName={getRowHighlightClass}  // ✅ ADD THIS

                        additionalButtons={[
                            {
                                label: "Create Requirement",
                                onClick: () => {
                                    setDialogType('associate');
                                    setShowCreateDialog(true);
                                },
                                icon: <Plus className="w-5 h-5" />,
                                color: "orange",
                                size: "sm",
                                primary: true
                            },
                            {
                                label: "Pricing Sheet",
                                onClick: handleOpenPricingSheet,
                                icon: <User className="w-5 h-5" />,
                                color: "gray"
                            }
                        ]}
                    />
                )}
            </div>

            {/* Role Questions Dialog */}
            <RoleQuestions
                open={openQuestions}
                onClose={handleQuestionsClose}
                role={selectedRole}
            />
            {showCreateDialog && dialogType === 'associate' && (
                <AssociateFormDialog
                    open={true}
                    activeTab="associate"
                    onSwitchTab={(tab) => setDialogType(tab)}
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={() => {
                        fetchLmAndPatronData(loggedInEmail);
                        setRefreshKey(prev => prev + 1);
                    }}
                />
            )}
            {showCreateDialog && dialogType === 'ots' && (
                <OTSFormDialog
                    open={true}
                    activeTab="ots"
                    onSwitchTab={(tab) => setDialogType(tab)}
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={() => {
                        fetchLmAndPatronData(loggedInEmail);
                        setRefreshKey(prev => prev + 1);
                    }}
                />
            )}

        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading tasks...</div>}>
            <Otssheet />
        </Suspense>
    );
}