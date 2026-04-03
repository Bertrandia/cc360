'use client';
import { useEffect, useState } from "react";
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    Timestamp,
    query,
    where,
    addDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../../firebase/config";
import ExcelTableTemplate from "../../components/ExcelTableTemplate";
import Snackbar, { triggerSnackbar } from "../../components/snakbar";
import { UploadCloud } from "lucide-react";
import Nav from "../../components/navbar";
import ProfileCard from "../../components/profile";
import { TrainingCandidateCards } from "../../components/expandabledrawer";
import { StatusBadge } from "../../components/expandabledrawer";


// ⬇️ MOVE removeBackground BELOW THE COMPONENT (OK)
async function removeBackground(file, backgroundColor = "#A3472A") {
    return new Promise(async (resolve, reject) => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        await img.decode();

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        const segmenter = new window.SelfieSegmentation({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });
        segmenter.setOptions({ modelSelection: 1 });

        segmenter.onResults((results) => {
            const mask = results.segmentationMask;

            // ------------------------------
            // CLEAN MASK CANVAS
            // ------------------------------
            const maskCanvas = document.createElement("canvas");
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            const maskCtx = maskCanvas.getContext("2d");

            // 🔥 Blur + slightly expand mask to remove white edges
            maskCtx.filter = "blur(3px)";
            maskCtx.drawImage(mask, -2, -2, img.width + 4, img.height + 4);

            maskCtx.globalCompositeOperation = "source-in";
            maskCtx.drawImage(img, 0, 0);

            // ------------------------------
            // FINAL OUTPUT
            // ------------------------------
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(maskCanvas, 0, 0);

            canvas.toBlob((blob) => {
                resolve(new File([blob], file.name, { type: file.type }));
            });
        });

        await segmenter.send({ image: img });
    });
}

const db = getFirestore(app);
const auth = getAuth(app);

// Add after imports, before component definition
const getUserRefByDisplayName = async (displayName) => {
    if (!displayName) return null;
    try {
        const userCollectionRef = collection(db, "user");
        const userQuery = query(userCollectionRef, where("display_name", "==", displayName));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            // ✅ Return DocumentReference instead of string
            return doc(db, "user", userSnapshot.docs[0].id);
        }
        return null;
    } catch (error) {
        console.error("Error fetching user ref:", error);
        return null;
    }
};

