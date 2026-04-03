
'use client';
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import React, { Suspense, useState, useEffect, useCallback } from "react";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    query,
    where,
    addDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../../firebase/config";
import ExcelTableTemplate from "../../components/ExcelTableTemplate";
import ExpandableDrawer from "../../components/expandabledrawer";
import Nav from "../../components/navbar";
import { Snackbar, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Typography } from "@mui/material";
import RoleQuestions from "../../components/rolequestion";
import ProfileCard from "../../components/profile";
import TrialEvaluationForm from "../../components/officetrialform";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ContractFormDialog from "../../components/contractform";
import ContractPreviewDialog from "../../components/contract";
import { User, Plus, X } from "lucide-react";
import { CandidateDetailCard, StatusBadge } from "../../components/expandabledrawer";
import AssociateFormDialog from "../../components/FormPopup";
import OTSFormDialog from "../../components/OtsFormPopup";

const db = getFirestore();
const auth = getAuth();
// Add after imports, before component definition


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

function Lmsheet() {
    const storage = getStorage(app);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [candidateDetailsCache, setCandidateDetailsCache] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});
    const [loggedInEmail, setLoggedInEmail] = useState(null);
    const [lmName, setLmName] = useState("");
    const [openDrawerId, setOpenDrawerId] = useState(null); // ✅ ADD THIS

    // Interview Schedule Dialog State
    const [openSchedule, setOpenSchedule] = useState(false);
    const [selectedScheduleDate, setSelectedScheduleDate] = useState("");
    const [selectedStartTime, setSelectedStartTime] = useState("");
    const [selectedEndTime, setSelectedEndTime] = useState("");
    const [maxDaysAllowed, setMaxDaysAllowed] = useState(0);
    const [resourceAllocatedTime, setResourceAllocatedTime] = useState(null);

    // Trial Schedule Dialog State
    const [openTrialSchedule, setOpenTrialSchedule] = useState(false);
    const [selectedTrialScheduleDate, setSelectedTrialScheduleDate] = useState("");
    const [selectedTrialTime, setSelectedTrialTime] = useState("");

    const [openQuestions, setOpenQuestions] = useState(false);
    const [selectedRole, setSelectedRole] = useState("");

    // Trial / Payment dialog state
    const [openTrialDialog, setOpenTrialDialog] = useState(false);
    const [trialDialogPatronId, setTrialDialogPatronId] = useState(null);
    const [trialDialogPatronName, setTrialDialogPatronName] = useState("");
    const [trialDialogCandidate, setTrialDialogCandidate] = useState(null);
    const [trialProcessing, setTrialProcessing] = useState(false);

    // Office Trial Schedule Dialog State
    const [openOfficeTrialSchedule, setOpenOfficeTrialSchedule] = useState(false);
    const [officeTrialDate, setOfficeTrialDate] = useState("");
    const [officeTrialTime, setOfficeTrialTime] = useState("");
    const [officeTrialFiles, setOfficeTrialFiles] = useState([]);
    const [officeTrialRemarks, setOfficeTrialRemarks] = useState("");

    const [urlFilterRole, setUrlFilterRole] = useState("");
    const [urlFilterStatus, setUrlFilterStatus] = useState("");
    const [urlFilterLM, setUrlFilterLM] = useState("");
    const [urlFilterCity, setUrlFilterCity] = useState("");
    const [urlFilterClientCode, setUrlFilterClientCode] = useState("");

    // Office Trial Execution Dialog State
    const [openOfficeTrial, setOpenOfficeTrial] = useState(false);
    const [officeTrialMode, setOfficeTrialMode] = useState("Offline");
    const [officeTrialEvaluation, setOfficeTrialEvaluation] = useState({
        scores: {},
        remarks: {},
        finalVerdict: ''
    });
    const [officeTrialExecutionFiles, setOfficeTrialExecutionFiles] = useState([]);
    const [officeTrialExecutionRemarks, setOfficeTrialExecutionRemarks] = useState("");

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [viewingCandidate, setViewingCandidate] = useState(null);
    const [viewingPatronData, setViewingPatronData] = useState(null);
    const [profileScale] = useState(0.8);

    // Contract related states
    const [openContractForm, setOpenContractForm] = useState(false);
    const [contractFormData, setContractFormData] = useState({
        associateName: '',
        workingArrangement: '',
        monthlyDues: '',
        scopeOfWork: '',
        deploymentDate: '',
        recruitmentFee: ''
    });
    const [selectedContractPatronId, setSelectedContractPatronId] = useState(null);
    const [selectedContractCandidate, setSelectedContractCandidate] = useState(null);
    const [showContractPreview, setShowContractPreview] = useState(false);
    const [approvedCandidates, setApprovedCandidates] = useState([]);

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [dialogType, setDialogType] = useState('associate'); // 'associate' or 'ots'

    const [completeDetailsModalOpen, setCompleteDetailsModalOpen] = useState(false);
    const [selectedCompleteDetailsRow, setSelectedCompleteDetailsRow] = useState(null);

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

    const isSchedulingAllowed = (candidate, maxDays) => {
        if (!candidate.resourceAllocatedTime || !maxDays) return false;
        const allocatedDate = candidate.resourceAllocatedTime.toDate ?
            candidate.resourceAllocatedTime.toDate() :
            new Date(candidate.resourceAllocatedTime);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        allocatedDate.setHours(0, 0, 0, 0);
        const daysDifference = Math.floor((currentDate - allocatedDate) / (1000 * 60 * 60 * 24));
        return daysDifference <= maxDays;
    };

    const fetchMaxDays = async (candidateStatus) => {
        try {
            const rulesSnapshot = await getDocs(collection(db, "associateDeployementRules"));
            const ruleDoc = rulesSnapshot.docs.find(doc => doc.data().status === candidateStatus);
            if (ruleDoc) {
                return ruleDoc.data().maxNoOfDays || 0;
            }
            return 0;
        } catch (err) {
            console.error("Error fetching max days:", err);
            return 0;
        }
    };

    const getAvailableDates = (resourceAllocatedTime, maxDays) => {
        if (!resourceAllocatedTime || !maxDays) {
            return [];
        }
        const startDate = resourceAllocatedTime.toDate ?
            resourceAllocatedTime.toDate() :
            new Date(resourceAllocatedTime);
        const dates = [];
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        for (let i = 0; i < maxDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            date.setHours(0, 0, 0, 0);
            if (date >= currentDate) {
                dates.push(date.toISOString().split('T')[0]);
            }
        }
        return dates;
    };

    const ensurePatronTrialFields = async (patronId) => {
        try {
            const patronRef = doc(db, "patronAddRequest", patronId);
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

    // Interview Schedule Handlers
    const handleScheduleOpen = async (patronId, candidate, candidateStatus) => {
        const maxDays = await fetchMaxDays(candidateStatus);
        setMaxDaysAllowed(maxDays);
        setSelectedPatronId(patronId);
        setSelectedCandidate(candidate);
        setResourceAllocatedTime(candidate.resourceAllocatedTime);
        setOpenSchedule(true);
    };

    const handleScheduleClose = () => {
        setOpenSchedule(false);
        setSelectedScheduleDate("");
        setSelectedStartTime("");
        setSelectedEndTime("");
        setSelectedCandidate(null);
        setSelectedPatronId(null);
    };


    const handleScheduleSubmit = async () => {
        if (!selectedScheduleDate || !selectedStartTime) {
            showSnackbar("Please select date and time");
            return;
        }
        if (!selectedCandidate || !selectedPatronId) return;

        try {
            const currentTime = new Date();
            const interviewDateTime = new Date(`${selectedScheduleDate}T${selectedStartTime}`);

            const patronRef = doc(db, "patronAddRequest", selectedPatronId);
            const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);

            await updateDoc(candidateRef, {
                interviewScheduleTime: interviewDateTime,
                scheduleTime: currentTime,
                candidateStatus: "Interview Scheduled",
                candidateStatusTime: currentTime,
                officeTrialScheduledBy: loggedInEmail,
            });

            await updateDoc(patronRef, {
                status: "Interview Scheduled",
                dropdownStatusTime: currentTime,
            });

            // Update task collection and create commentsThread
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

                await updateDoc(taskDocRef, {
                    status: "Interview Scheduled",
                    taskStatusCategory: "In Process",
                    lastComment: "Interview has been scheduled for the candidate.",
                    taskInProcessDate: currentTime
                });

                const ownerRef = await getUserRefByDisplayName(lmName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: "Interview has been scheduled for the candidate.",
                    timeStamp: currentTime,
                    comment_owner_name: lmName || loggedInEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: "Interview Scheduled" }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedPatronId];
                return updated;
            });

            // ✅ Re-fetch if drawer is open
            if (openDrawerId === selectedPatronId) {
                await fetchCandidateDetails(selectedPatronId, true);
            }

            showSnackbar("Interview scheduled successfully!");
            handleScheduleClose();
        } catch (err) {
            console.error("Error scheduling interview:", err);
            showSnackbar("Error scheduling interview");
        }
    };

    // Trial Schedule Handlers
    const handleTrialScheduleOpen = (patronId, candidate) => {
        setSelectedPatronId(patronId);
        setSelectedCandidate(candidate);
        setOpenTrialSchedule(true);
    };

    const handleTrialScheduleClose = () => {
        setOpenTrialSchedule(false);
        setSelectedTrialScheduleDate("");
        setSelectedTrialTime("");
        setSelectedCandidate(null);
        setSelectedPatronId(null);
    };

    const handleTrialScheduleSubmit = async () => {
        if (!selectedTrialScheduleDate || !selectedTrialTime) {
            showSnackbar("Please select date and time for trial");
            return;
        }
        if (!selectedCandidate || !selectedPatronId) return;

        try {
            const currentTime = new Date();
            const trialDateTime = new Date(`${selectedTrialScheduleDate}T${selectedTrialTime}`);

            const patronRef = doc(db, "patronAddRequest", selectedPatronId);
            const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);

            // Increment trialsUsed when trial is scheduled
            const { trialCount = 0, trialsUsed = 0 } = await ensurePatronTrialFields(selectedPatronId);
            const newTrialsUsed = (trialsUsed || 0) + 1;

            await updateDoc(candidateRef, {
                trialScheduleTime: trialDateTime,
                trialSetTime: currentTime,
                candidateStatus: "Trial Scheduled",
                candidateStatusTime: currentTime,
            });

            await updateDoc(patronRef, {
                status: "Trial Scheduled",
                dropdownStatusTime: currentTime,
                trialsUsed: newTrialsUsed,
            });

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: "Trial Scheduled", trialsUsed: newTrialsUsed }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedPatronId];
                return updated;
            });

            // ✅ Re-fetch if drawer is open
            if (openDrawerId === selectedPatronId) {
                await fetchCandidateDetails(selectedPatronId, true);
            }

            showSnackbar("Trial scheduled successfully!");
            handleTrialScheduleClose();
        } catch (err) {
            console.error("Error scheduling trial:", err);
            showSnackbar("Error scheduling trial");
        }
    };

    // Called when LM confirms which payment patron made (3 or 6)
    const handleConfirmTrialPayment = async (patronId, trialsToAdd, amount) => {
        if (!patronId) return;
        setTrialProcessing(true);
        try {
            const patronRef = doc(db, "patronAddRequest", patronId);
            await updateDoc(patronRef, {
                advancePaymentReceived: "Yes",
                trialCount: trialsToAdd,
                trialsUsed: 0,
                lastTrialTopUpAmount: amount,
                lastTrialTopUpAt: new Date()
            });

            await fetchLmAndPatronData(loggedInEmail);
            setCandidateDetailsCache({});
            setOpenTrialDialog(false);
            showSnackbar(`Added ${trialsToAdd} trials (₹${amount}).`);

            // After payment confirmed, open the trial schedule dialog
            if (trialDialogCandidate) {
                handleTrialScheduleOpen(patronId, trialDialogCandidate);
            }
        } catch (err) {
            console.error("Error confirming trial payment:", err);
            showSnackbar("Error confirming trial payment.");
        } finally {
            setTrialProcessing(false);
            setTrialDialogCandidate(null);
        }
    };

    const handleQuestionsOpen = (patronData, candidate) => {
        setSelectedRole(patronData.primaryRole);
        setOpenQuestions(true);
    };

    const handleQuestionsClose = () => {
        setOpenQuestions(false);
        setSelectedRole("");
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setLoggedInEmail(user.email);
            } else {
                setLoggedInEmail(null);
                setRows([]);
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

            if (role) setUrlFilterRole(role);
            if (status) setUrlFilterStatus(status);
            if (lm) setUrlFilterLM(lm);
            if (city) setUrlFilterCity(city);
            if (clientCode) setUrlFilterClientCode(clientCode);
        }
    }, [searchParams]);

    useEffect(() => {
        if (loggedInEmail) {
            fetchLmAndPatronData(loggedInEmail);
        }
    }, [loggedInEmail]);

    const [openInterview, setOpenInterview] = useState(false);
    const [openPatronInterview, setOpenPatronInterview] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [selectedPatronId, setSelectedPatronId] = useState(null);
    const [lmRemarks, setLmRemarks] = useState("");
    const [patronRemarks, setPatronRemarks] = useState("");
    const [snackbar, setSnackbar] = useState({ open: false, message: "" });

    const handleInterviewOpen = (patronId, candidate) => {
        setSelectedPatronId(patronId);
        setSelectedCandidate(candidate);
        setOpenInterview(true);
    };

    const handleInterviewClose = () => {
        setOpenInterview(false);
        setLmRemarks("");
        setSelectedCandidate(null);
        setSelectedPatronId(null);
    };

    const handlePatronInterviewOpen = (patronId, candidate) => {
        setSelectedPatronId(patronId);
        setSelectedCandidate(candidate);
        setOpenPatronInterview(true);
    };

    const handlePatronInterviewClose = () => {
        setOpenPatronInterview(false);
        setPatronRemarks("");
        setSelectedCandidate(null);
        setSelectedPatronId(null);
    };

    const showSnackbar = (message) => {
        setSnackbar({ open: true, message });
        setTimeout(() => setSnackbar({ open: false, message: "" }), 3000);
    };

    const handleApprove = async () => {
        if (!selectedCandidate || !selectedPatronId) return;

        const patronRef = doc(db, "patronAddRequest", selectedPatronId);
        const patronSnap = await getDoc(patronRef);
        if (!patronSnap.exists()) return;

        const currentTime = new Date();
        const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);
        const candidateSnap = await getDoc(candidateRef);
        const candidateData = candidateSnap.data();

        if (candidateData.candidateStatus === "Allocated" || candidateData.candidateStatus === "Interview Scheduled" || candidateData.candidateStatus === "Patron Approved" || candidateData.candidateStatus === "Resource Approved") {
            await updateDoc(patronRef, {
                status: "Resource Approved",
                lmRemarks: lmRemarks,
                lmInterviewTime: currentTime,
                dropdownStatusTime: currentTime,
            });

            await updateDoc(candidateRef, {
                lmResourceRemarks: lmRemarks,
                isLmApproved: true,
                lmApprovedTime: currentTime,
                candidateStatus: "Resource Approved",
                candidateStatusTime: currentTime,
            });

            await updateDoc(patronRef, {
                status: "Resource Approved",
                lmRemarks: lmRemarks,
                lmInterviewTime: currentTime,
                dropdownStatusTime: currentTime,
            });

            await updateDoc(candidateRef, {
                lmResourceRemarks: lmRemarks,
                isLmApproved: true,
                lmApprovedTime: currentTime,
                candidateStatus: "Resource Approved",
                candidateStatusTime: currentTime,
            });

            // Update task collection and create commentsThread
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

                await updateDoc(taskDocRef, {
                    status: "Resource Approved",
                    taskStatusCategory: "In Process",
                    lastComment: lmRemarks,
                    taskInProcessDate: currentTime
                });


                const ownerRef = await getUserRefByDisplayName(lmName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: lmRemarks,
                    timeStamp: currentTime,
                    comment_owner_name: lmName || loggedInEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: "Resource Approved" }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron and re-fetch
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedPatronId];
                return updated;
            });

            // ✅ Re-fetch details for open drawer
            if (openDrawerId === selectedPatronId) {
                await fetchCandidateDetails(selectedPatronId, true);
            }

            showSnackbar("Candidate approved and data updated!");

        } else {
            showSnackbar("Resource is not allocated");
        }
        handleInterviewClose();
    };

    const handleReject = async () => {
        if (!selectedCandidate || !selectedPatronId) return;

        const patronRef = doc(db, "patronAddRequest", selectedPatronId);
        const currentTime = new Date();

        const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);
        await updateDoc(candidateRef, {
            lmInterviewTime: currentTime,
            dropdownStatusTime: currentTime,
            candidateStatus: "Resource Rejected",
            candidateStatusTime: currentTime,
        });

        // Update task collection and create commentsThread
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

            await updateDoc(taskDocRef, {
                taskStatusCategory: "In Process",
                lastComment: "Candidate has been rejected by LM after interview.",
                taskInProcessDate: currentTime
            });

            const ownerRef = await getUserRefByDisplayName(lmName);
            const commentsThreadRef = collection(taskDocRef, "commentsThread");
            await addDoc(commentsThreadRef, {
                comment_Text: "Candidate has been rejected by LM after interview.",
                timeStamp: currentTime,
                comment_owner_name: lmName || loggedInEmail || "",
                comment_owner_img: "",
                comment_owner_ref: ownerRef,
                taskRef: taskDocRef,
                commentDate: currentTime,
                taskStatusCategory: "In Process",
                isUpdate: true,
            });
        }

        // ✅ Update only the specific row
        setRows(prevRows =>
            prevRows.map(row =>
                row.id === selectedPatronId
                    ? { ...row, status: row.status } // Will be updated after checking all candidates
                    : row
            )
        );

        // ✅ Clear cache for ONLY this patron and re-fetch
        setCandidateDetailsCache(prev => {
            const updated = { ...prev };
            delete updated[selectedPatronId];
            return updated;
        });

        const allCandidatesSnap = await getDocs(collection(db, "patronAddRequest", selectedPatronId, "candidateDetails"));
        const allCandidates = allCandidatesSnap.docs.map(d => d.data());
        const allRejected = allCandidates.every(c => c.candidateStatus === "Resource Rejected");

        if (allRejected) {
            const patronRef = doc(db, "patronAddRequest", selectedPatronId);
            await updateDoc(patronRef, { status: "Resource Rejected" });

            // ✅ Update row status
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: "Resource Rejected" }
                        : row
                )
            );
        }

        // ✅ Re-fetch details for open drawer
        if (openDrawerId === selectedPatronId) {
            await fetchCandidateDetails(selectedPatronId, true);
        }

        showSnackbar("Candidate rejected and data updated!");
        handleInterviewClose();
    };

    const handlePatronApprove = async () => {
        if (!selectedCandidate || !selectedPatronId) return;

        const patronRef = doc(db, "patronAddRequest", selectedPatronId);
        const patronSnap = await getDoc(patronRef);
        if (!patronSnap.exists()) return;

        const currentTime = new Date();
        const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);
        const candidateSnap = await getDoc(candidateRef);
        const candidateData = candidateSnap.data();

        if (candidateData.candidateStatus === "Trial Scheduled") {
            await updateDoc(patronRef, {
                status: "Patron Approved",
                patronRemarks: patronRemarks,
                patronInterviewTime: currentTime,
                dropdownStatusTime: currentTime,
            });

            await updateDoc(candidateRef, {
                patronResourceRemarks: patronRemarks,
                isPatronApproved: true,
                patronApprovedTime: currentTime,
                candidateStatus: "Patron Approved",
                candidateStatusTime: currentTime,
            });

            // NOTE: trialsUsed is already incremented during trial scheduling, not here anymore

            // Update task collection and create commentsThread
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

                await updateDoc(taskDocRef, {
                    status: "Patron Approved",
                    taskStatusCategory: "In Process",
                    lastComment: patronRemarks,
                    taskInProcessDate: currentTime
                });

                const ownerRef = await getUserRefByDisplayName(lmName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: patronRemarks,
                    timeStamp: currentTime,
                    comment_owner_name: lmName || loggedInEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: "Patron Approved" }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedPatronId];
                return updated;
            });

            // ✅ Re-fetch if drawer is open
            if (openDrawerId === selectedPatronId) {
                await fetchCandidateDetails(selectedPatronId, true);
            }

            showSnackbar("Candidate Patron approved and data updated!");
        } else {
            showSnackbar("Trial is not scheduled for this candidate");
        }
        handlePatronInterviewClose();
    };

    const handlePatronReject = async () => {
        if (!selectedCandidate || !selectedPatronId) return;

        const patronRef = doc(db, "patronAddRequest", selectedPatronId);
        const currentTime = new Date();

        const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);
        await updateDoc(candidateRef, {
            patronInterviewTime: currentTime,
            dropdownStatusTime: currentTime,
            candidateStatus: "Patron Rejected",
            candidateStatusTime: currentTime,
        });

        // ✅ Update only the specific row
        setRows(prevRows =>
            prevRows.map(row =>
                row.id === selectedPatronId
                    ? { ...row, status: row.status } // Status might stay same if not all rejected
                    : row
            )
        );

        // ✅ Clear cache for ONLY this patron
        setCandidateDetailsCache(prev => {
            const updated = { ...prev };
            delete updated[selectedPatronId];
            return updated;
        });
        // NOTE: trialsUsed is already incremented during trial scheduling, not here anymore

        // Update task collection and create commentsThread
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

            await updateDoc(taskDocRef, {
                taskStatusCategory: "In Process",
                lastComment: patronRemarks,
                taskInProcessDate: currentTime
            });

            const ownerRef = await getUserRefByDisplayName(lmName);
            const commentsThreadRef = collection(taskDocRef, "commentsThread");
            await addDoc(commentsThreadRef, {
                comment_Text: patronRemarks,
                timeStamp: currentTime,
                comment_owner_name: lmName || loggedInEmail || "",
                comment_owner_img: "",
                comment_owner_ref: ownerRef,
                taskRef: taskDocRef,
                commentDate: currentTime,
                taskStatusCategory: "In Process",
                isUpdate: true,
            });
        }

        // ✅ Re-fetch if drawer is open
        if (openDrawerId === selectedPatronId) {
            await fetchCandidateDetails(selectedPatronId, true);
        }

        showSnackbar("Candidate rejected and data updated!");
        handlePatronInterviewClose();
    };

    // Add after handlePatronReject function (around line 550)
    const handleCompleteDetails = async (patronId) => {
        if (!patronId) return;

        try {
            const currentTime = new Date();
            const patronRef = doc(db, "patronAddRequest", patronId);

            // Update patronAddRequest
            await updateDoc(patronRef, {
                isCompleteDetails: true,
                detailsCompletedAt: currentTime,
                detailsCompletedBy: lmName || loggedInEmail
            });

            // Update createTaskCollection
            const taskCollectionRef = collection(db, "createTaskCollection");
            const associateRefString = `/patronAddRequest/${patronId}`;
            const associateRefDoc = doc(db, 'patronAddRequest', patronId);

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

                await updateDoc(taskDocRef, {
                    isCompleteDetails: true,
                    detailsCompletedAt: currentTime,
                    detailsCompletedBy: lmName || loggedInEmail,
                    lastComment: "Task details completed by LM",
                });

                const ownerRef = await getUserRefByDisplayName(lmName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: "Task details completed by LM. Ready for Supply team activation.",
                    timeStamp: currentTime,
                    comment_owner_name: lmName || loggedInEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "To be Started",
                    isUpdate: true,
                });
            }

            // Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === patronId
                        ? { ...row, isCompleteDetails: true }
                        : row
                )
            );

            showSnackbar("Task details marked as complete!");
            setCompleteDetailsModalOpen(false);
            setSelectedCompleteDetailsRow(null);

        } catch (err) {
            console.error("Error completing details:", err);
            showSnackbar("Error completing details");
        }
    };

    // Office Trial Schedule Handlers
    const handleOfficeTrialScheduleOpen = (patronId, candidate) => {
        setSelectedPatronId(patronId);
        setSelectedCandidate(candidate);
        setOpenOfficeTrialSchedule(true);
    };

    const handleOfficeTrialScheduleClose = () => {
        setOpenOfficeTrialSchedule(false);
        setOfficeTrialDate("");
        setOfficeTrialTime("");
        setOfficeTrialFiles([]);
        setOfficeTrialRemarks("");
        setSelectedCandidate(null);
        setSelectedPatronId(null);
    };

    const handleOfficeTrialScheduleSubmit = async () => {
        if (!officeTrialDate || !officeTrialTime) {
            showSnackbar("Please select date and time for office trial");
            return;
        }
        if (!selectedCandidate || !selectedPatronId) return;

        try {
            const currentTime = new Date();
            const officeTrialDateTime = new Date(`${officeTrialDate}T${officeTrialTime}`);

            // Upload files to Firebase Storage
            const fileUrls = [];
            for (const file of officeTrialFiles) {
                const storageRef = ref(storage, `officeTrials/${selectedPatronId}/${selectedCandidate.id}/${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                fileUrls.push({ name: file.name, url, type: file.type });
            }

            const patronRef = doc(db, "patronAddRequest", selectedPatronId);
            const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);

            await updateDoc(candidateRef, {
                officeTrialScheduledTime: officeTrialDateTime,
                officeTrialSetTime: currentTime,
                candidateStatus: "Office Trial Scheduled",
                candidateStatusTime: currentTime,
            });

            await updateDoc(patronRef, {
                status: "Office Trial Scheduled",
                dropdownStatusTime: currentTime,
            });

            // Update task collection and create commentsThread
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

                await updateDoc(taskDocRef, {
                    taskStatusCategory: "In Process",
                    lastComment: "Candidate office trial has been scheduled.",
                    taskInProcessDate: currentTime
                });

                const ownerRef = await getUserRefByDisplayName(lmName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: "Candidate office trial has been scheduled.",
                    timeStamp: currentTime,
                    comment_owner_name: lmName || loggedInEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: "Office Trial Scheduled" }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedPatronId];
                return updated;
            });

            // ✅ Re-fetch if drawer is open
            if (openDrawerId === selectedPatronId) {
                await fetchCandidateDetails(selectedPatronId, true);
            }

            showSnackbar("Office trial scheduled successfully!");
            handleOfficeTrialScheduleClose();
        } catch (err) {
            console.error("Error scheduling office trial:", err);
            showSnackbar("Error scheduling office trial");
        }
    };

    // Office Trial Execution Handlers
    const handleOfficeTrialOpen = (patronId, candidate) => {
        setSelectedPatronId(patronId);
        setSelectedCandidate(candidate);
        setOfficeTrialMode("Offline");
        setOfficeTrialEvaluation({ scores: {}, remarks: {}, overallRating: '', finalVerdict: '' });
        setOfficeTrialExecutionFiles([]);
        setOfficeTrialExecutionRemarks("");
        setOpenOfficeTrial(true);
    };

    const handleOfficeTrialClose = () => {
        setOpenOfficeTrial(false);
        setOfficeTrialMode("Offline");
        setOfficeTrialEvaluation({ scores: {}, remarks: {}, overallRating: '', finalVerdict: '' });
        setOfficeTrialExecutionFiles([]);
        setOfficeTrialExecutionRemarks("");
        setSelectedCandidate(null);
        setSelectedPatronId(null);
    };

    const handleOfficeTrialApprove = async () => {
        if (!selectedCandidate || !selectedPatronId) return;

        try {
            const currentTime = new Date();

            // Upload files
            const fileUrls = [];
            for (const file of officeTrialExecutionFiles) {
                const storageRef = ref(storage, `officeTrialExecution/${selectedPatronId}/${selectedCandidate.id}/${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                fileUrls.push({ name: file.name, url, type: file.type });
            }

            const patronRef = doc(db, "patronAddRequest", selectedPatronId);
            const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);

            await updateDoc(candidateRef, {
                officeTrialApproved: true,
                officeTrialRejected: false,
                officeTrialMode: officeTrialMode,
                officeTrialEvaluationForm: officeTrialEvaluation,
                officeTrialExecutionFiles: fileUrls,
                officeTrialCompletedTime: currentTime,
                candidateStatus: "Office Trial Completed",
                candidateStatusTime: currentTime,
                officeTrialBy: loggedInEmail,
            });

            await updateDoc(patronRef, {
                status: "Office Trial Completed",
                dropdownStatusTime: currentTime,
            });

            // Update task collection and create commentsThread
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

                await updateDoc(taskDocRef, {
                    status: "Office Trial Completed",
                    taskStatusCategory: "In Process",
                    lastComment: "Candidate office trial successful.",
                    taskInProcessDate: currentTime
                });

                const ownerRef = await getUserRefByDisplayName(lmName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: "Candidate office trial successful.",
                    timeStamp: currentTime,
                    comment_owner_name: lmName || loggedInEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: "Office Trial Completed" }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedPatronId];
                return updated;
            });

            // ✅ Re-fetch if drawer is open
            if (openDrawerId === selectedPatronId) {
                await fetchCandidateDetails(selectedPatronId, true);
            }

            showSnackbar("Office trial approved successfully!");
            handleOfficeTrialClose();
        } catch (err) {
            console.error("Error approving office trial:", err);
            showSnackbar("Error approving office trial");
        }
    };

    const handleOfficeTrialReject = async () => {
        if (!selectedCandidate || !selectedPatronId) return;

        try {
            const currentTime = new Date();

            // Upload files
            const fileUrls = [];
            for (const file of officeTrialExecutionFiles) {
                const storageRef = ref(storage, `officeTrialExecution/${selectedPatronId}/${selectedCandidate.id}/${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                fileUrls.push({ name: file.name, url, type: file.type });
            }

            const patronRef = doc(db, "patronAddRequest", selectedPatronId);
            const candidateRef = doc(db, "patronAddRequest", selectedPatronId, "candidateDetails", selectedCandidate.id);

            await updateDoc(candidateRef, {
                officeTrialApproved: false,
                officeTrialRejected: true,
                officeTrialMode: officeTrialMode,
                officeTrialEvaluationForm: officeTrialEvaluation,
                officeTrialExecutionFiles: fileUrls,
                officeTrialRejectedTime: currentTime,
                candidateStatus: "Office Trial Rejected",
                candidateStatusTime: currentTime,
                officeTrialBy: loggedInEmail,
            });

            await updateDoc(patronRef, {
                status: "Office Trial Rejected",
                dropdownStatusTime: currentTime,
            });

            // Update task collection and create commentsThread
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

                await updateDoc(taskDocRef, {
                    status: "Office Trial Rejected",
                    taskStatusCategory: "In Process",
                    lastComment: "Candidate has been rejected during office trial.",
                    taskInProcessDate: currentTime
                });

                const ownerRef = await getUserRefByDisplayName(lmName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: "Candidate has been rejected during office trial.",
                    timeStamp: currentTime,
                    comment_owner_name: lmName || loggedInEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedPatronId
                        ? { ...row, status: "Office Trial Rejected" }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedPatronId];
                return updated;
            });

            // ✅ Re-fetch if drawer is open
            if (openDrawerId === selectedPatronId) {
                await fetchCandidateDetails(selectedPatronId, true);
            }

            showSnackbar("Office trial rejected!");
            handleOfficeTrialClose();
        } catch (err) {
            console.error("Error rejecting office trial:", err);
            showSnackbar("Error rejecting office trial");
        }
    };

    // Contract Form Handlers
    const handleOpenContractForm = async (patronId, candidate) => {
        setSelectedContractPatronId(patronId);
        setSelectedContractCandidate(candidate);

        // Fetch all approved candidates for this patron
        const candidatesSnap = await getDocs(collection(db, "patronAddRequest", patronId, "candidateDetails"));
        const approved = candidatesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(c => c.candidateStatus === "Patron Approved" || c.candidateStatus === "Deployed");
        setApprovedCandidates(approved);

        // Get patron data for scopeOfWork
        const patronRef = doc(db, "patronAddRequest", patronId);
        const patronSnap = await getDoc(patronRef);
        const patronData = patronSnap.data();
        setViewingPatronData(patronData);

        // ✅ Pre-fill from CANDIDATE's contract data, not patron's
        if (candidate.contractData) {
            setContractFormData(candidate.contractData);
        } else {
            setContractFormData({
                associateName: candidate.candidateName || '',
                workingArrangement: '',
                monthlyDues: '',
                scopeOfWork: patronData?.scopeOfWork || '',
                deploymentDate: '',
                recruitmentFee: ''
            });
        }

        setOpenContractForm(true);
    };

    const handleCloseContractForm = () => {
        setOpenContractForm(false);
        setContractFormData({
            associateName: '',
            workingArrangement: '',
            monthlyDues: '',
            scopeOfWork: '',
            deploymentDate: '',
            recruitmentFee: ''
        });
        setSelectedContractPatronId(null);
        setSelectedContractCandidate(null);
        setApprovedCandidates([]);
        setViewingPatronData(null);
    };

    const handleSaveContractForm = async () => {
        if (!selectedContractPatronId || !selectedContractCandidate) return;

        // Validate required fields
        if (!contractFormData.associateName || !contractFormData.deploymentDate) {
            showSnackbar("Please fill all required fields");
            return;
        }

        try {
            // ✅ Save contract data to CANDIDATE document, not patron document
            const candidateRef = doc(
                db,
                "patronAddRequest",
                selectedContractPatronId,
                "candidateDetails",
                selectedContractCandidate.id
            );

            await updateDoc(candidateRef, {
                contractData: contractFormData,
                contractCreatedAt: new Date()
            });

            // ✅ Update local cache
            setCandidateDetailsCache(prev => ({
                ...prev,
                [selectedContractPatronId]: (prev[selectedContractPatronId] || []).map(c =>
                    c.id === selectedContractCandidate.id
                        ? { ...c, contractData: contractFormData, contractCreatedAt: new Date() }
                        : c
                )
            }));

            showSnackbar("Contract data saved successfully!");

            // ✅ Update only the affected patron's data
            const updatedPatron = await updateSingleRow(selectedContractPatronId);

            // ✅ Force refresh candidate details cache
            if (openDrawerId === selectedContractPatronId) {
                await fetchCandidateDetails(selectedContractPatronId, true);
            }

            handleCloseContractForm();
        } catch (err) {
            console.error("Error saving contract data:", err);
            showSnackbar("Error saving contract data");
        }
    };

    const handleOpenContractPreview = async (patronId, candidate) => {
        // ✅ Check candidate's contract data, not patron's
        if (!candidate.contractData) {
            showSnackbar("Please fill the form first");
            return;
        }

        const patronRef = doc(db, "patronAddRequest", patronId);
        const patronSnap = await getDoc(patronRef);

        if (!patronSnap.exists()) {
            showSnackbar("Patron data not found");
            return;
        }

        const patronData = patronSnap.data();

        setSelectedContractPatronId(patronId);
        setSelectedContractCandidate(candidate);
        setContractFormData(candidate.contractData); // ✅ Use candidate's data
        setViewingPatronData(patronData);
        setShowContractPreview(true);
    };

    const handleCloseContractPreview = () => {
        setShowContractPreview(false);
        setSelectedContractPatronId(null);
        setSelectedContractCandidate(null);
        setViewingPatronData(null);
    };

    const fetchLmAndPatronData = async (email) => {
        setLoading(true);
        try {
            // ✅ Get current user's UID instead of searching by email
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.warn("No authenticated user");
                setRows([]);
                setLoading(false);
                return;
            }

            // ✅ Get user doc directly by UID (more reliable)
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

            console.log("✅ LM Found:", lmName, lmEmail); // Debug log
            setLmName(lmName);
            const patronsSnapshot = await getDocs(collection(db, "patronAddRequest"));
            console.log("📊 Total patrons in DB:", patronsSnapshot.docs.length); // Debug log

            const patrons = patronsSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => {
                    const assignedName = p.assignedLMName?.trim();
                    const assignedEmail = p.assignedLmEmail?.toLowerCase().trim();

                    // ✅ Match by name OR email with trimming
                    const nameMatch = assignedName === lmName;
                    const emailMatch = assignedEmail === lmEmail;

                    if (nameMatch || emailMatch) {
                        console.log("✅ Matched patron:", p.patronName); // Debug log
                    }

                    return nameMatch || emailMatch;
                });

            console.log("✅ Filtered patrons:", patrons.length); // Debug log

            await Promise.all(patrons.map(async p => {
                try {
                    await ensurePatronTrialFields(p.id);
                } catch (e) {
                    console.warn("ensurePatronTrialFields fail for", p.id, e);
                }
            }));

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
            console.error("Error fetching LM/patron data:", err);
        }
        setLoading(false);
    };
    // STEP 1 + 2: Get LM Name and Fetch Patrons

    const fetchCandidateDetails = async (patronId, forceRefresh = false) => {
        if (!forceRefresh && candidateDetailsCache[patronId]) return;
        setLoadingDetails(prev => ({ ...prev, [patronId]: true }));

        try {
            const candidateDetailsRef = collection(db, "patronAddRequest", patronId, "candidateDetails");
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

    // ✅ Update single patron row without full reload
    const updateSingleRow = async (patronId, updates = {}) => {
        try {
            const patronRef = doc(db, "patronAddRequest", patronId);
            const patronSnap = await getDoc(patronRef);

            if (!patronSnap.exists()) return;

            const rowData = { id: patronSnap.id, ...patronSnap.data(), ...updates };

            // Fetch candidate count
            const candidateDetailsRef = collection(db, "patronAddRequest", patronId, "candidateDetails");
            const candidateSnapshot = await getDocs(candidateDetailsRef);

            rowData.candidateCount = candidateSnapshot.size;

            // Update rows array
            setRows(prevRows =>
                prevRows.map(row => row.id === patronId ? rowData : row)
            );

            return rowData;
        } catch (err) {
            console.error("Error updating single row:", err);
        }
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
    function ScheduleButtonCell({
        candidate,
        patronData,
        patronId,
        fetchMaxDays,
        handleQuestionsOpen,
        isSchedulingAllowed,
        handleScheduleOpen
    }) {
        const candidateStatus = candidate.candidateStatus;
        const patronStatus = patronData?.status;

        const [maxDays, setMaxDays] = useState(0);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const getMaxDays = async () => {
                if (candidateStatus) {
                    const days = await fetchMaxDays(candidateStatus);
                    setMaxDays(days);
                    setLoading(false);
                }
            };
            getMaxDays();
        }, [candidateStatus]);

        if (loading) {
            return (
                <Button
                    variant="contained"
                    size="small"
                    disabled
                    style={{
                        backgroundColor: "#f5f5f5",
                        color: "#bdbdbd",
                        fontSize: "12px",
                        padding: "4px 6px",
                        borderRadius: "6px"
                    }}
                >
                    Loading...
                </Button>
            );
        }

        const canSchedule =
            patronStatus === "Resource Allocated" &&
            isSchedulingAllowed(candidate, maxDays);

        if (
            candidateStatus === "Interview Scheduled" ||
            candidateStatus === "Resource Approved" ||
            candidateStatus === "Patron Approved" ||
            candidateStatus === "Help Profile Created" ||
            candidateStatus === "Resource Rejected" ||
            candidateStatus === "Patron Rejected"
        ) {
            return (
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleQuestionsOpen(patronData, candidate)}
                    style={{
                        backgroundColor: "#9c27b0",
                        color: "#fff",
                        fontSize: "12px",
                        padding: "4px 6px",
                        borderRadius: "6px"
                    }}
                >
                    Questions
                </Button>
            );
        }

        if (canSchedule) {
            return (
                <Button
                    variant="contained"
                    size="small"
                    disabled
                    style={{
                        backgroundColor: "#f5f5f5",
                        color: "#bdbdbd",
                        fontSize: "12px",
                        padding: "4px 6px",
                        borderRadius: "6px",
                        cursor: "not-allowed",
                    }}
                >
                    Expired
                </Button>
            );
        }

        return (
            <Button
                variant="contained"
                size="small"
                onClick={() => handleScheduleOpen(patronId, candidate, candidateStatus)}
                style={{
                    backgroundColor: "#2196f3",
                    color: "#fff",
                    fontSize: "12px",
                    padding: "4px 6px",
                    borderRadius: "6px"
                }}
            >
                Schedule
            </Button>
        );
    }


    const columns = [
        { key: "patronName", label: "Patron Name", bold: true },
        { key: "primaryRole", label: "Primary Role", bold: true },
        { key: "requestID", label: "Request ID" },
        { key: "createdAt", label: "Created Date", render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "" },
        { key: "clientCode", label: "Client Code" },
        { key: "status", label: "Status", render: (val) => <StatusBadge status={val || 'N/A'} /> },
        { key: "taskDueDate", label: "Task Due Date", render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "" },
        { key: "salaryRange", label: "Salary" },
        {
            key: "completeDetails",
            label: "Complete Details",
            render: (_, row) => {
                const isCompleted = row.isCompleteDetails === true;
                const isPending = row.status === "Pending" || !row.status;

                // if (isPending) {
                //     return (
                //         <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                //             N/A
                //         </span>
                //     );
                // }

                if (isCompleted) {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#e8f5e9",
                                color: "#18cb20ff",
                                fontSize: "11px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none',
                                cursor: 'not-allowed'
                            }}
                        >
                            Completed
                        </Button>
                    );
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                            setSelectedCompleteDetailsRow(row.id);
                            setCompleteDetailsModalOpen(true);
                        }}
                        style={{
                            backgroundColor: "#2196f3",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        Confirm
                    </Button>
                );
            },
        },

    ];

    const candidateBasicColumns = [
        {
            key: "scheduleButton",
            label: "LM Interview Schedule",
            render: (_, candidate, patronId) => {
                const candidateStatus = candidate.candidateStatus;

                if (loading) {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#f5f5f5",
                                color: "#bdbdbd",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Loading...
                        </Button>
                    );
                }

                if (candidateStatus === "Office Trial Scheduled" ||
                    candidateStatus === "Office Trial Completed" ||
                    candidateStatus === "Office Trial Rejected" ||
                    candidateStatus === "Resource Approved" ||
                    candidateStatus === "Patron Approved" ||
                    candidateStatus === "Help Profile Created" ||
                    candidateStatus === "Deployed" ||
                    candidateStatus === "Resource Rejected" ||
                    candidateStatus === "Patron Rejected" ||
                    candidateStatus === "Trial Scheduled") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#f3e5f5",
                                color: "#7b1fa2",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Scheduled
                        </Button>
                    );
                }

                if (candidateStatus === "Replaced") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Replaced
                        </Button>
                    );
                }

                if (candidateStatus === "Interview Scheduled") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleScheduleOpen(patronId, candidate, candidateStatus)}
                            style={{
                                backgroundColor: "#1976d2",
                                color: "#fff",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Edit Timing
                        </Button>
                    );
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleScheduleOpen(patronId, candidate, candidateStatus)}
                        style={{
                            backgroundColor: "#1976d2",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        Schedule
                    </Button>
                );
            }
        },
        {
            key: "interviewScheduleTime",
            label: "LM Interview Time",
            render: (_, candidate) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Interview Schedule" || candidateStatus === "Interview Scheduled") {
                    const raw = candidate.interviewScheduleTime;
                    if (!raw) return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>N/A</span>;

                    const dateObj = raw.toDate ? raw.toDate() : new Date(raw);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString("en-US", { month: "long" });
                    const hours = dateObj.getHours();
                    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
                    const formatted = `${day} ${month}, ${hours}:${minutes}`;

                    return <span className="text-blue-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>{formatted}</span>;
                }

                if (candidateStatus === "Allocated" || candidateStatus === "Resource Allocated" || candidateStatus === "Replaced") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Not Yet</span>;
                }

                return <span className="text-green-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Interview Done</span>;
            }
        },
        {
            key: "interviewButton",
            label: "LM Interview Status",
            render: (_, candidate, patronId) => {
                const patronData = rows.find(r => r.id === patronId);
                const status = candidate.candidateStatus;

                // ✅ Don't show button for Replaced candidates
                if (status === "Replaced") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Replaced
                        </Button>
                    );
                }

                if (status === "Resource Approved" || status === "Patron Approved" ||
                    status === "Office Trial Scheduled" || status === "Office Trial Completed" ||
                    status === "Office Trial Rejected" || status === "Help Profile Created" ||
                    status === "Trial Scheduled" || status === "Deployed") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#e8f5e9",
                                color: "#2e7d32",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Approved
                        </Button>
                    );
                }

                if (status === "Resource Rejected" || status === "Patron Rejected") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Rejected
                        </Button>
                    );
                }

                // ✅ Only show active button if status is Interview Scheduled or Resource Allocated
                if (status !== "Interview Scheduled") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            INTERVIEW
                        </Button>
                    );
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleInterviewOpen(patronId, candidate)}
                        style={{
                            backgroundColor: "#f57c00",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        Interview
                    </Button>
                );
            },
        },
        {
            key: "scheduleOfficeTrialButton",
            label: "Office Trial Schedule",
            render: (_, candidate, patronId) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Office Trial Completed" ||
                    candidateStatus === "Office Trial Rejected" ||
                    candidateStatus === "Help Profile Created" ||
                    candidateStatus === "Trial Scheduled" ||
                    candidateStatus === "Patron Approved" ||
                    candidateStatus === "Deployed" ||
                    candidateStatus === "Patron Rejected") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#e3f2fd",
                                color: "#1565c0",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Scheduled
                        </Button>
                    );
                }

                if (candidateStatus === "Resource Rejected") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Rejected
                        </Button>
                    );
                }

                if (candidateStatus === "Office Trial Scheduled") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleOfficeTrialScheduleOpen(patronId, candidate)}
                            style={{
                                backgroundColor: "#1976d2",
                                color: "#fff",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Edit Timing
                        </Button>
                    );
                }

                if (candidateStatus !== "Resource Approved") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Schedule
                        </Button>
                    );
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOfficeTrialScheduleOpen(patronId, candidate)}
                        style={{
                            backgroundColor: "#f57c00",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        Schedule
                    </Button>
                );
            },
        },
        {
            key: "officeTrialScheduleTime",
            label: "Office Trial Time",
            render: (_, candidate) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Office Trial Scheduled") {
                    const raw = candidate.officeTrialScheduledTime;
                    if (!raw) return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>N/A</span>;

                    const dateObj = raw.toDate ? raw.toDate() : new Date(raw);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString("en-US", { month: "long" });
                    const hours = dateObj.getHours();
                    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
                    const formatted = `${day} ${month}, ${hours}:${minutes}`;

                    return <span className="text-blue-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>{formatted}</span>;
                }

                if (candidateStatus === "Allocated" ||
                    candidateStatus === "Resource Allocated" ||
                    candidateStatus === "Resource Rejected" ||
                    candidateStatus === "Interview Scheduled" ||
                    candidateStatus === "Replaced" ||
                    candidateStatus === "Resource Approved") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Not Yet</span>;
                }

                return <span className="text-green-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Office Trial Done</span>;
            }
        },
        {
            key: "officeTrialButton",
            label: "Office Trial Remarks ",
            render: (_, candidate, patronId) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Office Trial Completed" ||
                    candidateStatus === "Help Profile Created" ||
                    candidateStatus === "Trial Scheduled" ||
                    candidateStatus === "Patron Approved" ||
                    candidateStatus === "Deployed") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#e8f5e9",
                                color: "#2e7d32",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Completed
                        </Button>
                    );
                }

                if (candidateStatus === "Office Trial Rejected" || candidateStatus === "Patron Rejected") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Rejected
                        </Button>
                    );
                }

                if (candidateStatus !== "Office Trial Scheduled") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Office Trial
                        </Button>
                    );
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOfficeTrialOpen(patronId, candidate)}
                        style={{
                            backgroundColor: "#d84315",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        Office Trial
                    </Button>
                );
            },
        },
        {
            key: "scheduleTrialButton",
            label: "Patron Trial",
            render: (_, candidate, patronId) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Deployed" ||
                    candidateStatus === "Patron Approved" ||
                    candidateStatus === "Patron Rejected") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#f3e5f5",
                                color: "#7b1fa2",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Scheduled
                        </Button>
                    );
                }

                if (candidateStatus === "Resource Rejected") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Rejected
                        </Button>
                    );
                }

                const onClickScheduleTrialButton = async () => {
                    const { trialCount = 0, trialsUsed = 0, advancePaymentReceived = "No" } = await ensurePatronTrialFields(patronId);
                    const remaining = (trialCount || 0) - (trialsUsed || 0);

                    if (advancePaymentReceived === "Yes" && remaining > 0) {
                        handleTrialScheduleOpen(patronId, candidate);
                        return;
                    }

                    setTrialDialogPatronId(patronId);
                    setTrialDialogPatronName((rows.find(r => r.id === patronId) || {}).patronName || "");
                    setTrialDialogCandidate(candidate);
                    setOpenTrialDialog(true);
                };

                if (candidateStatus === "Trial Scheduled") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            onClick={onClickScheduleTrialButton}
                            style={{
                                backgroundColor: "#1976d2",
                                color: "#fff",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Edit Timing
                        </Button>
                    );
                }



                if (candidateStatus !== "Help Profile Created") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Schedule
                        </Button>
                    );
                }



                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={onClickScheduleTrialButton}
                        style={{
                            backgroundColor: "#1976d2",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        Schedule
                    </Button>
                );
            },
        },
        {
            key: "trialScheduleTime",
            label: "Patron Trial Time",
            render: (_, candidate) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Trial Scheduled") {
                    const raw = candidate.trialScheduleTime;
                    if (!raw) return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>N/A</span>;

                    const dateObj = raw.toDate ? raw.toDate() : new Date(raw);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString("en-US", { month: "long" });
                    const hours = dateObj.getHours();
                    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
                    const formatted = `${day} ${month}, ${hours}:${minutes}`;

                    return <span className="text-blue-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>{formatted}</span>;
                }

                if (candidateStatus === "Allocated" ||
                    candidateStatus === "Resource Allocated" ||
                    candidateStatus === "Resource Rejected" ||
                    candidateStatus === "Replaced" ||
                    candidateStatus === "Interview Scheduled" ||
                    candidateStatus === "Resource Approved" ||
                    candidateStatus === "Office Trial Scheduled" ||
                    candidateStatus === "Office Trial Completed" ||
                    candidateStatus === "Office Trial Rejected" ||
                    candidateStatus === "Help Profile Created") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Not Yet</span>;
                }

                return <span className="text-green-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Trial Done</span>;
            }
        },
        {
            key: "interviewPatronButton",
            label: "Patron Remarks",
            render: (_, candidate, patronId) => {
                const status = candidate.candidateStatus;

                if (status === "Patron Approved" || status === "Deployed") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#e8f5e9",
                                color: "#2e7d32",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Approved
                        </Button>
                    );
                }

                if (status === "Patron Rejected") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Rejected
                        </Button>
                    );
                }

                if (status !== "Trial Scheduled") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            disabled
                            style={{
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Interview
                        </Button>
                    );
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => handlePatronInterviewOpen(patronId, candidate)}
                        style={{
                            backgroundColor: "#f57c00",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        Interview
                    </Button>
                );
            },
        },
        {
            key: "viewProfile",
            label: "View Profile",
            render: (_, candidate, patronId) => {
                const hasProfile = candidate.candidateStatus === "Help Profile Created" ||
                    candidate.candidateStatus === "Patron Approved" ||
                    candidate.candidateStatus === "Trial Scheduled" ||
                    candidate.candidateStatus === "Deployed";

                if (!hasProfile) {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>No Profile Yet</span>;
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                            const patronData = rows.find(r => r.id === patronId);
                            setViewingCandidate(candidate);
                            setViewingPatronData(patronData);
                            setShowProfileModal(true);
                        }}
                        style={{
                            backgroundColor: "#2e7d32",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        View Profile
                    </Button>
                );
            },
        },
        {
            key: "fillForm",
            label: "Fill Form",
            render: (_, candidate, patronId) => {
                // ✅ Check candidate status, not patron status
                if (candidate.candidateStatus !== "Patron Approved" &&
                    candidate.candidateStatus !== "Deployed") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Not Available</span>;
                }
                if (candidate.candidateStatus === "Replaced") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Replaced</span>;
                }

                // ✅ Check if THIS SPECIFIC CANDIDATE has contract data
                const hasContractForThisCandidate = candidate.contractData &&
                    candidate.contractData.associateName === candidate.candidateName;

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenContractForm(patronId, candidate)}
                        style={{
                            backgroundColor: "#1565c0",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        {hasContractForThisCandidate ? 'Edit Form' : 'Fill Form'}
                    </Button>
                );
            },
        },
        {
            key: "contract",
            label: "Contract",
            render: (_, candidate, patronId) => {
                // ✅ Check candidate status
                if (candidate.candidateStatus !== "Deployed" &&
                    candidate.candidateStatus !== "Patron Approved") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Not Available</span>;
                }

                // ✅ Check if THIS SPECIFIC CANDIDATE has contract data
                const hasContractForThisCandidate = candidate.contractData &&
                    candidate.contractData.associateName === candidate.candidateName;

                if (!hasContractForThisCandidate) {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Fill Form First</span>;
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenContractPreview(patronId, candidate)}
                        style={{
                            backgroundColor: "#d84315",
                            color: "#fff",
                            fontSize: "10px",
                            padding: "2px 8px",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            minWidth: 'auto',
                            textTransform: 'none'
                        }}
                    >
                        View Contract
                    </Button>
                );
            },
        },
    ];

    const candidateDetailedColumns = [
        { key: "lmResourceRemarks", label: "LM Remarks" },
        { key: "patronResourceRemarks", label: "Patron Remarks" },
        {
            key: "helpAboutSection",
            label: "About",
            render: (val) => !val ? "-" : <ExpandableText text={val} maxLength={100} />
        },
        { key: "filledPercentage", label: "Filled %", render: (val) => val ? `${val}%` : '-' },
        {
            key: "candidateStatus",
            label: "Candidate Status",
            render: (val) => <StatusBadge status={val} /> // ✅ ADD THIS
        },
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

<div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">

  {/* Header */}
  <div className="mb-5 border-b pb-3">
    <h2 className="text-lg font-semibold text-gray-800">
      Task Details
    </h2>
  </div>

  {/* Grid Info */}
  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">

    {/* Task ID */}
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">Task ID</p>
      <p className="text-xs font-small text-gray-800 mt-1">
        {patron?.taskID || "N/A"}
      </p>
    </div>

    {/* Ethnicity */}
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">Ethnicity Preference</p>
      <p className="text-xs font-medium text-gray-800 mt-1">
        {patron?.ethnicityPreference || "N/A"}
      </p>
    </div>

    {/* Gender */}
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">Gender</p>
      <p className="text-xs font-medium text-gray-800 mt-1">
        {patron?.gender || "N/A"}
      </p>
    </div>

    {/* Language */}
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">Language</p>
      <p className="text-xs font-medium text-gray-800 mt-1">
        {patron?.language || "N/A"}
      </p>
    </div>

  </div>

  {/* Description Section (Highlight) */}
  <div className="mt-6">
    <p className="text-sm font-semibold text-gray-700 mb-2">
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
                    {/* No candidate details found for this patron */}
                </div>
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

        // Action buttons for LM sheet
        // Action buttons with proper labels
        const actionButtons = candidateBasicColumns
            .filter(col =>
                col.key.includes('Button') || col.key.includes('Schedule') ||
                col.key === 'viewProfile' || col.key === 'fillForm' || col.key === 'contract'
            )
            .map(col => {
                // Extract clean label from column key
                let label = col.label || col.key;

                // Remove redundant words for cleaner display
                label = label.replace(/Button$/, '').replace(/Schedule\s+/i, '');

                return {
                    key: col.key,
                    label: label,
                    render: (val, candidate) => col.render(val, candidate, patronId || row.id)
                };
            });

        return (
            <div className="bg-gray-50 p-4 sm:p-6">

                 {/* New Code line 30-03-26 */}

<div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">

  {/* Header */}
  <div className="mb-5 border-b pb-3">
    <h2 className="text-lg font-semibold text-gray-800">
      Task Details
    </h2>
  </div>

  {/* Grid Info */}
  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">

    {/* Task ID */}
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">Task ID</p>
      <p className="text-xs font-xsall text-gray-800 mt-1">
        {patron?.taskID || "N/A"}
      </p>
    </div>

    {/* Ethnicity */}
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">Ethnicity Preference</p>
      <p className="text-xs font-medium text-gray-800 mt-1">
        {patron?.ethnicityPreference || "N/A"}
      </p>
    </div>

    {/* Gender */}
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">Gender</p>
      <p className="text-xs font-medium text-gray-800 mt-1">
        {patron?.gender || "N/A"}
      </p>
    </div>

    {/* Language */}
    <div className="bg-gray-50 p-3 rounded-lg">
      <p className="text-xs text-gray-500">Language</p>
      <p className="text-xs font-medium text-gray-800 mt-1">
        {patron?.language || "N/A"}
      </p>
    </div>

  </div>

  {/* Description Section (Highlight) */}
  <div className="mt-6">
    <p className="text-xs font-semibold text-gray-700 mb-2">
      Task Description / Scope of Work
    </p>

    <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
      {patron?.scopeOfWork || patron?.taskDescription || "No description available"}
    </div>
  </div>

</div>
    {/* new code line end */}
                {candidateDetails.map((candidate, candIdx) => (
                    <CandidateDetailCard
                        key={candidate.id || candIdx}
                        candidate={candidate}
                        patronData={patron}
                        index={candIdx}
                        displayFields={displayFields}
                        actionButtons={actionButtons}
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
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-[#E8E8E8] bg-[#F36A23] text-white"
                    >
                        Associate
                    </Link>
                    <Link
                        href="/otsheet"
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-[#E8E8E8] bg-white text-[#3D3D3D]"
                    >
                        OTS
                    </Link>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-lg">Loading LM Dashboard...</p>
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
                        filters={[
                            { key: "patronCity", label: "City", defaultValue: urlFilterCity },
                            { key: "patronName", label: "Patron" },
                            { key: "status", label: "Status", defaultValue: urlFilterStatus },
                            { key: "primaryRole", label: "Role", defaultValue: urlFilterRole }
                        ]}
                        onDrawerOpen={(rowId, row) => {
                            setOpenDrawerId(rowId); // ✅ Track which drawer is open
                            fetchCandidateDetails(rowId, false);
                        }}
                        expandedRow={openDrawerId} // ✅ Pass controlled state
                        onDrawerClose={() => setOpenDrawerId(null)}
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

            {/* LM Interview Dialog */}
            <Dialog open={openInterview} onClose={handleInterviewClose}>
                <DialogTitle>
                    <span className="text-[#b94700] font-bold text-lg">LM Interview Remarks</span>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        multiline
                        rows={3}
                        fullWidth
                        label="Remarks"
                        value={lmRemarks}
                        onChange={(e) => setLmRemarks(e.target.value)}
                        variant="outlined"
                        style={{ marginTop: "10px", backgroundColor: "#f8fafd" }}
                    />
                </DialogContent>
                <DialogActions style={{ justifyContent: "center", marginBottom: "12px" }}>
                    <Button
                        onClick={handleApprove}
                        variant="contained"
                        style={{ backgroundColor: "#15f720ff", color: "#fff", width: "140px" }}
                    >
                        Approved
                    </Button>
                    <Button
                        onClick={handleReject}
                        variant="contained"
                        style={{ backgroundColor: "#ee3a03ff", color: "#fff", width: "140px" }}
                    >
                        Reject
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Patron Interview Dialog */}
            <Dialog open={openPatronInterview} onClose={handlePatronInterviewClose}>
                <DialogTitle>
                    <span className="text-[#b94700] font-bold text-lg">Patron Interview Remarks</span>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        multiline
                        rows={3}
                        fullWidth
                        label="Remarks"
                        value={patronRemarks}
                        onChange={(e) => setPatronRemarks(e.target.value)}
                        variant="outlined"
                        style={{ marginTop: "10px", backgroundColor: "#f8fafd" }}
                    />
                </DialogContent>
                <DialogActions style={{ justifyContent: "center", marginBottom: "12px" }}>
                    <Button
                        onClick={handlePatronApprove}
                        variant="contained"
                        style={{ backgroundColor: "#15f720ff", color: "#fff", width: "140px" }}
                    >
                        Approved
                    </Button>
                    <Button
                        onClick={handlePatronReject}
                        variant="contained"
                        style={{ backgroundColor: "#ee3a03ff", color: "#fff", width: "140px" }}
                    >
                        Reject
                    </Button>
                </DialogActions>
            </Dialog>



            {/* Schedule Interview Dialog */}
            <Dialog open={openSchedule} onClose={handleScheduleClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <span className="text-[#2196f3] font-bold text-lg">Schedule Interview</span>
                </DialogTitle>
                <DialogContent style={{ marginTop: "20px", paddingTop: "20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <TextField
                            type="date"
                            fullWidth
                            label="Select Date"
                            value={selectedScheduleDate}
                            onChange={(e) => setSelectedScheduleDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: new Date().toISOString().split('T')[0] }}
                            variant="outlined"
                            style={{ backgroundColor: "#f8fafd" }}
                        />
                        <TextField
                            type="time"
                            fullWidth
                            label="Timing"
                            value={selectedStartTime}
                            onChange={(e) => setSelectedStartTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            style={{ backgroundColor: "#f8fafd" }}
                        />
                    </div>
                </DialogContent>
                <DialogActions style={{ justifyContent: "center", marginBottom: "12px", marginTop: "20px" }}>
                    <Button
                        onClick={handleScheduleClose}
                        variant="outlined"
                        style={{ color: "#757575", borderColor: "#757575", width: "140px" }}
                    >
                        CANCEL
                    </Button>
                    <Button
                        onClick={handleScheduleSubmit}
                        variant="contained"
                        style={{ backgroundColor: "#2196f3", color: "#fff", width: "140px" }}
                    >
                        SCHEDULE
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Schedule Trial Dialog */}
            <Dialog open={openTrialSchedule} onClose={handleTrialScheduleClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <span className="text-[#9c27b0] font-bold text-lg">Schedule Trial</span>
                </DialogTitle>
                <DialogContent style={{ marginTop: "20px", paddingTop: "20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <TextField
                            type="date"
                            fullWidth
                            label="Select Date"
                            value={selectedTrialScheduleDate}
                            onChange={(e) => setSelectedTrialScheduleDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: new Date().toISOString().split('T')[0] }}
                            variant="outlined"
                            style={{ backgroundColor: "#f8fafd" }}
                        />
                        <TextField
                            type="time"
                            fullWidth
                            label="Timing"
                            value={selectedTrialTime}
                            onChange={(e) => setSelectedTrialTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            style={{ backgroundColor: "#f8fafd" }}
                        />
                    </div>
                </DialogContent>
                <DialogActions style={{ justifyContent: "center", marginBottom: "12px", marginTop: "20px" }}>
                    <Button
                        onClick={handleTrialScheduleClose}
                        variant="outlined"
                        style={{ color: "#757575", borderColor: "#757575", width: "140px" }}
                    >
                        CANCEL
                    </Button>
                    <Button
                        onClick={handleTrialScheduleSubmit}
                        variant="contained"
                        style={{ backgroundColor: "#9c27b0", color: "#fff", width: "140px" }}
                    >
                        SCHEDULE
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Trial Payment Dialog */}
            <Dialog open={openTrialDialog} onClose={() => { if (!trialProcessing) { setOpenTrialDialog(false); setTrialDialogCandidate(null); } }} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <span className="text-[#b94700] font-bold text-lg">Top-up Trials for {trialDialogPatronName || "Patron"}</span>
                </DialogTitle>
                <DialogContent>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8, fontFamily: 'NeuzeitGro, sans-serif' }}>
                        <div>Patron has no remaining trials. Select which payment the patron made to top up trials:</div>
                        <Button
                            variant="contained"
                            onClick={() => handleConfirmTrialPayment(trialDialogPatronId, 3, 2000)}
                            disabled={trialProcessing}
                            style={{ justifyContent: "space-between", padding: "8px 12px" }}
                        >
                            <span>₹2,000 — Add 3 Trials</span>
                            <strong>3</strong>
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => handleConfirmTrialPayment(trialDialogPatronId, 6, 5000)}
                            disabled={trialProcessing}
                            style={{ justifyContent: "space-between", padding: "8px 12px" }}
                        >
                            <span>₹5,000 — Add 6 Trials</span>
                            <strong>6</strong>
                        </Button>
                        <div style={{ fontSize: 12, color: "#666" }}>
                            This just records LM confirmation of payment on your system. Actual payment happens elsewhere.
                        </div>
                    </div>
                </DialogContent>
                <DialogActions style={{ justifyContent: "center", marginBottom: 12 }}>
                    <Button
                        onClick={() => { if (!trialProcessing) { setOpenTrialDialog(false); setTrialDialogCandidate(null); } }}
                        variant="outlined"
                        style={{ color: "#757575" }}
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Role Questions Dialog */}
            <RoleQuestions
                open={openQuestions}
                onClose={handleQuestionsClose}
                role={selectedRole}
            />

            {/* Schedule Office Trial Dialog */}
            <Dialog open={openOfficeTrialSchedule} onClose={handleOfficeTrialScheduleClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <span className="text-[#ff9800] font-bold text-lg">Schedule Office Trial</span>
                </DialogTitle>
                <DialogContent style={{ marginTop: "20px", paddingTop: "20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <TextField
                            type="date"
                            fullWidth
                            label="Select Date"
                            value={officeTrialDate}
                            onChange={(e) => setOfficeTrialDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: new Date().toISOString().split('T')[0] }}
                            variant="outlined"
                            style={{ backgroundColor: "#f8fafd" }}
                        />
                        <TextField
                            type="time"
                            fullWidth
                            label="Time"
                            value={officeTrialTime}
                            onChange={(e) => setOfficeTrialTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            style={{ backgroundColor: "#f8fafd" }}
                        />
                    </div>
                </DialogContent>
                <DialogActions style={{ justifyContent: "center", marginBottom: "12px", marginTop: "20px" }}>
                    <Button
                        onClick={handleOfficeTrialScheduleClose}
                        variant="outlined"
                        style={{ color: "#757575", borderColor: "#757575", width: "140px" }}
                    >
                        CANCEL
                    </Button>
                    <Button
                        onClick={handleOfficeTrialScheduleSubmit}
                        variant="contained"
                        style={{ backgroundColor: "#ff9800", color: "#fff", width: "140px" }}
                    >
                        SCHEDULE
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Office Trial Execution Dialog */}
            <Dialog
                open={openOfficeTrial}
                onClose={handleOfficeTrialClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    style: {
                        maxHeight: '90vh',
                        borderRadius: '12px'
                    }
                }}
            >
                <DialogTitle sx={{ backgroundColor: '#fff', borderBottom: '1px solid #eee', pb: 1 }}>
                    <Typography sx={{ color: '#ff5722', fontWeight: 'bold' }}>
                        Office Trial - {officeTrialMode} Mode
                    </Typography>
                </DialogTitle>

                <DialogContent style={{ paddingTop: "24px", backgroundColor: '#f9f9f9' }}>

                    {/* Mode Toggle Buttons */}
                    <div style={{
                        display: "flex",
                        justifyContent: 'flex-start',
                        gap: "12px",
                        marginBottom: "24px"
                    }}>
                        <Button
                            variant={officeTrialMode === "Offline" ? "contained" : "outlined"}
                            onClick={() => setOfficeTrialMode("Offline")}
                            sx={{
                                backgroundColor: officeTrialMode === "Offline" ? "#ff5722" : "#fff",
                                color: officeTrialMode === "Offline" ? "#fff" : "#ff5722",
                                borderColor: "#ff5722",
                                fontWeight: "bold",
                                borderRadius: '20px',
                                px: 3,
                                '&:hover': {
                                    backgroundColor: officeTrialMode === "Offline" ? "#e64a19" : "#fff3e0",
                                    borderColor: "#ff5722"
                                }
                            }}
                        >
                            OFFLINE MODE
                        </Button>
                        <Button
                            variant={officeTrialMode === "Online" ? "contained" : "outlined"}
                            onClick={() => setOfficeTrialMode("Online")}
                            sx={{
                                backgroundColor: officeTrialMode === "Online" ? "#ff5722" : "#fff",
                                color: officeTrialMode === "Online" ? "#fff" : "#ff5722",
                                borderColor: "#ff5722",
                                fontWeight: "bold",
                                borderRadius: '20px',
                                px: 3,
                                '&:hover': {
                                    backgroundColor: officeTrialMode === "Online" ? "#e64a19" : "#fff3e0",
                                    borderColor: "#ff5722"
                                }
                            }}
                        >
                            ONLINE MODE
                        </Button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {/* Trial Evaluation Form */}
                        {selectedCandidate && (
                            <TrialEvaluationForm
                                role={rows.find(r => r.id === selectedPatronId)?.primaryRole || "Housekeeper"}
                                formData={officeTrialEvaluation}
                                setFormData={setOfficeTrialEvaluation}
                                showGrillingQuestions={officeTrialMode === "Online"}
                                candidateName={selectedCandidate?.candidateName}
                                evaluatorName={rows.find(r => r.id === selectedPatronId)?.assignedLMName}
                            />
                        )}

                        {/* File Upload Area */}
                        <div style={{
                            padding: "16px",
                            border: "2px dashed #ffb74d",
                            borderRadius: "8px",
                            backgroundColor: "#fff8e1",
                            textAlign: 'center'
                        }}>
                            <label htmlFor="upload-trial-files" style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#e65100", cursor: 'pointer' }}>
                                📤 Upload Trial Evidence (Images, Videos, Documents)
                            </label>
                            <input
                                id="upload-trial-files"
                                type="file"
                                multiple
                                accept="image/*,video/*,.pdf,.doc,.docx"
                                onChange={(e) => setOfficeTrialExecutionFiles(Array.from(e.target.files))}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    marginTop: '10px',
                                    padding: "8px",
                                    color: '#555'
                                }}
                            />
                            {officeTrialExecutionFiles.length > 0 && (
                                <div style={{ marginTop: "12px", fontSize: "13px", color: "#4caf50", fontWeight: 'bold' }}>
                                    ✅ {officeTrialExecutionFiles.length} file(s) selected
                                </div>
                            )}
                        </div>


                    </div>
                </DialogContent>

                <DialogActions style={{ justifyContent: "center", padding: "20px", gap: "16px", backgroundColor: '#fff', borderTop: '1px solid #eee' }}>
                    <Button
                        onClick={handleOfficeTrialClose}
                        variant="outlined"
                        sx={{ color: "#757575", borderColor: "#bdbdbd", width: "120px" }}
                    >
                        CANCEL
                    </Button>
                    <Button
                        onClick={handleOfficeTrialApprove}
                        variant="contained"
                        sx={{ backgroundColor: "#4caf50", color: "#fff", width: "140px", '&:hover': { backgroundColor: "#388e3c" } }}
                    >
                        APPROVE
                    </Button>
                    <Button
                        onClick={handleOfficeTrialReject}
                        variant="contained"
                        sx={{ backgroundColor: "#f44336", color: "#fff", width: "140px", '&:hover': { backgroundColor: "#d32f2f" } }}
                    >
                        REJECT
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Profile View Modal */}
            {showProfileModal && viewingCandidate && (
                <>
                    {(() => {
                        const newWindow = window.open('', '_blank', 'width=900,height=800');
                        if (newWindow) {
                            const profileHTML = ProfileCard({
                                viewingCandidate,
                                selectedPatronData: viewingPatronData,
                                profileScale
                            });
                            newWindow.document.write(profileHTML);
                            newWindow.document.close();
                        }
                        setShowProfileModal(false);
                        setViewingCandidate(null);
                        setViewingPatronData(null);
                        return null;
                    })()}
                </>
            )}

            {/* Contract Form Dialog */}
            <ContractFormDialog
                open={openContractForm}
                onClose={handleCloseContractForm}
                formData={contractFormData}
                setFormData={setContractFormData}
                approvedCandidates={approvedCandidates}
                onSave={handleSaveContractForm}
                patronData={rows.find(r => r.id === selectedContractPatronId)}
            />

            {/* Contract Preview Dialog */}
            <ContractPreviewDialog
                open={showContractPreview}
                onClose={handleCloseContractPreview}
                formData={contractFormData}
                patronData={viewingPatronData}
                on
                Download={() => window.print()}
            />

            <Dialog
                open={completeDetailsModalOpen}
                onClose={() => setCompleteDetailsModalOpen(false)}
            >
                <DialogTitle>
                    <span className="text-[#2196f3] font-bold text-lg">Confirm Details Complete</span>
                </DialogTitle>
                <DialogContent>
                    <p className="text-sm text-gray-700 mt-2">
                        Are you sure all task details have been verified and completed?
                        This will make the task available for Supply team activation.
                    </p>
                </DialogContent>
                <DialogActions style={{ justifyContent: "center", marginBottom: "12px" }}>
                    <Button
                        onClick={() => setCompleteDetailsModalOpen(false)}
                        variant="outlined"
                        style={{ color: "#757575", borderColor: "#757575", width: "120px" }}
                    >
                        CANCEL
                    </Button>
                    <Button
                        onClick={() => handleCompleteDetails(selectedCompleteDetailsRow)}
                        variant="contained"
                        style={{ backgroundColor: "#2196f3", color: "#fff", width: "120px" }}
                    >
                        CONFIRM
                    </Button>
                </DialogActions>
            </Dialog>

            {showCreateDialog && dialogType === 'associate' && (
                <AssociateFormDialog
                    open={true}
                    activeTab="associate"
                    onSwitchTab={(tab) => setDialogType(tab)}
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={async () => {
                        await fetchLmAndPatronData(loggedInEmail);
                        setOpenDrawerId(null);
                    }}
                />
            )}
            {showCreateDialog && dialogType === 'ots' && (
                <OTSFormDialog
                    open={true}
                    activeTab="ots"
                    onSwitchTab={(tab) => setDialogType(tab)}
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={async () => {
                        setOpenDrawerId(null);
                    }}
                    isFromOtsDash={false}
                    currentUserEmail={loggedInEmail}
                />
            )}
            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            />
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading tasks...</div>}>
            <Lmsheet />
        </Suspense>
    );
}