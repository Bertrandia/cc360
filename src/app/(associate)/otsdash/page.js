'use client';
import { useEffect, useState } from "react";
import { querySnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    query,
    where,
    addDoc,
    updateDoc,
    Timestamp,
    doc,
    docs
} from "firebase/firestore";
import { app } from "../../firebase/config";
import { getAuth } from "firebase/auth";
import ExcelTableTemplate from "../../components/ExcelTableTemplate";
import Snackbar, { triggerSnackbar } from "../../components/snakbar";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import { X, Calendar, Filter, Clock, Image as ImageIcon, Plus, Download } from 'lucide-react';
import Link from "next/link";
import Nav from "../../components/navbar";
import CandidateScheduleModal from "../../components/calenderschedule";
import CashMemo from "../../components/CashMemo";
import { LMServiceCard, BenchServiceCard } from "../../components/ServiceCard";
import ReadOnlyScheduleModal from "../../components/readonlycalender";
import { RecurringTaskCard } from "../../components/expandabledrawer";
import CloseTicketModal from "../../components/CloseTicket";
import { StatusBadge } from "../../components/expandabledrawer";
import OTSFormDialog from "../../components/OtsFormPopup";
import QuickTaskDialog from "../../components/Quicktask";

const db = getFirestore(app);

const getRowHighlightClass = (row) => {
    const createdAt = row.createdAt?.toDate ? row.createdAt.toDate() : (row.createdAt ? new Date(row.createdAt) : null);
    const now = new Date();
    const daysDiff = createdAt ? Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)) : -1;

    if (daysDiff >= 3 && row.status === "Pending") {
        return "bg-red-100 border-l-4 border-red-500 hover:bg-red-200";
    }

    switch (row.status) {
        case "Deployed":
            return "bg-green-200 hover:bg-green-300";
        default:
            return "hover:bg-gray-100";
    }
};