export default function Trainingsheet() {

    const [scriptLoaded, setScriptLoaded] = useState(false);
    const normalizeRef = (ref) => {
        if (!ref) return null;
        // If it's already a DocumentReference, return it
        if (ref.path && typeof ref.path === 'string') return ref;
        // If it's a string path, convert to DocumentReference
        if (typeof ref === 'string') {
            const path = ref.startsWith('/') ? ref.slice(1) : ref;
            return doc(db, path);
        }
        return ref;
    };

    const getRefPath = (ref) => {
        if (!ref) return '';
        if (typeof ref === 'string') return ref.startsWith('/') ? ref : `/${ref}`;
        if (ref.path) return `/${ref.path}`;
        return '';
    };

    // ⬇️ CORRECT: Load Mediapipe script inside component
    useEffect(() => {
        const script = document.createElement("script");
        script.src =
            "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js";
        script.async = true;

        script.onload = () => {
            setScriptLoaded(true);
            console.log("SelfieSegmentation script loaded");
        };

        document.body.appendChild(script);
        return () => document.body.removeChild(script);
    }, []);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [candidateDetailsCache, setCandidateDetailsCache] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});
    const [loggedInEmail, setLoggedInEmail] = useState(null);
    const [lmName, setLmName] = useState("");
    const [openDrawerId, setOpenDrawerId] = useState(null);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedCandidates, setSelectedCandidates] = useState([]);
    const [selectedPatronId, setSelectedPatronId] = useState(null);
    const [selectedPatronData, setSelectedPatronData] = useState(null);
    const [viewingCandidate, setViewingCandidate] = useState(null);
    const [profileScale, setProfileScale] = useState(0.8);
    const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
    // Add these new states
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingCandidateId, setEditingCandidateId] = useState(null);

    // Form fields
    const [formData, setFormData] = useState({
        candidateName: "",
        about: "",
        skills: [],
        age: "",
        experience: "",
        language: [],
        workingHours: "",
        quotes: "",
        uploadFile: null,
        addressVerification: null,
        referenceVerification: null,
        policeVerification: null,
        addressVerificationUrl: "",
        referenceVerificationUrl: "",
        policeVerificationUrl: "",
    });

    const [skillsList, setSkillsList] = useState([]);
    const storage = getStorage(app);

    // Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) setLoggedInEmail(user.email);
            else {
                setLoggedInEmail(null);
                setRows([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch LM name + patrons
    useEffect(() => {
        if (loggedInEmail) fetchLmAndPatronData(loggedInEmail);
    }, [loggedInEmail]);

    const fetchLmAndPatronData = async (email) => {
        setLoading(true);
        try {
            // Fetch all patrons regardless of LM assignment
            const patronsSnapshot = await getDocs(collection(db, "patronAddRequest"));

            const allowedStatuses = ["Interview Scheduled", "Resource Approved", "Patron Approved", "Help Profile Created", "Trial Scheduled", "Office Trial Completed", "Office Trial Scheduled", "Deployed"];

            // Filter only by status, NOT by assignedLMName
            const patrons = patronsSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => allowedStatuses.includes(p.status));

            // ✅ Calculate candidate count for each patron
            const patronsWithCounts = await Promise.all(patrons.map(async (p) => {
                try {
                    const candidateDetailsRef = collection(db, "patronAddRequest", p.id, "candidateDetails");
                    const candidateSnapshot = await getDocs(candidateDetailsRef);
                    return { ...p, candidateCount: candidateSnapshot.size };
                } catch (e) {
                    return { ...p, candidateCount: 0 };
                }
            }));

            setRows(patronsWithCounts);
        } catch (err) {
            console.error("Error fetching patron data:", err);
        }
        setLoading(false);
    };

    // Close skills dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showSkillsDropdown && !event.target.closest('.skills-dropdown-container')) {
                setShowSkillsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSkillsDropdown]);

    // Fetch candidate details lazily
    const fetchCandidateDetails = async (patronId) => {
        if (candidateDetailsCache[patronId]) return;
        setLoadingDetails(prev => ({ ...prev, [patronId]: true }));

        try {
            const candidateDetailsRef = collection(db, "patronAddRequest", patronId, "candidateDetails");
            const snapshot = await getDocs(candidateDetailsRef);
            const allowedStatuses = ["Resource Approved", "Patron Approved", "Deployed", "Help Profile Created", "Office Trial Completed"];
            const details = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(candidate => allowedStatuses.includes(candidate.candidateStatus));
            setCandidateDetailsCache(prev => ({ ...prev, [patronId]: details }));
        } catch (err) {
            console.error(`Error fetching candidate details for ${patronId}:`, err);
            setCandidateDetailsCache(prev => ({ ...prev, [patronId]: [] }));
        }
        setLoadingDetails(prev => ({ ...prev, [patronId]: false }));
    };

    // Fetch skills by matching primaryRole
    const fetchSkillsForRole = async (primaryRole) => {
        try {
            const roleSnapshot = await getDocs(collection(db, "patronPrimaryRole"));
            const matchedDoc = roleSnapshot.docs.find(doc => doc.data().primaryRole === primaryRole);
            if (matchedDoc) {
                setSkillsList(matchedDoc.data().skills || []);
            } else {
                setSkillsList([]);
            }
        } catch (err) {
            console.error("Error fetching skills:", err);
        }
    };

    // ✅ NEW FUNCTION: Calculate verification status
    const calculateVerificationStatus = (addressUrl, referenceUrl, policeUrl) => {
        const filledCount = [addressUrl, referenceUrl, policeUrl].filter(url => url && url.trim() !== "").length;

        if (filledCount === 0) return "Pending";
        if (filledCount === 3) return "Completed";
        return "In-Progress";
    };

    // ✅ FIX: Handle Complete Profile with unique filename
    const handleCompleteProfile = async () => {
        if (!formData.candidateName) {
            triggerSnackbar("Please select a candidate");
            return;
        }

        // ✅ VALIDATE selectedPatronId
        if (!selectedPatronId) {
            triggerSnackbar("Error: Patron ID is missing");
            return;
        }

        try {
            const candidateDetailsRef = collection(db, "patronAddRequest", selectedPatronId, "candidateDetails");
            const snapshot = await getDocs(candidateDetailsRef);
            const candidateDoc = snapshot.docs.find(doc => doc.data().candidateName === formData.candidateName);

            if (!candidateDoc) {
                triggerSnackbar("Candidate not found");
                return;
            }

            const formatYears = (value) => {
                if (!value) return "";
                const num = value.replace(/\D/g, '');
                return num ? `${num} years` : "";
            };

            const patronRef = doc(db, "patronAddRequest", selectedPatronId);
            const patronSnap = await getDoc(patronRef);

            if (!patronSnap.exists()) {
                triggerSnackbar("Patron document not found");
                return;
            }

            const currentTime = Timestamp.now();

            // ✅ CRITICAL FIX: Only update patron status if NOT in edit mode
            if (!isEditMode) {
                await updateDoc(patronRef, {
                    status: "Help Profile Created",
                    profileCreatedAt: currentTime,
                });
            }

            // âœ… Create commentsThread entry for Help Profile Created (only if NOT editing)
            if (!isEditMode) {
                const taskCollectionRef = collection(db, "createTaskCollection");
                const associateRefString = `/patronAddRequest/${selectedPatronId}`;
                const associateRefDoc = doc(db, 'patronAddRequest', selectedPatronId);

                // Query for both string and reference formats
                const taskQueryString = query(taskCollectionRef, where("associateRef", "==", associateRefString));
                const taskQueryRef = query(taskCollectionRef, where("associateRef", "==", associateRefDoc));

                const [taskSnapshotString, taskSnapshotRef] = await Promise.all([
                    getDocs(taskQueryString),
                    getDocs(taskQueryRef)
                ]);

                const taskSnapshot = !taskSnapshotString.empty ? taskSnapshotString : taskSnapshotRef;

                if (!taskSnapshot.empty) {
                    const taskDoc = taskSnapshot.docs[0];
                    const taskDocRef = doc(db, "createTaskCollection", taskDoc.id);

                    // await updateDoc(taskDocRef, {
                    //     taskStatusCategory: "In Process",
                    // });

                    const ownerRef = await getUserRefByDisplayName(loggedInEmail);
                    const commentsThreadRef = collection(taskDocRef, "commentsThread");
                    await addDoc(commentsThreadRef, {
                        comment_Text: "Candidate profile has been created by training team.",
                        timeStamp: currentTime,
                        comment_owner_name: loggedInEmail || "",
                        comment_owner_img: "",
                        comment_owner_ref: ownerRef,
                        taskRef: taskDocRef,
                        commentDate: currentTime,
                        taskStatusCategory: "In Process",
                        isUpdate: true,
                    });

                    await updateDoc(taskDocRef, {
                        status: "Help Profile Created",
                        isUpdate: true,
                        lastComment: 'Resource Allocated',
                        taskInProcessDate: currentTime,
                        taskStatusCategory: 'In Process'
                    });
                }

            }
            // ✅ In edit mode, we DON'T update patron status at all

            const candidateDocRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", candidateDoc.id);

            // ✅ Handle verification file uploads
            let addressVerificationUrl = formData.addressVerificationUrl || "";
            let referenceVerificationUrl = formData.referenceVerificationUrl || "";
            let policeVerificationUrl = formData.policeVerificationUrl || "";

            // Upload address verification
            if (formData.addressVerification) {
                const file = formData.addressVerification;
                const fileExtension = file.name.split('.').pop();
                const uniqueFileName = `address_${candidateDoc.id}_${Date.now()}.${fileExtension}`;
                const storageRef = ref(storage, `verificationDocs/${uniqueFileName}`);
                await uploadBytes(storageRef, file);
                addressVerificationUrl = await getDownloadURL(storageRef);
            }

            // Upload reference verification
            if (formData.referenceVerification) {
                const file = formData.referenceVerification;
                const fileExtension = file.name.split('.').pop();
                const uniqueFileName = `reference_${candidateDoc.id}_${Date.now()}.${fileExtension}`;
                const storageRef = ref(storage, `verificationDocs/${uniqueFileName}`);
                await uploadBytes(storageRef, file);
                referenceVerificationUrl = await getDownloadURL(storageRef);
            }

            // Upload police verification
            if (formData.policeVerification) {
                const file = formData.policeVerification;
                const fileExtension = file.name.split('.').pop();
                const uniqueFileName = `police_${candidateDoc.id}_${Date.now()}.${fileExtension}`;
                const storageRef = ref(storage, `verificationDocs/${uniqueFileName}`);
                await uploadBytes(storageRef, file);
                policeVerificationUrl = await getDownloadURL(storageRef);
            }

            // ✅ Calculate verification status
            const isVerified = calculateVerificationStatus(
                addressVerificationUrl,
                referenceVerificationUrl,
                policeVerificationUrl
            );

            // ✅ Handle profile image upload
            let imageUrl = formData.uploadFile ? "" : (formData.imageUrl || "");
            if (formData.uploadFile) {
                let file = formData.uploadFile;

                // Remove background
                file = await removeBackground(file);

                const fileExtension = file.name.split('.').pop();
                const uniqueFileName = `${candidateDoc.id}_${Date.now()}.${fileExtension}`;
                const storageRef = ref(storage, `candidateImages/${uniqueFileName}`);
                await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(storageRef);
            }


            // ✅ Prepare update data (only include changed fields in edit mode)
            const updateData = {
                helpAboutSection: formData.about || "",
                helpSkill: formData.skills,
                age: formatYears(formData.age),
                totalExperience: formatYears(formData.experience),
                workTime: formData.workingHours || "",
                primaryLanguage: Array.isArray(formData.language) ? formData.language : (formData.language ? [formData.language] : []),
                quotes: formData.quotes || "",
                image: imageUrl,
                addressVerification: addressVerificationUrl,
                referenceVerification: referenceVerificationUrl,
                policeVerification: policeVerificationUrl,
                isVerified: isVerified,
                candidateStatusTime: currentTime,
            };

            // ✅ CRITICAL: Add profile creation fields only if NOT editing
            if (!isEditMode) {
                updateData.candidateStatus = "Help Profile Created";
                updateData.profileCreationTime = currentTime;
                updateData.profileCreatedBy = loggedInEmail;
            } else {
                // ✅ In edit mode, we DON'T change candidateStatus
                // Only add edit tracking fields
                updateData.profileLastEditedBy = loggedInEmail;
                updateData.profileLastEditedAt = currentTime;
            }

            await updateDoc(candidateDocRef, updateData);

            triggerSnackbar(isEditMode ? "Profile updated successfully!" : "Profile created successfully!");
            setShowModal(false);
            setIsEditMode(false);
            setEditingCandidateId(null);

            // Reset form
            setFormData({
                candidateName: "",
                about: "",
                skills: [],
                age: "",
                experience: "",
                language: [],
                workingHours: "",
                quotes: "",
                uploadFile: null,
                addressVerification: null,
                referenceVerification: null,
                policeVerification: null,
                addressVerificationUrl: "",
                referenceVerificationUrl: "",
                policeVerificationUrl: "",
            });

            // Refresh candidate details
            setCandidateDetailsCache(prev => ({
                ...prev,
                [selectedPatronId]: (prev[selectedPatronId] || []).map(c =>
                    c.id === candidateDoc.id
                        ? { ...c, ...updateData }
                        : c
                )
            }));

            // Update row's candidateCount if needed
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: isEditMode ? row.status : "Help Profile Created" }
                        : row
                )
            );

            // If drawer is open, refresh only that drawer
            if (openDrawerId === selectedPatronId) {
                const candidateDetailsRef = collection(db, "patronAddRequest", selectedPatronId, "candidateDetails");
                const snapshot = await getDocs(candidateDetailsRef);
                const allowedStatuses = ["Resource Approved", "Patron Approved", "Deployed", "Help Profile Created", "Office Trial Completed"];
                const details = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(candidate => allowedStatuses.includes(candidate.candidateStatus));

                setCandidateDetailsCache(prev => ({ ...prev, [selectedPatronId]: details }));
            }

        } catch (err) {
            console.error("Error saving profile:", err);
            triggerSnackbar("Error saving profile: " + err.message);
        }
    };

    // ✅ UPDATED FUNCTION: Handle Edit Profile
    const handleEditProfile = async (candidate, patronId) => {
        // ✅ FIX: Get patronId from the drawer context
        // The patronId should come from the parent row, not the candidate
        const actualPatronId = patronId;

        // If patronId is still not available, find it from the rows
        if (!actualPatronId) {
            const parentRow = rows.find(r => {
                const candidates = candidateDetailsCache[r.id] || [];
                return candidates.some(c => c.id === candidate.id);
            });
            if (parentRow) {
                actualPatronId = parentRow.id;
            }
        }

        if (!actualPatronId) {
            triggerSnackbar("Error: Could not identify patron");
            return;
        }

        setIsEditMode(true);
        setEditingCandidateId(candidate.id);
        setSelectedPatronId(actualPatronId); // ✅ Set it properly

        // Find patron data
        const patron = rows.find(r => r.id === actualPatronId);
        setSelectedPatronData(patron);

        // Fetch skills for the role
        if (patron?.primaryRole) {
            await fetchSkillsForRole(patron.primaryRole);
        }

        // Pre-fill form with existing data
        setFormData({
            candidateName: candidate.candidateName || "",
            about: candidate.helpAboutSection || "",
            skills: candidate.helpSkill || [],
            age: candidate.age?.replace(' years', '') || "",
            experience: candidate.totalExperience?.replace(' years', '') || "",
            language: Array.isArray(candidate.primaryLanguage) ? candidate.primaryLanguage : (candidate.primaryLanguage ? [candidate.primaryLanguage] : []),
            workingHours: candidate.workTime || "",
            quotes: candidate.quotes || "",
            uploadFile: null,
            imageUrl: candidate.image || "",
            addressVerification: null,
            referenceVerification: null,
            policeVerification: null,
            addressVerificationUrl: candidate.addressVerification || "",
            referenceVerificationUrl: candidate.referenceVerification || "",
            policeVerificationUrl: candidate.policeVerification || "",
        });

        setShowModal(true);
    };

    const ExpandableText = ({ text, maxLength = 100 }) => {
        const [expanded, setExpanded] = useState(false);
        const displayText = expanded ? text : text.substring(0, maxLength) + (text.length > maxLength ? "..." : "");
        return (
            <div onClick={() => setExpanded(!expanded)} className="cursor-pointer text-gray-900 hover:text-blue-700">
                {displayText}
            </div>
        );
    };

    const columns = [
        { key: "patronName", label: "Patron Name", bold: true },
        { key: "primaryRole", label: "Primary Role", bold: true },
        { key: "createdAt", label: "Date", render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "" },
        { key: "clientCode", label: "Client Code" },
        { key: "patronCity", label: "City" },
        { key: "requestID", label: "Request ID" },
        { key: "salaryRange", label: "Salary" },
        { key: "taskDueDate", label: "Task Date", render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "" },
        { key: "status", label: "Status", render: (val) => <StatusBadge status={val || 'N/A'} /> },
    ];

    const candidateBasicColumns = [
        { key: "candidateName", label: "Candidate Name" },
        { key: "candidateId", label: "Candidate ID" },
        { key: "candidateContact", label: "Contact" },
        { key: "candidateSource", label: "Source" },
        {
            key: "profile",
            label: "Profile",
            render: (_, candidate, patronId) => { // 1. Ensure patronId is accessible here
                const hasProfile = ["Help Profile Created", "Patron Approved", "Deployed"].includes(candidate.candidateStatus);

                return hasProfile ? (
                    <button
                        onClick={() => {
                            // 2. FIND AND SET THE PATRON DATA HERE
                            const patron = rows.find(r => r.id === patronId);
                            setSelectedPatronData(patron);

                            setViewingCandidate(candidate);
                            setShowProfileModal(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                        View Profile
                    </button>
                ) : (
                    <span className="text-gray-500 text-sm">Not completed</span>
                );
            }
        },
        {
            key: "editProfile",
            label: "Edit",
            render: (_, candidate, patronId) => { // ✅ ADD patronId parameter
                const hasProfile = candidate.candidateStatus === "Help Profile Created" || candidate.candidateStatus === "Patron Approved" || candidate.candidateStatus === "Deployed";
                return hasProfile ? (
                    <button
                        onClick={() => handleEditProfile(candidate, patronId)} // ✅ Pass patronId
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                        Edit Profile
                    </button>
                ) : (
                    <span className="text-gray-500 text-sm">Not Profile</span>
                );;
            }
        }
    ];

    const candidateDetailedColumns = [
        { key: "helpAboutSection", label: "About", render: (val) => !val ? "-" : <ExpandableText text={val} /> },
    ];

    // ✅ Define fields you want to show in Training Candidate Cards
    const trainingCandidateFields = [
        { key: "candidateId", label: "Candidate ID" },
        { key: "candidateContact", label: "Contact No." },
        { key: "candidateSource", label: "Source" },
        {
            key: "isVerified",
            label: "Verification Status",
            render: (val) => {
                // const colors = {
                //     "Pending": "text-yellow-600 bg-yellow-50",
                //     "In-Progress": "text-blue-600 bg-blue-50",
                //     "Completed": "text-green-600 bg-green-50"
                // };
                // const colorClass = colors[val] || "text-gray-600 bg-gray-50";
                // return <span className={`px-2 py-1 rounded ${colorClass} font-semibold`}>{val || "Pending"}</span>;
                return <span className={`px-2 py-1 rounded font-semibold`}><StatusBadge status={val || 'Pending'} /></span>;
            }
        },
        { key: "candidateStatus", label: "Current Stage", render: (val) => <StatusBadge status={val || 'N/A'} /> },
        { key: "helpAboutSection", label: "About Section" },
        {
            key: "lmResourceRemarks",
            label: "LM Interview Remarks",
            render: (val) => (
                <div className="max-h-16 overflow-y-auto text-xs">

                    {val || '-'}
                </div>
            )
        },
        {
            key: "trainingRemarks",
            label: "Training Team Remarks",
            render: (val) => (
                <div className="max-h-16 overflow-y-auto text-xs">
                    {val || '-'}
                </div>
            )
        },
        {
            key: "patronResourceRemarks",
            label: "Patron Remarks",
            render: (val) => (
                <div className="max-h-16 overflow-y-auto text-xs">
                    {/* {val || 'Pending'} */}
                    {val || '-'}
                </div>
            )
        },
    ];
    const renderDrawerContent = (patron, patronId) => {
        const candidateDetails = candidateDetailsCache[patronId] || [];
        const isLoading = loadingDetails[patronId];

        if (isLoading) {
            return (
                <div className="p-8 text-center text-gray-600">
                    Loading candidate details...
                </div>
            );
        }

        return (
            <TrainingCandidateCards
                candidates={candidateDetails}
                patronId={patronId}
                displayFields={trainingCandidateFields}  // ✅ Pass dynamic fields
                onViewProfile={(candidate) => {
                    // 1. Find the patron data immediately using the patronId prop
                    const patron = rows.find(r => r.id === patronId);

                    // 2. Set both pieces of state
                    setSelectedPatronData(patron);
                    setViewingCandidate(candidate);

                    // 3. Open the modal
                    setShowProfileModal(true);
                }}
                onEditProfile={handleEditProfile}
            />
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Nav />

            <div className="p-3 sm:p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-base sm:text-lg">Loading Training Dashboard ...</p>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20 text-sm sm:text-base">No patrons found for your account.</div>
                ) : (
                    <ExcelTableTemplate
                        title="Training Dashboard"
                        columns={columns}  // Keep your existing columns WITHOUT createProfile action
                        data={rows}
                        enableRowClick={true}
                        defaultRowsPerPage={10}
                        showCandidateCount={true}
                        filters={[
                            { key: "patronName", label: "Patron" },
                            { key: "assignedLMName", label: "LM Name" },
                            { key: "patronCity", label: "City" },
                            { key: "primaryRole", label: "Role" }
                        ]}
                        onDrawerOpen={(rowId) => {
                            setOpenDrawerId(rowId);
                            fetchCandidateDetails(rowId);
                        }}
                        expandedRow={openDrawerId}
                        onDrawerClose={() => setOpenDrawerId(null)}
                        // ✅ NEW: Centered Create Profile button
                        centeredAction={{
                            label: "Create Profile",
                            color: "#EF5F24",
                            width: "180px",
                            height: "32px",
                            onClick: async (row, rowId) => {
                                setSelectedPatronId(row.id);
                                setSelectedPatronData(row);
                                setShowModal(true);
                                fetchSkillsForRole(row.primaryRole);

                                try {
                                    const candidateDetailsRef = collection(db, "patronAddRequest", row.id, "candidateDetails");
                                    const snapshot = await getDocs(candidateDetailsRef);
                                    const candidateNames = snapshot.docs
                                        .map(doc => doc.data())
                                        .filter(candidate => candidate.candidateStatus === "Office Trial Completed")
                                        .map(candidate => candidate.candidateName || "Unnamed");
                                    setSelectedCandidates(candidateNames);
                                } catch (err) {
                                    console.error("Error fetching candidate names:", err);
                                    setSelectedCandidates([]);
                                }
                            }
                        }}

                        drawerContent={renderDrawerContent}  // ✅ Use updated function
                        defaultOrderBy={{ field: "createdAt", direction: "desc" }}
                    />
                )}
            </div>

            {/* ✅ Mobile-Responsive Create Profile Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-opacity-40 flex justify-center items-start sm:items-center z-50 p-4 overflow-y-auto"
                    onClick={() => setShowModal(false)}

                >
                    <div
                        className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl shadow-lg relative animate-fadeIn my-4 sm:my-0 max-h-[95vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                    >
                        <button
                            onClick={() => {
                                // Close the modal
                                setShowModal(false);

                                // Hide the skills dropdown
                                setShowSkillsDropdown(false);
                                setIsEditMode(false);
                                setEditingCandidateId(null);
                                // Reset all form fields
                                setFormData({
                                    candidateName: "",
                                    about: "",
                                    skills: [],
                                    age: "",
                                    experience: "",
                                    language: [],
                                    workingHours: "",
                                    quotes: "",
                                    uploadFile: null,
                                    addressVerification: null,
                                    referenceVerification: null,
                                    policeVerification: null,
                                    addressVerificationUrl: "",
                                    referenceVerificationUrl: "",
                                    policeVerificationUrl: "",
                                });
                            }}
                            className="absolute top-3 right-3 text-blue-600 hover:text-red-600 text-2xl font-bold z-10"
                        >
                            ✕
                        </button>


                        <h2 className="text-xl sm:text-2xl font-semibold text-center text-orange-700 mb-4 sm:mb-6 pr-8">
                            {isEditMode ? "Edit Candidate Profile" : "Create Candidate Profile"}
                        </h2>

                        <div className="space-y-3 sm:space-y-4">
                            <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">Name</label>
                            <select
                                className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
                                value={formData.candidateName}
                                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                                disabled={isEditMode}
                            >
                                <option value="">Select Candidate</option>
                                {selectedCandidates.map((name, idx) => (
                                    <option key={idx} value={name}>{name}</option>
                                ))}
                            </select>
                            {isEditMode && (
                                <p className="text-xs text-blue-600 mt-1">
                                    Editing profile for: <strong>{formData.candidateName}</strong>
                                </p>
                            )}

                            <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">About</label>
                            <textarea
                                className="w-full border rounded-lg p-2 sm:p-3 focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
                                placeholder="About Section"
                                rows="3"
                                value={formData.about}
                                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                            />

                            {/* ✅ Mobile-Friendly Skills Dropdown */}
                            <div className="skills-dropdown-container">
                                <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">Primary Skills</label>

                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
                                        className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 focus:ring-2 focus:ring-orange-500 bg-white text-left flex items-center justify-between text-sm sm:text-base"
                                    >
                                        <span className="text-gray-700 truncate">
                                            {formData.skills.length > 0
                                                ? `${formData.skills.length} skill${formData.skills.length !== 1 ? 's' : ''} selected`
                                                : '+ Add Skills'}
                                        </span>
                                        <span className="text-gray-500 flex-shrink-0 ml-2">▼</span>
                                    </button>

                                    {showSkillsDropdown && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 sm:max-h-60 overflow-y-auto">
                                            {/* Select All */}
                                            <div
                                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b flex items-center gap-2 sticky top-0 bg-white"
                                                onClick={() => {
                                                    if (formData.skills.length === skillsList.length) {
                                                        setFormData({ ...formData, skills: [] });
                                                    } else {
                                                        setFormData({ ...formData, skills: [...skillsList] });
                                                    }
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.skills.length === skillsList.length}
                                                    onChange={() => { }}
                                                    className="w-4 h-4"
                                                />
                                                <span className="font-semibold text-blue-600 text-sm sm:text-base">
                                                    {formData.skills.length === skillsList.length ? "Deselect All" : "Select All"}
                                                </span>
                                            </div>

                                            {/* Individual Skills */}
                                            {skillsList.map((skill, idx) => {
                                                const isSelected = formData.skills.includes(skill);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 text-sm sm:text-base ${isSelected ? 'bg-blue-100' : ''}`}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setFormData({
                                                                    ...formData,
                                                                    skills: formData.skills.filter(s => s !== skill)
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    skills: [...formData.skills, skill]
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => { }}
                                                            className="w-4 h-4 flex-shrink-0"
                                                        />
                                                        <span className="break-words">{skill}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Selected Skills Tags */}
                                {formData.skills.length > 0 && (
                                    <div className="mt-2 sm:mt-3 flex flex-wrap gap-2">

                                        {formData.skills.map((skill, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded-full flex items-center gap-2 text-xs sm:text-sm"
                                            >
                                                <span className="break-words">{skill}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            skills: formData.skills.filter(s => s !== skill)
                                                        });
                                                    }}
                                                    className="hover:text-red-200 font-bold text-base sm:text-lg leading-none flex-shrink-0"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">Age</label>
                            <input
                                type="text"
                                placeholder="Age (years)"
                                className="w-full border rounded-lg p-2 sm:p-3 focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            />

                            <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">Experience</label>
                            <input
                                type="text"
                                placeholder="Total Experience (years)"
                                className="w-full border rounded-lg p-2 sm:p-3 focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
                                value={formData.experience}
                                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                            />

                            <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">Working Hours</label>
                            <input
                                type="text"
                                placeholder="Working Hours"
                                className="w-full border rounded-lg p-2 sm:p-3 focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
                                value={formData.workingHours}
                                onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                            />


                            <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">Languages (Select multiple)</label>
                            <div className="w-full border rounded-lg p-3 focus-within:ring-2 focus-within:ring-orange-500 bg-white max-h-48 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-2">
                                    {["English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu", "Gujarati", "Kannada", "Odia", "Malayalam"].map((lang) => (
                                        <label key={lang} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={Array.isArray(formData.language) ? formData.language.includes(lang) : formData.language === lang}
                                                onChange={(e) => {
                                                    const currentLanguages = Array.isArray(formData.language) ? formData.language : (formData.language ? [formData.language] : []);
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, language: [...currentLanguages, lang] });
                                                    } else {
                                                        setFormData({ ...formData, language: currentLanguages.filter(l => l !== lang) });
                                                    }
                                                }}
                                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                            />
                                            <span className="text-sm">{lang}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {formData.language && formData.language.length > 0 && (
                                <p className="text-xs text-gray-600 mt-1">
                                    Selected: {Array.isArray(formData.language) ? formData.language.join(', ') : formData.language}
                                </p>
                            )}

                            <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">Quotes</label>
                            <textarea
                                className="w-full border rounded-lg p-2 sm:p-3 focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
                                placeholder="Quotes"
                                rows="2"
                                value={formData.quotes}
                                onChange={(e) => setFormData({ ...formData, quotes: e.target.value })}
                            />

                            {/* ✅ NEW SECTION: Background Verification */}
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Background Verification & Compliance</h3>

                                {/* Address Verification */}
                                <div className="mb-4">
                                    <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">
                                        ID and Address Validation
                                    </label>
                                    {formData.addressVerificationUrl && (
                                        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                            <span className="text-green-700">✓ Document uploaded</span>
                                            <a
                                                href={formData.addressVerificationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-2 text-blue-600 hover:underline"
                                            >
                                                View
                                            </a>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => setFormData({ ...formData, addressVerification: e.target.files[0] })}
                                        className="w-full border rounded-lg p-2 text-sm"
                                    />
                                    {formData.addressVerification && (
                                        <p className="text-xs text-green-600 mt-1">
                                            New file selected: {formData.addressVerification.name}
                                        </p>
                                    )}
                                </div>

                                {/* Reference Check */}
                                <div className="mb-4">
                                    <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">
                                        Reference Check with Past Employer
                                    </label>
                                    {formData.referenceVerificationUrl && (
                                        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                            <span className="text-green-700">✓ Document uploaded</span>
                                            <a
                                                href={formData.referenceVerificationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-2 text-blue-600 hover:underline"
                                            >
                                                View
                                            </a>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => setFormData({ ...formData, referenceVerification: e.target.files[0] })}
                                        className="w-full border rounded-lg p-2 text-sm"
                                    />
                                    {formData.referenceVerification && (
                                        <p className="text-xs text-green-600 mt-1">
                                            New file selected: {formData.referenceVerification.name}
                                        </p>
                                    )}
                                </div>

                                {/* Police Verification */}
                                <div className="mb-4">
                                    <label className="block mb-1 text-gray-700 font-semibold text-sm sm:text-base">
                                        Police Verification
                                    </label>
                                    {formData.policeVerificationUrl && (
                                        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                            <span className="text-green-700">✓ Document uploaded</span>
                                            <a
                                                href={formData.policeVerificationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-2 text-blue-600 hover:underline"
                                            >
                                                View
                                            </a>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => setFormData({ ...formData, policeVerification: e.target.files[0] })}
                                        className="w-full border rounded-lg p-2 text-sm"
                                    />
                                    {formData.policeVerification && (
                                        <p className="text-xs text-green-600 mt-1">
                                            New file selected: {formData.policeVerification.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-center border border-dashed rounded-lg p-3 sm:p-4 text-gray-600">
                                <UploadCloud className="w-6 sm:w-8 h-6 sm:h-8 text-orange-600 mb-2" />
                                <p className="text-xs sm:text-sm text-gray-700 mb-3 text-center px-2">
                                    Drag & drop files here, or click to browse
                                </p>
                                <label className="inline-flex items-center gap-2 bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-md cursor-pointer hover:bg-orange-700 text-sm sm:text-base">
                                    <UploadCloud className="w-4 h-4" />

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setFormData({ ...formData, uploadFile: e.target.files[0] })}
                                        className="text-xs sm:text-sm w-full"
                                    />
                                </label>
                                {formData.uploadFile && (
                                    <p className="text-xs sm:text-sm text-green-600 mt-2">
                                        Selected: {formData.uploadFile.name}
                                    </p>
                                )}

                                {/* <label className="text-sm sm:text-base mb-2">Upload Candidate Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFormData({ ...formData, uploadFile: e.target.files[0] })}
                                    className="text-xs sm:text-sm w-full"
                                />
                                {formData.uploadFile && (
                                    <p className="text-xs sm:text-sm text-green-600 mt-2">
                                        Selected: {formData.uploadFile.name}
                                    </p>
                                )} */}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-5 border-t pt-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 text-sm sm:text-base w-full sm:w-auto"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCompleteProfile}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm sm:text-base w-full sm:w-auto"
                            >
                                {isEditMode ? "Update Profile" : "Complete Profile"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ Mobile-Responsive Profile View */}
            {/* ✅ Profile View using Component */}
            {showProfileModal && viewingCandidate && (
                <>
                    {(() => {
                        const newWindow = window.open('', '_blank', 'width=900,height=800');
                        if (newWindow) {
                            const patronData = selectedPatronData || rows.find(r => r.id === selectedPatronId);
                            const profileHTML = ProfileCard({
                                viewingCandidate,
                                selectedPatronData: patronData,
                                profileScale
                            });
                            newWindow.document.write(profileHTML);
                            newWindow.document.close();
                        }
                        setShowProfileModal(false);
                        return null;
                    })()}
                </>
            )}
            <Snackbar />
        </div>
    );
}