'use client';
import { useState, useEffect } from "react";
import { Modal, Box } from "@mui/material";
import { X, Edit2, Save } from 'lucide-react';
import { getFirestore, doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { app } from "../firebase/config";
import { triggerSnackbar } from "../components/snakbar";

const db = getFirestore(app);

// LM Service Card Component
export function LMServiceCard({ open, onClose, taskData, editable = false }) {
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [cardData, setCardData] = useState({
        serviceCode: "",
        serviceCode: "",
        clientName: "",
        serviceType: "",
        resourcesAllocated: [],
        complementaryManhours: "",
        complementaryManhoursUtilized: "",
        manhoursPlanned: "",
        complementaryManhoursAvailable: "",
        billableAmount: "",
        scopeOfWork: ""
    });

    useEffect(() => {
        if (open && taskData) {
            fetchCardData();
        }
    }, [open, taskData]);

    const fetchCardData = async () => {
        setLoading(true);
        try {
            const taskId = taskData.id;
            const taskDocRef = doc(db, "patronOtsAddRequest", taskId);
            const taskDoc = await getDoc(taskDocRef);

            if (!taskDoc.exists()) {
                triggerSnackbar("Task not found", "error");
                setLoading(false);
                return;
            }

            const taskInfo = taskDoc.data();

            // Fetch allocated candidates
            const candidateDetailsRef = collection(taskDocRef, "candidateDetails");
            const candidateSnapshot = await getDocs(candidateDetailsRef);
            const candidates = candidateSnapshot.docs.map((doc, index) => ({
                sequence: index + 1,
                name: doc.data().candidateName || "N/A",
                id: doc.data().candidateId || "N/A"
            }));

            // Calculate complementary manhours allocated
            let complementaryAllocated = "";
            const natureOfReq = taskInfo.natureOfRequirement;
            if (natureOfReq === "Deep cleaning") {
                complementaryAllocated = "40 hours";
            } else if (natureOfReq === "Wardrobe/Home organisation") {
                complementaryAllocated = "8 hours";
            } else if (natureOfReq === "On Demand MST" || natureOfReq === "On-Demand Gardener") {
                complementaryAllocated = "8 hours";
            }

            // Calculate complementary manhours utilized
            let complementaryUtilized = "";
            let complementaryAvailable = "";

            if (taskInfo.patronRef) {
                let patronId = "";

                // Handle different types of patronRef
                if (typeof taskInfo.patronRef === 'string') {
                    // If it's a string path like "/addPatronDetails/2G6mfRvEC6kurckC8Q9g"
                    patronId = taskInfo.patronRef.split('/').pop();
                } else if (taskInfo.patronRef.id) {
                    // If it's a Firestore DocumentReference object
                    patronId = taskInfo.patronRef.id;
                } else if (taskInfo.patronRef.path) {
                    // If it has a path property
                    patronId = taskInfo.patronRef.path.split('/').pop();
                }

                if (patronId) {
                    try {
                        const patronDetailsRef = doc(db, "addPatronDetails", patronId);
                        const patronDetailsDoc = await getDoc(patronDetailsRef);

                        if (patronDetailsDoc.exists()) {
                            const patronDetails = patronDetailsDoc.data();

                            if (natureOfReq === "Deep cleaning") {
                                const hoursLeft = patronDetails.patronDeepCleaningHoursLeft || 0;
                                complementaryUtilized = `${40 - hoursLeft} hours`;
                                complementaryAvailable = `${hoursLeft} hours`;
                            } else if (natureOfReq === "Wardrobe/Home organisation") {
                                const hoursLeft = patronDetails.patronWardrobeHoursLeft || 0;
                                complementaryUtilized = `${8 - hoursLeft} hours`;
                                complementaryAvailable = `${hoursLeft} hours`;
                            } else if (natureOfReq === "On-Demand MST") {
                            } else if (natureOfReq === "On-Demand MST") {
                                const hoursLeft = patronDetails.patronMstHoursLeft || 0;
                                complementaryUtilized = `${8 - hoursLeft} hours`;
                                complementaryAvailable = `${hoursLeft} hours`;
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching patron details:", error);
                    }
                }
            }

            // Calculate manhours planned   
            let totalManhoursPlanned = 0;

            candidateSnapshot.forEach(candidateDoc => {
                const candidateData = candidateDoc.data();

                // ✅ FIRST: Try to use totalHoursServe if it exists
                if (candidateData.totalHoursServe && candidateData.totalHoursServe > 0) {
                    totalManhoursPlanned += candidateData.totalHoursServe;
                } else {
                    // ✅ FALLBACK: Calculate from taskStartTime and taskEndTime arrays
                    // const taskStartTimeArray = candidateData.taskStartTime || [];
                    // const taskEndTimeArray = candidateData.taskEndTime || [];

                    // if (taskStartTimeArray.length > 0 && taskEndTimeArray.length > 0) {
                    //     const minLength = Math.min(taskStartTimeArray.length, taskEndTimeArray.length);

                    //     for (let i = 0; i < minLength; i++) {
                    //         const startTime = taskStartTimeArray[i].toDate ? taskStartTimeArray[i].toDate() : new Date(taskStartTimeArray[i]);
                    //         const endTime = taskEndTimeArray[i].toDate ? taskEndTimeArray[i].toDate() : new Date(taskEndTimeArray[i]);

                    //         const durationMs = endTime - startTime;
                    //         const hours = durationMs / (1000 * 60 * 60);
                    //         totalManhoursPlanned += hours;
                    //     }
                    // }
                }
            });

            const manhoursPlanned = totalManhoursPlanned > 0 ? `${totalManhoursPlanned.toFixed(2)} hours` : "N/A";


            // Get scope of work
            const scopeOfWork = taskInfo.taskDescription || taskInfo.ScopeOfDetail || "N/A";

            setCardData({
                serviceCode: taskInfo.serviceCode || "N/A",
                clientName: taskInfo.patronName || "N/A",
                serviceType: taskInfo.natureOfRequirement || "N/A",
                resourcesAllocated: candidates,
                complementaryManhours: complementaryAllocated,
                complementaryManhoursUtilized: complementaryUtilized,
                manhoursPlanned: manhoursPlanned,
                complementaryManhoursAvailable: complementaryAvailable,
                billableAmount: taskInfo.billableAmount ? `₹${taskInfo.billableAmount}` : "N/A",
                scopeOfWork: scopeOfWork
            });

        } catch (error) {
            console.error("Error fetching LM service card data:", error);
            triggerSnackbar("Error loading service card", "error");
        }
        setLoading(false);
    };

    const shouldShowComplementary = () => {
        const nature = cardData.serviceType; // Using serviceType as it holds natureOfRequirement
        return nature === "Deep cleaning" ||
            nature === "Wardrobe/Home organisation" ||
            nature === "On Demand MST" ||
            nature === "On-Demand Gardener";
    };

    const handleSave = async () => {
        try {
            const taskDocRef = doc(db, "patronOtsAddRequest", taskData.id);
            await updateDoc(taskDocRef, {
                serviceCard: cardData.serviceCode,
                serviceCard: cardData.serviceCode,
                // Add other editable fields if needed
            });
            triggerSnackbar("Service card updated successfully", "success");
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving service card:", error);
            triggerSnackbar("Error saving service card", "error");
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                className="relative top-1/2 left-1/2 bg-white rounded-lg shadow-xl overflow-y-auto"
                style={{
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "380px",
                    maxHeight: "90vh",
                    fontFamily: 'NeuzeitGro, sans-serif'
                }}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-4 flex justify-between items-center z-10 shadow-md">
                    <h3 className="text-base font-semibold">LM Service Card</h3>
                    <div className="flex gap-2">
                        {editable && (
                            <button
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                className="bg-white text-orange-600 rounded-full w-9 h-9 flex items-center justify-center hover:bg-orange-50 transition-colors shadow-md"
                            >
                                {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="bg-white text-orange-600 rounded-full w-9 h-9 flex items-center justify-center hover:bg-orange-50 transition-colors shadow-md"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="p-6 text-center text-gray-600">Loading...</div>
                ) : (
                    <div className="p-4">
                        <table className="w-full border-collapse">
                            <tbody>
                                <ServiceCardRow
                                    label="Service ID"
                                    value={cardData.serviceCode}
                                    isEditing={isEditing}
                                    onChange={(val) => setCardData({ ...cardData, serviceCode: val })}
                                />
                                <ServiceCardRow label="Client Name" value={cardData.clientName} />
                                <ServiceCardRow label="Service Type" value={cardData.serviceType} />
                                <ServiceCardRow
                                    label="Resources Allocated"
                                    value={cardData.resourcesAllocated.map((r, i) => (
                                        <div key={i} className="text-sm">{r.sequence}. {r.name}</div>
                                    ))}
                                />
                                {shouldShowComplementary() && (
                                    <>
                                        <ServiceCardRow
                                            label="Complimentary Manhours Allocated"
                                            value={cardData.complementaryManhours || "N/A"}
                                        />
                                        <ServiceCardRow
                                            label="Complimentary Manhours Utilized"
                                            value={cardData.complementaryManhoursUtilized || "N/A"}
                                        />
                                        <ServiceCardRow
                                            label="Complimentary Manhours Available"
                                            value={cardData.complementaryManhoursAvailable || "N/A"}
                                        />
                                    </>
                                )}

                                <ServiceCardRow
                                    label="Manhours planned for Service"
                                    value={cardData.manhoursPlanned}
                                />
                                <ServiceCardRow
                                    label="Billable Amount"
                                    value={cardData.billableAmount}
                                />
                                <ServiceCardRow
                                    label="Scope Of Work"
                                    value={cardData.scopeOfWork}
                                    isLarge={true}
                                />
                            </tbody>
                        </table>
                    </div>
                )}
            </Box>
        </Modal>
    );
}

// Bench Service Card Component
export function BenchServiceCard({ open, onClose, taskData, editable = false }) {
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [cardData, setCardData] = useState({
        serviceCode: "",
        serviceCode: "",
        clientName: "",
        serviceType: "",
        resourcesAllocated: [],
        date: "",
        time: "",
        remarks: "",
        address: "",
        requirementBrief: ""
    });

    useEffect(() => {
        if (open && taskData) {
            fetchCardData();
        }
    }, [open, taskData]);

    const fetchCardData = async () => {
        setLoading(true);
        try {
            const taskId = taskData.id;
            const taskDocRef = doc(db, "patronOtsAddRequest", taskId);
            const taskDoc = await getDoc(taskDocRef);

            if (!taskDoc.exists()) {
                triggerSnackbar("Task not found", "error");
                setLoading(false);
                return;
            }

            const taskInfo = taskDoc.data();

            // Fetch allocated candidates
            const candidateDetailsRef = collection(taskDocRef, "candidateDetails");
            const candidateSnapshot = await getDocs(candidateDetailsRef);
            const candidates = candidateSnapshot.docs.map((doc, index) => ({
                sequence: index + 1,
                name: doc.data().candidateName || "N/A",
                id: doc.data().candidateId || "N/A"
            }));

            let dateStr = "N/A";
            if (taskInfo.taskStartTime) {
                const date = taskInfo.taskStartTime.toDate
                    ? taskInfo.taskStartTime.toDate()
                    : (taskInfo.taskStartTime instanceof Date ? taskInfo.taskStartTime : new Date(taskInfo.taskStartTime));
                dateStr = date.toLocaleDateString("en-GB");
            }

            // Format time
            let timeStr = "N/A";
            if (taskInfo.taskStartTime && taskInfo.taskEndTime) {
                const startTime = taskInfo.taskStartTime.toDate
                    ? taskInfo.taskStartTime.toDate()
                    : (taskInfo.taskStartTime instanceof Date ? taskInfo.taskStartTime : new Date(taskInfo.taskStartTime));
                const endTime = taskInfo.taskEndTime.toDate
                    ? taskInfo.taskEndTime.toDate()
                    : (taskInfo.taskEndTime instanceof Date ? taskInfo.taskEndTime : new Date(taskInfo.taskEndTime));
                const startTimeStr = startTime.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' });
                const endTimeStr = endTime.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' });
                timeStr = `${startTimeStr} - ${endTimeStr}`;
            }
            // Get requirement brief
            const requirementBrief = taskInfo.taskDescription || taskInfo.ScopeOfDetail || "N/A";

            setCardData({
                serviceCode: taskInfo.serviceCode || "N/A",
                clientName: taskInfo.patronName || "N/A",
                serviceType: taskInfo.natureOfRequirement || "N/A",
                resourcesAllocated: candidates,
                date: dateStr,
                time: timeStr,
                remarks: taskInfo.serviceCardRemarks || "N/A",
                address: taskInfo.patronAddress || "N/A",
                requirementBrief: requirementBrief
            });

        } catch (error) {
            console.error("Error fetching bench service card data:", error);
            triggerSnackbar("Error loading service card", "error");
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            const taskDocRef = doc(db, "patronOtsAddRequest", taskData.id);
            await updateDoc(taskDocRef, {
                serviceCardRemarks: cardData.remarks,
                // Add other editable fields if needed
            });
            triggerSnackbar("Service card updated successfully", "success");
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving service card:", error);
            triggerSnackbar("Error saving service card", "error");
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                className="relative top-1/2 left-1/2 bg-white rounded-lg shadow-xl overflow-y-auto"
                style={{
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "380px",
                    maxHeight: "90vh"
                }}
            >
                {/* Header */}
                <div className="sticky top-0 bg-orange-600 text-white p-3 flex justify-between items-center z-10">
                    <h3 className="text-base font-semibold">Bench Service Card</h3>
                    <div className="flex gap-2">
                        {editable && (
                            <button
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                className="bg-white text-orange-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-orange-50"
                            >
                                {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="bg-white text-orange-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-orange-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="p-6 text-center text-gray-600">Loading...</div>
                ) : (
                    <div className="p-4">
                        <table className="w-full border-collapse">
                            <tbody>
                                <ServiceCardRow label="Service ID" value={cardData.serviceCode} />
                                <ServiceCardRow label="Client Name" value={cardData.clientName} />
                                <ServiceCardRow label="Service Type" value={cardData.serviceType} />
                                <ServiceCardRow
                                    label="Resources Allocated"
                                    value={cardData.resourcesAllocated.map((r, i) => (
                                        <div key={i} className="text-sm">[{r.sequence}] {r.name}</div>
                                    ))}
                                />
                                <ServiceCardRow
                                    label="Date"
                                    value={
                                        <div className="flex items-center gap-1">
                                            {cardData.date}
                                            {isEditing && <span className="text-orange-600">✏️</span>}
                                        </div>
                                    }
                                />
                                <ServiceCardRow
                                    label="Time"
                                    value={
                                        <div className="space-y-1">
                                            {cardData.time.split(', ').map((timeSlot, idx) => (
                                                <div key={idx} className="text-sm">{timeSlot}</div>
                                            ))}
                                        </div>
                                    }
                                />
                                <ServiceCardRow
                                    label="Remarks"
                                    value={cardData.remarks}
                                    isEditing={isEditing}
                                    onChange={(val) => setCardData({ ...cardData, remarks: val })}
                                />
                                <ServiceCardRow
                                    label="Address"
                                    value={cardData.address}
                                    isLarge={true}
                                />
                                <ServiceCardRow
                                    label="Requirement Brief"
                                    value={cardData.requirementBrief}
                                    isLarge={true}
                                />
                            </tbody>
                        </table>
                    </div>
                )}
            </Box>
        </Modal>
    );
}

// Helper component for service card rows
function ServiceCardRow({ label, value, isLarge = false, isEditing = false, onChange }) {
    return (
        <tr className="border-b border-orange-200">
            <td className="p-3 text-sm font-medium text-gray-700 align-top bg-orange-50" style={{ width: '45%', fontFamily: 'NeuzeitGro, sans-serif' }}>
                {label}
            </td>
            <td className="p-3 text-sm text-gray-900 align-top bg-white" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                {isEditing && onChange ? (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                    />
                ) : (
                    <div className={isLarge ? "whitespace-pre-wrap break-words" : ""}>
                        {value || "N/A"}
                    </div>
                )}
            </td>
        </tr>
    );
}