function RelocateModal({ open, onClose, onConfirm }) {
    const [candidates, setCandidates] = useState([]);
    const [selected, setSelected] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                const snapshot = await getDocs(collection(db, "patronYcwHelps"));
                const list = snapshot.docs.map(doc => ({
                    id: doc.id,
                    did: doc.data().id,
                    name: doc.data().name
                }));
                setCandidates(list);
            } catch (err) {
                console.error("Error fetching candidates:", err);
            }
        };
        if (open) fetchCandidates();
    }, [open]);

    const filtered = candidates.filter(
        c =>
            c.did.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                className="relative top-1/2 left-1/2 bg-white p-4 sm:p-6 rounded-lg shadow-xl transition-all duration-300"
                style={{
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "480px",
                    maxHeight: dropdownOpen ? "600px" : "480px",
                    overflowY: "auto",
                    fontFamily: 'NeuzeitGro, sans-serif'
                }}
            >
                <h3 className="text-base sm:text-lg font-semibold mb-4 text-center text-gray-900" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                    Relocate Candidate
                </h3>

                <div className="mb-4 relative">
                    <label className="block text-gray-700 font-medium mb-1 text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                        Select Candidate
                    </label>

                    <div
                        className="border rounded-lg bg-gray-50 px-3 py-2 cursor-pointer flex justify-between items-center"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                    >
                        <span className="text-gray-700 truncate text-sm">
                            {selected
                                ? filtered.find(c => c.did === selected)?.did + " - " + filtered.find(c => c.did === selected)?.name
                                : "Select Candidate"}
                        </span>
                        <span className="text-gray-500">â–¼</span>
                    </div>

                    {dropdownOpen && (
                        <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-md max-h-56 overflow-y-auto">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full p-2 border-b focus:outline-none text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                            />
                            {filtered.length > 0 ? (
                                filtered.map((c) => (
                                    <div
                                        key={c.id}
                                        className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm ${selected === c.did ? "bg-blue-100" : ""}`}
                                        onClick={() => {
                                            setSelected(c.did);
                                            setDropdownOpen(false);
                                        }}
                                        style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                                    >
                                        {c.did} - {c.name}
                                    </div>
                                ))
                            ) : (
                                <div className="p-3 text-gray-500 text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>No results found</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2 text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Remarks</label>
                    <textarea
                        className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        rows="3"
                        placeholder="Enter your remarks..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                    />
                </div>

                <button
                    onClick={() => {
                        onConfirm(selected, remarks);
                        onClose();
                        setRemarks("");
                    }}
                    className={`${selected ? "bg-[#EF5F24] hover:bg-[#d54d1a]" : "bg-gray-400 cursor-not-allowed"} text-white font-semibold px-4 py-2 rounded w-full transition text-sm sm:text-base`}
                    disabled={!selected}
                    style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                >
                    Confirm
                </button>
            </Box>
        </Modal>
    );
}

function RemarksModal({ open, onClose, onConfirm, statusOption }) {
    const [remarks, setRemarks] = useState("");

    const handleConfirm = () => {
        if (!remarks.trim()) {
            alert("Please enter remarks");
            return;
        }
        onConfirm(remarks);
        setRemarks("");
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                className="relative top-1/2 left-1/2 bg-white p-4 sm:p-6 rounded-lg shadow-xl"
                style={{
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "400px",
                    fontFamily: 'NeuzeitGro, sans-serif'
                }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-white bg-[#EF5F24] hover:bg-[#d54d1a] rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold"
                >
                    âœ•
                </button>

                <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-900" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                    [{statusOption}] remarks
                </h3>

                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2 text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Remarks</label>
                    <textarea
                        className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        rows="4"
                        placeholder="Enter your remarks..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                    />
                </div>

                <button
                    onClick={handleConfirm}
                    className="bg-[#EF5F24] hover:bg-[#d54d1a] text-white font-semibold px-4 py-2 rounded w-full transition text-sm sm:text-base"
                    style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                >
                    [{statusOption}] - Confirm
                </button>
            </Box>
        </Modal>
    );
}

export default function OtsDashboard() {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [candidateDetailsCache, setCandidateDetailsCache] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});

    const [relocateOpen, setRelocateOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    const [lmServiceCardOpen, setLmServiceCardOpen] = useState(false);
    const [benchServiceCardOpen, setBenchServiceCardOpen] = useState(false);
    const [selectedTaskForServiceCard, setSelectedTaskForServiceCard] = useState(null);

    const [viewScheduleModalOpen, setViewScheduleModalOpen] = useState(false);

    const [remarksModalOpen, setRemarksModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [currentRow, setCurrentRow] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(0);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [cashMemoOpen, setCashMemoOpen] = useState(false);
    const [selectedTaskForMemo, setSelectedTaskForMemo] = useState(null);

    const [openRecurringDrawer, setOpenRecurringDrawer] = useState(null);

    const [closeTicketOpen, setCloseTicketOpen] = useState(false);
    const [selectedTaskForCloseTicket, setSelectedTaskForCloseTicket] = useState(null);

    const [openDrawerId, setOpenDrawerId] = useState(null); // ADD THIS
    const [dialogType, setDialogType] = useState('ots');
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const [showManualTaskDialog, setShowManualTaskDialog] = useState(false);
    const [showQuickTaskDialog, setShowQuickTaskDialog] = useState(false);

    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [natureOptions, setNatureOptions] = useState([]);

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

    const handleOpenPricingSheet = () => {
        router.push('/pricingsheet');
    };

    const handleOpenCashMemo = async (row) => {
        // Check if any candidates are marked
        try {
            const candidatesRef = collection(db, 'patronOtsAddRequest', row.id, 'candidateDetails');
            const candidatesSnap = await getDocs(candidatesRef);

            const hasMarkedCandidate = candidatesSnap.docs.some(doc =>
                doc.data().isCounted === true
            );

            if (!hasMarkedCandidate) {
                triggerSnackbar('No candidates marked for Cash Memo. Please close the ticket first and select candidates.', 'warning');
                return;
            }

            setSelectedTaskForMemo(row);
            setCashMemoOpen(true);
        } catch (error) {
            console.error('Error checking candidates:', error);
            triggerSnackbar('Error opening Cash Memo', 'error');
        }
    };


    const handleOpenRelocate = (row) => {
        const latestRow = rows.find(r => r.id === row.id) || row;
        setSelectedRow(latestRow);
        setScheduleModalOpen(true);
    };

    const handleOpenLMServiceCard = (row) => {
        setSelectedTaskForServiceCard(row);
        setLmServiceCardOpen(true);
    };

    const handleOpenBenchServiceCard = (row) => {
        setSelectedTaskForServiceCard(row);
        setBenchServiceCardOpen(true);
    };

    const handleStatusChange = (status, row) => {
        setSelectedStatus(status);
        setCurrentRow(row);
        setRemarksModalOpen(true);
    };

    const handleOpenCloseTicket = (row) => {
        setSelectedTaskForCloseTicket(row);
        setCloseTicketOpen(true);
    };

    const handleRemarksConfirm = async (remarks) => {
        if (!currentRow || !selectedStatus) return;

        try {
            const currentTime = Timestamp.now();
            const patronDocRef = doc(db, "patronOtsAddRequest", currentRow.id);
            const associateRef = `/patronOtsAddRequest/${currentRow.id}`;

            let updates = {
                dropdownStatusTime: currentTime,
                lastStatusAction: selectedStatus, // ✅ ADD THIS LINE
            };

            const remarksFieldMap = {
                "Open": { remarksField: "openRemarks", timeField: "openTime" },
                "On Hold": { remarksField: "onHoldRemarks", timeField: "onHoldTime" },
                "Closed": { remarksField: "serviceClosedRemarks", timeField: "serviceClosedTime" },
                "No Revert": { remarksField: "noRevertRemarks", timeField: "noRevertTime" },
                "Service Completed": { remarksField: "serviceCompletedRemarks", timeField: "serviceCompletedTime" },
            };

            if (remarksFieldMap[selectedStatus]) {
                updates[remarksFieldMap[selectedStatus].remarksField] = remarks;
                updates[remarksFieldMap[selectedStatus].timeField] = currentTime;
            }


            if (selectedStatus === "Open") {
                if (currentRow.onHoldStatus && currentRow.onHoldStatus !== "") {
                    updates.status = currentRow.onHoldStatus;
                }
            } else {
                const onHoldStatusEmpty = !currentRow.onHoldStatus || currentRow.onHoldStatus === "";

                if (onHoldStatusEmpty) {
                    updates.onHoldStatus = currentRow.status;
                }

                if (selectedStatus === "On Hold" || selectedStatus === "Closed" || selectedStatus === "Completed") {
                    // ✅ UPDATE OTS PATRON DATABASE FIRST
                    if (selectedStatus === "On Hold") {
                        updates.status = "On Hold";
                        updates.taskStatusCategory = "On Hold";
                        updates.lastComment = "Ticket put on hold.";
                        updates.onHoldDate = currentTime;
                        updates.taskInProcessDate = currentTime;
                    } else if (selectedStatus === "Closed") {
                        updates.status = "Closed";
                        updates.taskStatusCategory = "Closed";
                        updates.lastComment = "Closed.";
                        // updates.taskCancelledDate = currentTime;
                        updates.taskInProcessDate = currentTime;
                    }
                    else if (selectedStatus === "Completed") {
                        updates.status = "Service Completed";
                        updates.taskStatusCategory = "Service Completed";
                        updates.taskCompletedDate = currentTime;
                        updates.taskInProcessDate = currentTime;
                    }

                    // ✅ THEN UPDATE TASK COLLECTION
                    const taskCollectionRef = collection(db, "createTaskCollection");
                    const associateRefString = associateRef;
                    const associateRefDoc = doc(db, 'patronOtsAddRequest', currentRow.id);

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

                        let newTaskStatusCategory = "";
                        let commentText = "";

                        if (selectedStatus === "On Hold") {
                            newTaskStatusCategory = "On Hold";
                            commentText = "The process has been put on hold.";
                            await updateDoc(taskDocRef, {
                                taskStatusCategory: newTaskStatusCategory,
                                lastComment: commentText,
                                onHoldDate: currentTime,
                                taskInProcessDate: currentTime,
                            });
                        } else if (selectedStatus === "Closed") {
                            newTaskStatusCategory = "Closed";
                            commentText = "Ticket has been closed.";
                            await updateDoc(taskDocRef, {
                                status: "Closed",
                                taskStatusCategory: newTaskStatusCategory,
                                lastComment: commentText,
                                // taskCancelledDate: currentTime,
                                taskInProcessDate: currentTime,
                            });
                        }
                        else if (selectedStatus === "Completed") {
                            newTaskStatusCategory = "Service Completed";
                            commentText = "Service has been completed.";
                            await updateDoc(taskDocRef, {
                                status: "Service Completed",
                                taskStatusCategory: newTaskStatusCategory,
                                lastComment: commentText,
                                // taskCancelledDate: currentTime,
                                taskInProcessDate: currentTime,
                            });
                        }

                        // Create commentsThread entry
                        const commentsThreadRef = collection(taskDocRef, "commentsThread");
                        await addDoc(commentsThreadRef, {
                            comment_Text: remarks ? `${commentText} Remarks: ${remarks}` : commentText,
                            timeStamp: currentTime,
                            comment_owner_name: currentUserDisplayName || currentUserEmail || "",
                            comment_owner_img: "",
                            taskRef: taskDocRef,
                            commentDate: currentTime,
                            taskStatusCategory: newTaskStatusCategory,
                            isUpdate: true,
                        });
                    }
                }
            }

            await updateDoc(patronDocRef, updates);

            triggerSnackbar(`Status updated to ${selectedStatus} successfully!`, "success");

            // ✅ Update the specific row in state
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === currentRow.id
                        ? { ...row, ...updates, lastStatusAction: selectedStatus }
                        : row
                )
            );

        } catch (error) {
            console.error("Error updating status:", error);
            triggerSnackbar("Error updating status: " + error.message, "error");
        }
    };

    const handleConfirmRelocate = async (candidateId, remarks, scheduleInfo) => {
        if (!selectedRow || !candidateId) {
            triggerSnackbar("Invalid selection", "error");
            return;
        }

        try {
            const patronDocId = selectedRow.id;
            const patronDocuRef = doc(db, "patronOtsAddRequest", patronDocId);
            const patronDocSnap = await getDoc(patronDocuRef);

            if (!patronDocSnap.exists()) {
                triggerSnackbar("No matching patron found for this request", "error");
                return;
            }

            const patronData = patronDocSnap.data();

            const candidateDetailsRef = collection(patronDocuRef, "candidateDetails");
            const selectedDate = new Date(scheduleInfo.date).toLocaleDateString('en-GB');
            const candidateQuery = query(candidateDetailsRef, where("candidateId", "==", candidateId));
            const candidateSnapshot = await getDocs(candidateQuery);

            if (!candidateSnapshot.empty) {
                // Check if any allocation is on the same date
                let sameeDateAllocation = false;
                candidateSnapshot.forEach(doc => {
                    const data = doc.data();
                    const taskStartTimeArray = data.taskStartTime || [];

                    // Check if any taskStartTime matches the selected date
                    for (const timestamp of taskStartTimeArray) {
                        const allocatedDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                        const allocatedDateStr = allocatedDate.toLocaleDateString('en-GB');
                        if (allocatedDateStr === selectedDate) {
                            sameeDateAllocation = true;
                            break;
                        }
                    }
                });

                if (sameeDateAllocation) {
                    triggerSnackbar("Candidate is already allocated on this date", "warning");
                    return;
                }
            }

            const helpsQuery = query(collection(db, "patronYcwHelps"), where("id", "==", candidateId));
            const helpsSnapshot = await getDocs(helpsQuery);

            if (helpsSnapshot.empty) {
                triggerSnackbar("Candidate not found in patronYcwHelps", "error");
                return;
            }

            const candidateData = helpsSnapshot.docs[0].data();
            const currentTime = Timestamp.now();

            const calculateTaskDuration = (startTime, endTime) => {
                const [startHour, startMin] = startTime.split(':').map(Number);
                const [endHour, endMin] = endTime.split(':').map(Number);
                const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;
                return hours + Math.round(minutes / 15) * 0.25;
            };

            const taskDurationHours = calculateTaskDuration(scheduleInfo.startTime, scheduleInfo.endTime);

            const isD2C = patronData.isD2C === true;

            if (isD2C) {
                const patronRef = patronData.patronRef;

                if (!patronRef) {
                    triggerSnackbar("Patron reference not found", "error");
                    return;
                }

                const patronDocId = patronRef.id;
                const addPatronDetailsRef = doc(db, "addPatronDetails", patronDocId);
                const addPatronDetailsSnap = await getDoc(addPatronDetailsRef);

                if (!addPatronDetailsSnap.exists()) {
                    triggerSnackbar("Patron details not found", "error");
                    return;
                }

                const patronDetails = addPatronDetailsSnap.data();

                let isWithin3Months = false;
                if (patronDetails.lastActivity) {
                    const lastActivityDate = patronDetails.lastActivity.toDate ? patronDetails.lastActivity.toDate() : new Date(patronDetails.lastActivity);
                    const taskStartDate = Timestamp.fromDate(new Date(scheduleInfo.date)).toDate();
                    const threeMonthsAgo = new Date(taskStartDate);
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

                    isWithin3Months = lastActivityDate >= threeMonthsAgo;
                }

                if (isWithin3Months) {
                    const natureOfRequirement = patronData.natureOfRequirement;
                    const patronUpdates = {};

                    if (natureOfRequirement === "Deep cleaning") {
                        const currentHours = patronDetails.patronDeepCleaningHoursLeft || 0;
                        patronUpdates.patronDeepCleaningHoursLeft = currentHours - taskDurationHours;
                        patronUpdates.dlQuarterStartDate = Timestamp.fromDate(new Date(scheduleInfo.date + 'T' + scheduleInfo.startTime));
                    } else if (natureOfRequirement === "Wardrobe/Home organisation") {
                        const currentHours = patronDetails.patronWardrobeHoursLeft || 0;
                        patronUpdates.patronWardrobeHoursLeft = currentHours - taskDurationHours;
                        patronUpdates.wardrobeStartDate = Timestamp.fromDate(new Date(scheduleInfo.date + 'T' + scheduleInfo.startTime));
                    } else if (natureOfRequirement === "On Demand MST") {
                        const currentHours = patronDetails.patronMSTHoursLeft || 0;
                        patronUpdates.patronMSTHoursLeft = currentHours - taskDurationHours;
                        patronUpdates.mstStartDate = Timestamp.fromDate(new Date(scheduleInfo.date + 'T' + scheduleInfo.startTime));
                    }

                    if (Object.keys(patronUpdates).length > 0) {
                        await updateDoc(addPatronDetailsRef, patronUpdates);
                    }
                }
            }

            const taskStartTimestamp = Timestamp.fromDate(new Date(scheduleInfo.date + 'T' + scheduleInfo.startTime));
            const endDate = scheduleInfo.endDate || scheduleInfo.date;
            const taskEndTimestamp = Timestamp.fromDate(new Date(endDate + 'T' + scheduleInfo.endTime));

            await updateDoc(patronDocuRef, {
                resourceAllocatedTime: currentTime,
                candidateId: candidateId,
                status: "Resource Allocated",
                taskStartTime: taskStartTimestamp,
                taskEndTime: taskEndTimestamp,
                adminStartTime: taskStartTimestamp,
                adminEndTime: taskEndTimestamp,
                dropdownStatusTime: currentTime,
                taskDate: Timestamp.fromDate(new Date(scheduleInfo.date)),
                taskStatusTime: currentTime,
                taskStatusCategory: "In Process",
                lastComment: "Resource Allocated",
                taskInProcessDate: currentTime,
            });

            const associateRefDoc = doc(db, 'patronOtsAddRequest', patronDocId);
            await addDoc(candidateDetailsRef, {
                candidateAllocated: true,
                candidateName: String(candidateData.name || ""),
                candidateId: String(candidateId),
                candidateContactNumber: String(candidateData.mobileNumber || ""),
                candidateSource: String(candidateData.source || ""),
                candidateRole: scheduleInfo.candidateRole || '',
                purpose: scheduleInfo.purpose || '',
                resourceAllocatedTime: currentTime,
                candidateStatus: "Resource Allocated",
                candidateStatusTime: currentTime,
                resourceAllocatedRemarks: remarks || "",
                taskStartTime: [taskStartTimestamp],
                taskEndTime: [taskEndTimestamp],
                associateRef: associateRefDoc,
            });

            const associateRef = `/patronOtsAddRequest/${patronDocId}`;
            const createTaskCollectionRef = collection(db, "createTaskCollection");
            const associateRefString = associateRef;

            const taskQueryString = query(createTaskCollectionRef, where("associateRef", "==", associateRefString));
            const taskQueryRef = query(createTaskCollectionRef, where("associateRef", "==", associateRefDoc));

            const [taskSnapshotString, taskSnapshotRef] = await Promise.all([
                getDocs(taskQueryString),
                getDocs(taskQueryRef)
            ]);

            const taskSnapshot = !taskSnapshotString.empty ? taskSnapshotString : taskSnapshotRef;

            if (!taskSnapshot.empty) {
                const taskDoc = taskSnapshot.docs[0];
                const taskDocRef = taskDoc.ref;
                const taskData = taskDoc.data();

                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                const commentData = {
                    comment_Text: `Resource ${candidateData.name} (${candidateId}) allocated successfully for ${scheduleInfo.date} from ${scheduleInfo.startTime} to ${scheduleInfo.endTime}.`,
                    timeStamp: currentTime,
                    comment_owner_name: selectedRow.assignedLMName || "",
                    taskRef: `/createTaskCollection/${taskDoc.id}`,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                };
                await addDoc(commentsThreadRef, commentData);

                if (taskData.isUpdate !== true) {
                    await updateDoc(taskDocRef, {
                        isUpdate: true,
                        taskStatusTime: currentTime,
                        taskStatusCategory: "In Process",
                        lastComment: "Resource Allocated",
                        taskInProcessDate: currentTime,
                    });
                }
            }

            triggerSnackbar("Candidate allocated successfully!", "success");

            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedRow.id
                        ? {
                            ...row,
                            status: "Resource Allocated",
                            candidateId: candidateId,
                            taskStartTime: taskStartTimestamp,
                            taskEndTime: taskEndTimestamp,
                            candidateCount: (row.candidateCount || 0) + 1 // Increment candidate count
                        }
                        : row
                )
            );

            // Clear cache AND re-fetch if drawer is open
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedRow.id];
                return updated;
            });

            setOpenDrawerId(null);
            //  Re-fetch candidate details immediately to update the drawer
            // await fetchCandidateDetails(selectedRow.id, selectedRow);

            setAutoRefresh(prev => prev + 1);

        } catch (error) {
            console.error("Error relocating candidate:", error);
            triggerSnackbar("Error relocating candidate: " + error.message, "error");
        }
    };

    const [currentUserDisplayName, setCurrentUserDisplayName] = useState("");
    const [currentUserSupplyRole, setCurrentUserSupplyRole] = useState("");
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) return;
            const email = user.email;
            setCurrentUserEmail(email);

            const userCollectionRef = collection(db, "user");
            const userQuery = query(userCollectionRef, where("email", "==", email));
            const userSnapshot = await getDocs(userQuery);
            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                const displayName = userData.display_name || "";
                const supplyRole = userData.supplyRole || "";
                setCurrentUserDisplayName(displayName);
                setCurrentUserSupplyRole(supplyRole);
                const adminFlag = supplyRole.toLowerCase() === "admin" || email === "sohail@carecrew.in";
                setIsAdmin(adminFlag);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchNatureOptions = async () => {
            try {
                const snapshot = await getDocs(collection(db, "patronOTS-NatureofRequirement"));
                const options = snapshot.docs.map(doc => doc.data().natureOfRequirement).filter(Boolean);
                setNatureOptions([...new Set(options)]); // Remove duplicates
            } catch (err) {
                console.error("Error fetching nature options:", err);
            }
        };
        fetchNatureOptions();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const collRef = collection(db, "patronOtsAddRequest");
            const snapshot = await getDocs(collRef);

            const patronDetailsSnapshot = await getDocs(collection(db, "addPatronDetails"));
            const marigoldPatrons = new Set();
            patronDetailsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.isComplementary === true) {
                    marigoldPatrons.add(data.patronName);
                }
            });

            let data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // In fetchData function, after querySnapshot.docs.map
            // Fix: Use 'snapshot' instead of 'querySnapshot'
            const rowsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const rowData = { id: docSnap.id, ...docSnap.data() };

                // Fetch candidate count for this patron
                const candidateDetailsRef = collection(db, "patronOtsAddRequest", docSnap.id, "candidateDetails");
                const candidateSnapshot = await getDocs(candidateDetailsRef);
                rowData.candidateCount = candidateSnapshot.size;

                rowData.isMarigold = marigoldPatrons.has(rowData.patronName);

                return rowData;
            }));

            // ✅ CHANGE: Around line 570, in fetchData function, AFTER checking isAdmin
            if (!isAdmin && currentUserDisplayName) {
                data = data.filter(row => {
                    // ✅ Show manual tasks ONLY if created by current user
                    if (row.isManualTask === true && row.assignedBy) {
                        return row.assignedBy === currentUserEmail;
                    }
                    // ✅ Show regular OTS tasks if assigned to current LM
                    return row.assignedLMName === currentUserDisplayName || row.AssignedLMName === currentUserDisplayName;
                });
            }

            const groupedData = groupRecurringTasks(rowsData); // Use rowsData instead of data
            setRows(groupedData);
        } catch (err) {
            console.error("Error fetching data:", err);
        }
        setLoading(false);
    };

    const groupRecurringTasks = (data) => {
        const grouped = {};

        data.forEach(row => {
            const mainTaskRef = row.mainTaskRef;

            if (mainTaskRef) {
                if (!grouped[mainTaskRef]) {
                    grouped[mainTaskRef] = {
                        ...row,
                        isRecurring: true,
                        recurringTasks: [],
                        totalOccurrences: row.totalOccurrences || 1
                    };
                }
                grouped[mainTaskRef].recurringTasks.push(row);
            } else {
                grouped[row.id] = {
                    ...row,
                    isRecurring: false,
                    recurringTasks: []
                };
            }
        });

        return Object.values(grouped);
    };

    const fetchCandidateDetails = async (rowId, row) => {
        if (row.isRecurring && row.recurringTasks) {
            for (const task of row.recurringTasks) {
                if (!candidateDetailsCache[task.id]) {
                    setLoadingDetails(prev => ({ ...prev, [task.id]: true }));

                    try {
                        const candidateDetailsRef = collection(db, "patronOtsAddRequest", task.id, "candidateDetails");
                        const snapshot = await getDocs(candidateDetailsRef);
                        const details = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        setCandidateDetailsCache(prev => ({
                            ...prev,
                            [task.id]: details
                        }));
                    } catch (err) {
                        console.error(`Error fetching candidate details for ${task.id}:`, err);
                        setCandidateDetailsCache(prev => ({
                            ...prev,
                            [task.id]: []
                        }));
                    }

                    setLoadingDetails(prev => ({ ...prev, [task.id]: false }));
                }
            }
            return;
        }

        if (candidateDetailsCache[rowId]) return;

        setLoadingDetails(prev => ({ ...prev, [rowId]: true }));

        try {
            const candidateDetailsRef = collection(db, "patronOtsAddRequest", rowId, "candidateDetails");
            const snapshot = await getDocs(candidateDetailsRef);
            const details = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setCandidateDetailsCache(prev => ({
                ...prev,
                [rowId]: details
            }));
        } catch (err) {
            console.error(`Error fetching candidate details for ${rowId}:`, err);
            setCandidateDetailsCache(prev => ({
                ...prev,
                [rowId]: []
            }));
        }

        setLoadingDetails(prev => ({ ...prev, [rowId]: false }));
    };

    const handleCellEdit = async (rowId, field, newValue) => {
        if (!newValue || newValue === rows.find(r => r.id === rowId)?.[field]) {
            setEditingCell(null);
            return;
        }

        try {
            const docRef = doc(db, "patronOtsAddRequest", rowId);
            await updateDoc(docRef, { [field]: newValue });

            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === rowId ? { ...row, [field]: newValue } : row
                )
            );

            triggerSnackbar(`${field} updated successfully!`, "success");
            setEditingCell(null);
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            triggerSnackbar(`Error updating ${field}`, "error");
        }
    };

    function ExpandableText({ text, maxLength = 100 }) {
        const [expanded, setExpanded] = useState(false);
        const displayText = expanded ? text : text.substring(0, maxLength) + (text.length > maxLength ? "..." : "");

        return (
            <div
                className="cursor-pointer text-gray-900 hover:text-blue-700 transition-colors"
                onClick={() => setExpanded(!expanded)}
                style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
            >
                {displayText}
            </div>
        );
    }

    useEffect(() => {
        fetchData();
    }, []);

    const columns = [
        {
            key: "patronName",
            label: "Patron Name",
            bold: true,
            render: (val, row) => {
                let displayName = val;

                // Handle Quick Task display
                if (row.isQuickTask === true) {
                    if (row.purpose) {
                        displayName = row.purpose;
                    }
                    if (val && val !== 'Quick Task (No Patron)') {
                        displayName = `${val} (Quick Task)`;
                    }
                }

                return (
                    <div className="flex items-center gap-2">
                        <span>{val}</span>
                        {row.isMarigold && (
                            <span className="px-1 text-[10px] font-semibold text-purple-700 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full border border-purple-500 whitespace-nowrap">
                                👑
                            </span>
                        )}
                    </div>
                )
            }
        },
        { key: "assignedLMName", label: "LM Name", bold: true },
        {
            key: "createdAt",
            label: "Task Created Date",
            render: (val) => {
                if (!val) return "";
                try {
                    const date = val.toDate ? val.toDate() : (val instanceof Date ? val : new Date(val));
                    return date.toLocaleDateString("en-GB");
                } catch (e) {
                    return "-";
                }
            }
        },
        { key: "serviceCode", label: "Service Code" },
        { key: "clientCode", label: "Client Code" },
        {
            key: "patronCity",
            label: "City",
            render: (val, row) => {
                const cellKey = `${row.id}-patronCity`;
                const isEditing = editingCell === cellKey;

                return isEditing ? (
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellEdit(row.id, "patronCity", editValue)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCellEdit(row.id, "patronCity", editValue);
                            if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="border border-blue-500 rounded px-2 py-1 w-full text-sm"
                    />
                ) : (
                    <div
                        onClick={() => {
                            setEditingCell(cellKey);
                            setEditValue(val || "");
                        }}
                        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                    >
                        {val || "-"}
                    </div>
                );
            }
        },
        {
            key: "natureOfRequirement",
            label: "Nature Of Requirement",

        },
        { key: "requestType", label: "Request Type" },
        {
            key: "taskStartTime",
            label: "Task Start Date",
            render: (val) => {
                if (!val) return "";
                try {
                    const date = val.toDate ? val.toDate() : (val instanceof Date ? val : new Date(val));
                    return date.toLocaleDateString("en-GB");
                } catch (e) {
                    return "-";
                }
            }
        },
        { key: "status", label: "Status", render: (val) => <StatusBadge status={val || 'N/A'} /> },
        {
            key: "statusAction",
            label: "Status Action",
            render: (_, row) => {
                const options = ["Open", "On Hold", "Closed", "Completed"];

                const candidateDetails = candidateDetailsCache[row.id] || [];
                const hasServiceCompleted = candidateDetails.some(
                    candidate => candidate.candidateStatus === "Service Completed"
                );

                // For OTS, we can add "Service Completed" option if candidates are approved
                // if (row.status === "Service Completed" ||
                //     row.onHoldStatus === 'Service Completed' ||
                //     hasServiceCompleted) {
                //     options.push("Service Completed");
                // }

                const currentStatusAction = row.lastStatusAction || "Select Action";

                return (
                    <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                        style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                        value={currentStatusAction}
                        onChange={(e) => {
                            if (e.target.value && e.target.value !== "Select Action") {
                                handleStatusChange(e.target.value, row);
                            }
                        }}
                    >
                        <option value="Select Action">Select Action</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            },
        },
        {
            key: "totalHours",
            label: "Total Hour Served",
            render: (val) => {
                // Handle undefined, null, or missing values
                if (val === undefined || val === null || val === '') {
                    return <span className="text-gray-400 text-sm">N/A</span>;
                }
                // Show the value if it exists
                return <span className="text-gray-900 font-medium">{val}</span>;
            }
        },
        {
            key: "recurringService",
            label: "Recurring",
            render: (val, row) => {
                // Use recurringService field from database as source of truth
                const isRecurring = row.recurringService === "Yes";

                if (isRecurring) {
                    const occurrences = row.totalOccurrences || row.recurringTasks?.length || 1;
                    return (
                        <span className="text-blue-600 font-semibold text-xs sm:text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                            Yes ({occurrences})
                        </span>
                    );
                }
                return (
                    <span className="text-gray-500 text-xs sm:text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                        No
                    </span>
                );
            }
        },
    ];

    const renderDrawerContent = (row, rowId) => {

        if (row.isRecurring && row.recurringTasks.length > 0) {
            return (
                <>
                {/* NEW line Add 1148 to 1161 and alos add <></> at 08-04-2026 */}
                 <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-2">

                        <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                                Task Description / Scope of Work
                            </p>

                            <div className="bg-gray-50 border rounded-xl p-2 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                                {row?.scopeOfWork || row?.taskDescription || "No description available"}
                            </div>
                        </div>

                    </div>
                <RecurringTaskCard
                    tasks={row.recurringTasks}
                    onLMServiceCard={handleOpenLMServiceCard}
                    onBenchServiceCard={handleOpenBenchServiceCard}
                    onAllocate={handleOpenRelocate}
                    onCloseTicket={handleOpenCloseTicket}
                    onCashMemo={handleOpenCashMemo}
                    candidateDetailsCache={candidateDetailsCache}
                    onTaskUpdate={(taskId, updates) => {
                        // ✅ Update ONLY the specific task in rows
                        setRows(prevRows =>
                            prevRows.map(row => {
                                if (row.isRecurring && row.recurringTasks) {
                                    return {
                                        ...row,
                                        recurringTasks: row.recurringTasks.map(task =>
                                            task.id === taskId ? { ...task, ...updates } : task
                                        )
                                    };
                                }
                                return row.id === taskId ? { ...row, ...updates } : row;
                            })
                        );

                        triggerSnackbar("Task updated successfully!", "success");
                    }}
                />
                </>
            );
        }

        const candidateDetails = candidateDetailsCache[rowId] || [];
        const isLoading = loadingDetails[rowId];

        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <div className="text-gray-600 text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Loading candidate details...</div>
                </div>
            );
        }

        if (candidateDetails.length === 0) {
            return (
                // <div className="text-gray-500 p-4 text-center bg-white rounded border text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                //     No candidate details found for this request
                // </div>
                    <div className="text-gray-500 p-4 text-start bg-white rounded border">

                    {/* New Code line */}

                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">

                        <div className="mt-5">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                                Task Description / Scope of Work
                            </p>

                            <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                                {row?.scopeOfWork || row?.taskDescription || "No description available"}
                            </div>
                        </div>

                    </div>

                    {/* new code line end */}

                    <div className="text-gray-800 p-4 text-center bg-white rounded border">
                        No candidate details found for this request
                    </div>
                </div>
            );
        }

        const displayFields = [
            { key: "candidateName", label: "Candidate Name" },
            { key: "candidateId", label: "Candidate ID" },
            { key: "candidateContact", label: "Contact" },
            { key: "candidateSource", label: "Source" },
            { key: "isLmApproved", label: "LM Approval", render: (val) => typeof val === "boolean" ? (val ? "true" : "False") : (val || "-") },
            { key: "isPatronApproved", label: "Patron Approval", render: (val) => typeof val === "boolean" ? (val ? "true" : "False") : (val || "-") },
            { key: "lmResourceRemarks", label: "Lm Remarks" },
            { key: "patronResourceRemarks", label: "Patron Remarks" },
            {
                key: "helpAboutSection", label: "About", render: (val, row) => {
                    if (!val) return "-";
                    return <ExpandableText text={val} maxLength={100} />;
                }
            },
            { key: "filledPercentage", label: "Filled %", render: (val) => val ? `${val}%` : '-' },
        ];

        return (
            <div className="bg-gray-50 p-4 sm:p-6">
                {candidateDetails.map((candidate, candIdx) => {
                    return (
                        <div key={candidate.id || candIdx} className="bg-white border border-gray-300 rounded-lg mb-3 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                    Candidate: {candidate.candidateName}
                                </h3>
                            </div>

                            <div className="px-4 py-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
                                    {displayFields.map((field, idx) => {
                                        const value = candidate[field.key];
                                        const displayValue = field.render
                                            ? field.render(value, candidate)
                                            : (value || 'N/A');

                                        return (
                                            <div key={idx}>
                                                <div className="text-[10px] text-gray-500 mb-0.5" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                    {field.label}
                                                </div>
                                                <div
                                                    className="text-xs text-gray-800 font-medium"
                                                    style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                                                >
                                                    {displayValue}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const downloadCSV = async (dataToDownload) => {
        try {
            const rowsWithCandidates = await Promise.all(
                dataToDownload.map(async (record) => {
                    if (!candidateDetailsCache[record.id]) {
                        await fetchCandidateDetails(record.id, record);
                    }
                    return record;
                })
            );

            let csvContent = "Task Id,Service Code,Created At,Client Code,Patron Name,Assigned LM,Location,Nature of Requirement,Pre Tax Amount,Tax Amount,Billable Amount,Task Status,Task Start Time,Task End Time, Total Manhours, Description\n";

            const formatCSVField = (field) => {
                if (field === null || field === undefined || field === '') return '""';
                let stringField = String(field);
                if (field?.toDate) {
                    const date = field.toDate();
                    stringField = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                } else if (field instanceof Date) {
                    stringField = `${field.getDate().toString().padStart(2, '0')}/${(field.getMonth() + 1).toString().padStart(2, '0')}/${field.getFullYear()}`;
                }
                return `"${stringField.replace(/"/g, '""')}"`;
            };

            const formatCSVFieldWithTime = (field) => {
                if (!field) return '""';
                try {
                    const date = field?.toDate ? field.toDate() : field;
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return `"${day}/${month}/${year} ${hours}:${minutes}"`;
                } catch (e) {
                    return '""';
                }
            };

            for (const record of dataToDownload) {
                const candidateDetails = candidateDetailsCache[record.id] || [];

                if (candidateDetails.length === 0) {
                    csvContent += formatCSVField(record.taskID) + "," +
                        formatCSVFieldWithTime(record.serviceCode) + "," +
                        formatCSVFieldWithTime(record.createdAt) + "," +
                        formatCSVField(record.clientCode) + "," +
                        formatCSVField(record.patronName) + "," +
                        formatCSVField(record.assignedLMName) + "," +
                        formatCSVField(record.location) + "," +
                        formatCSVField(record.natureOfRequirement) + "," +
                        formatCSVField(record.preTaxAmount) + "," +
                        formatCSVField(record.taxAmount) + "," +
                        formatCSVField(record.billableAmount) + "," +
                        formatCSVField(record.status) + "," +
                        formatCSVFieldWithTime(record.taskStartTime) + "," +
                        formatCSVFieldWithTime(record.taskEndTime) + "," +
                        formatCSVFieldWithTime(record.totalHours) + "," +
                        // formatCSVField(record.candidateIdList?.length || 0) + "," +
                        // '""' + "," + '""' + "," + '""' + "," + '""' + "," + '""' + "," +
                        // '""' + "," + '""' + "," + '""' + "," + '""' + "," + '""' + "," +
                        // '""' + "," + '""' + "," + '""' + "," + '""' + "," + '""' + "," +
                        // formatCSVField(record.taskDescription) + "," +
                        formatCSVField(record.taskDescription) + "\n";
                } else {
                    for (const candidate of candidateDetails) {
                        csvContent += formatCSVField(record.candidateName) + "," +
                            formatCSVField(record.candidateRole) + "," +
                            formatCSVField(record.itemNatureOfRequirement) + "," +
                            formatCSVField(record.scopeOfWork) + "\n";
                    }
                }
            }

            const now = new Date();
            const fileName = `SupplyTask_${now.getDate().toString().padStart(2, '0')}_${now.getHours()}${now.getMinutes()}.csv`;
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();

            triggerSnackbar("CSV downloaded successfully!", "success");
        } catch (error) {
            console.error("Error downloading CSV:", error);
            triggerSnackbar("Error downloading CSV: " + error.message, "error");
        }
    };

    // const downloadCSV = async (dataToDownload) => {
    //     try {
    //         setLoading(true); // Show loading indicator

    //         // ✅ STEP 1: Fetch ALL candidate details first and wait
    //         console.log('Fetching candidate details for', dataToDownload.length, 'records...');

    //         for (const record of dataToDownload) {
    //             if (!candidateDetailsCache[record.id]) {
    //                 await fetchCandidateDetails(record.id, record);
    //             }
    //         }

    //         // ✅ STEP 2: Wait for state to update (important!)
    //         await new Promise(resolve => setTimeout(resolve, 500));

    //         // ✅ STEP 3: Build CSV with actual data from cache
    //         let csvContent = "Task Id,Service Code,Created At,Client Code,Patron Name,Assigned LM,Location,Nature of Requirement,Pre Tax Amount,Tax Amount,Billable Amount,Task Status,Task Start Time,Task End Time,Total Manhours,Candidate Count,Candidate Name,Candidate ID,Candidate Contact,Candidate Source,Candidate Role,Item Nature Of Requirement,Scope Of Work,Task Description\n";

    //         const formatCSVField = (field) => {
    //             if (field === null || field === undefined || field === '') return '""';
    //             let stringField = String(field);
    //             if (field?.toDate) {
    //                 const date = field.toDate();
    //                 stringField = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    //             } else if (field instanceof Date) {
    //                 stringField = `${field.getDate().toString().padStart(2, '0')}/${(field.getMonth() + 1).toString().padStart(2, '0')}/${field.getFullYear()}`;
    //             }
    //             return `"${stringField.replace(/"/g, '""')}"`;
    //         };

    //         const formatCSVFieldWithTime = (field) => {
    //             if (!field) return '""';
    //             try {
    //                 const date = field?.toDate ? field.toDate() : new Date(field);
    //                 const day = date.getDate().toString().padStart(2, '0');
    //                 const month = (date.getMonth() + 1).toString().padStart(2, '0');
    //                 const year = date.getFullYear();
    //                 const hours = date.getHours().toString().padStart(2, '0');
    //                 const minutes = date.getMinutes().toString().padStart(2, '0');
    //                 return `"${day}/${month}/${year} ${hours}:${minutes}"`;
    //             } catch (e) {
    //                 return '""';
    //             }
    //         };

    //         // ✅ STEP 4: Process each record and add to CSV
    //         let processedCount = 0;
    //         for (const record of dataToDownload) {
    //             // ✅ Get candidate details from cache (should be populated now)
    //             const candidateDetails = candidateDetailsCache[record.id] || [];

    //             console.log(`Record ${record.id}: Found ${candidateDetails.length} candidates`);

    //             // Common fields for this task
    //             const commonFields =
    //                 formatCSVField(record.taskID) + "," +
    //                 formatCSVField(record.serviceCode) + "," +
    //                 formatCSVFieldWithTime(record.createdAt) + "," +
    //                 formatCSVField(record.clientCode) + "," +
    //                 formatCSVField(record.patronName) + "," +
    //                 formatCSVField(record.assignedLMName) + "," +
    //                 formatCSVField(record.location) + "," +
    //                 formatCSVField(record.natureOfRequirement) + "," +
    //                 formatCSVField(record.preTaxAmount) + "," +
    //                 formatCSVField(record.taxAmount) + "," +
    //                 formatCSVField(record.billableAmount) + "," +
    //                 formatCSVField(record.status) + "," +
    //                 formatCSVFieldWithTime(record.taskStartTime) + "," +
    //                 formatCSVFieldWithTime(record.taskEndTime) + "," +
    //                 formatCSVField(record.totalHours) + "," +
    //                 formatCSVField(candidateDetails.length);

    //             if (candidateDetails.length === 0) {
    //                 // ✅ No candidates - one row with empty candidate fields
    //                 csvContent += commonFields + "," +
    //                     '"",' + // Candidate Name
    //                     '"",' + // Candidate ID
    //                     '"",' + // Candidate Contact
    //                     '"",' + // Candidate Source
    //                     '"",' + // Candidate Role
    //                     '"",' + // Item Nature Of Requirement
    //                     '"",' + // Scope Of Work
    //                     formatCSVField(record.taskDescription) + "\n";
    //             } else {
    //                 // ✅ Has candidates - one row PER candidate
    //                 for (const candidate of candidateDetails) {
    //                     csvContent += commonFields + "," +
    //                         formatCSVField(candidate.candidateName) + "," +
    //                         formatCSVField(candidate.candidateId) + "," +
    //                         formatCSVField(candidate.candidateContactNumber) + "," +
    //                         formatCSVField(candidate.candidateSource) + "," +
    //                         formatCSVField(candidate.candidateRole) + "," +
    //                         formatCSVField(candidate.itemNatureOfRequirement) + "," +
    //                         formatCSVField(candidate.scopeOfWork) + "," +
    //                         formatCSVField(record.taskDescription) + "\n";
    //                 }
    //             }
    //             processedCount++;
    //         }

    //         console.log(`Processed ${processedCount} records for CSV`);

    //         // ✅ STEP 5: Download the file
    //         const now = new Date();
    //         const fileName = `OTS_Tasks_${now.getDate().toString().padStart(2, '0')}_${now.getHours()}${now.getMinutes()}.csv`;

    //         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    //         const link = document.createElement('a');
    //         link.href = URL.createObjectURL(blob);
    //         link.download = fileName;
    //         link.click();

    //         setLoading(false);
    //         triggerSnackbar("CSV downloaded successfully!", "success");

    //     } catch (error) {
    //         console.error("Error downloading CSV:", error);
    //         setLoading(false);
    //         triggerSnackbar("Error downloading CSV: " + error.message, "error");
    //     }
    // };

    return (
        <div>
            <Nav />
            <div className="p-3 sm:p-6">
                {/* Toggle between Associate and OTS */}
                <div className="flex gap-2 mb-4">
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-[#E8E8E8] bg-white text-[#F36A23]"
                    >
                        Associate
                    </Link>
                    <Link
                        href="/otsdash"
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-[#E8E8E8] bg-[#F36A23] text-white"
                    >
                        OTS
                    </Link>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-lg" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Loading OTS Dashboard...</p>
                    </div>
                ) : (
                    <ExcelTableTemplate
                        title="OTS Dashboard"
                        columns={columns}
                        data={rows}
                        defaultRowsPerPage={12}
                        enableRowClick={true}
                        showCandidateCount={false}
                        filters={[
                            { key: "assignedLMName", label: "LM-Name" },
                            { key: "patronName", label: "Patron" },
                            { key: "patronCity", label: "City" },
                            { key: "natureOfRequirement", label: "Role" },
                        ]}
                        showDateFilter={true}
                        dateFilterKey="createdAt"
                        onDrawerOpen={(rowId, row) => {
                            setOpenDrawerId(rowId); //  Track which drawer is open
                            fetchCandidateDetails(rowId, row);
                        }}
                        drawerContent={renderDrawerContent}
                        expandedRow={openDrawerId} //  Pass controlled state
                        onDrawerClose={() => setOpenDrawerId(null)} //  Handle close
                        defaultOrderBy={{ field: "createdAt", direction: "desc" }}
                        getRowClassName={getRowHighlightClass}
                        additionalButtons={[
                            {
                                label: "View Schedule",
                                onClick: () => setViewScheduleModalOpen(true),
                                icon: <Calendar className="w-5 h-5" />,
                                color: "blue",
                                primary: true
                            },
                            {
                                label: "Pricing Sheet",
                                onClick: handleOpenPricingSheet,
                                icon: <Filter className="w-5 h-5" />,
                                color: "green",
                                primary: true
                            },
                            {
                                label: "Create Requirement",
                                onClick: () => {
                                    setDialogType('ots');
                                    setShowCreateDialog(true);
                                },
                                icon: <Plus className="w-5 h-5" />,
                                color: "orange",
                                size: "sm",
                                primary: true
                            },
                            {
                                label: "Quick Task",
                                onClick: () => setShowQuickTaskDialog(true),
                                icon: <Plus className="w-5 h-5" />,
                                color: "purple",
                                size: "sm",
                                primary: true
                            },
                            {
                                label: "Download CSV",
                                onClick: downloadCSV,
                                icon: <Download className="w-5 h-5" />,
                                color: "blue",
                                primary: true
                            },
                        ]}

                    />
                )}
            </div>
            <RelocateModal
                open={relocateOpen}
                onClose={() => setRelocateOpen(false)}
                onConfirm={handleConfirmRelocate}
            />
            <RemarksModal
                open={remarksModalOpen}
                onClose={() => setRemarksModalOpen(false)}
                onConfirm={handleRemarksConfirm}
                statusOption={selectedStatus}
            />
            <CandidateScheduleModal
                open={scheduleModalOpen}
                onClose={() => setScheduleModalOpen(false)}
                onConfirm={handleConfirmRelocate}
                selectedDate={selectedRow?.taskDate?.toDate ? selectedRow.taskDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                primaryRole={selectedRow?.natureOfRequirement || null}
                taskData={selectedRow}
                key={`${selectedRow?.id}-${selectedRow?.natureOfRequirement}`}
            />
            <CashMemo
                open={cashMemoOpen}
                onClose={() => {
                    setCashMemoOpen(false);
                    setSelectedTaskForMemo(null);
                }}
                taskId={selectedTaskForMemo?.id}
                taskData={selectedTaskForMemo}
            />
            <LMServiceCard
                open={lmServiceCardOpen}
                onClose={() => {
                    setLmServiceCardOpen(false);
                    setSelectedTaskForServiceCard(null);
                }}
                taskData={selectedTaskForServiceCard}
                editable={true}
            />

            <BenchServiceCard
                open={benchServiceCardOpen}
                onClose={() => {
                    setBenchServiceCardOpen(false);
                    setSelectedTaskForServiceCard(null);
                }}
                taskData={selectedTaskForServiceCard}
                editable={true}
            />


            <ReadOnlyScheduleModal
                open={viewScheduleModalOpen}
                onClose={() => setViewScheduleModalOpen(false)}
            />
            <CloseTicketModal
                open={closeTicketOpen}
                onClose={() => {
                    setCloseTicketOpen(false);
                    setSelectedTaskForCloseTicket(null);
                }}
                taskId={selectedTaskForCloseTicket?.id}
                taskData={selectedTaskForCloseTicket}
                onSuccess={(updatedTaskData) => { //  PASS UPDATED DATA FROM MODAL
                    // UPDATE ONLY THE SPECIFIC ROW
                    setRows(prevRows =>
                        prevRows.map(row =>
                            row.id === selectedTaskForCloseTicket?.id
                                ? {
                                    ...row,
                                    status: 'Service Completed',
                                    taskStatusCategory: 'Completed',
                                    ...updatedTaskData // Include pricing/hours data
                                }
                                : row
                        )
                    );

                    //  CLEAR CACHE FOR THIS ROW
                    setCandidateDetailsCache(prev => {
                        const updated = { ...prev };
                        delete updated[selectedTaskForCloseTicket?.id];
                        return updated;
                    });
                    setOpenDrawerId(null);
                }}
            />

            {showCreateDialog && dialogType === 'ots' && (
                <OTSFormDialog
                    open={true}
                    activeTab="ots"
                    onClose={() => setShowCreateDialog(false)}
                    onSuccess={async () => {
                        setOpenDrawerId(null);
                    }}
                    isFromOtsDash={true}
                    currentUserEmail={currentUserEmail}
                />
            )}

            {showQuickTaskDialog && (
                <QuickTaskDialog
                    open={true}
                    onClose={() => setShowQuickTaskDialog(false)}
                    onSuccess={async () => {
                        await fetchData();
                        setShowQuickTaskDialog(false);
                        setOpenDrawerId(null);
                    }}
                    currentUserEmail={currentUserEmail}
                />
            )}
            <Snackbar />

        </div>
    );
}