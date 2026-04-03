'use client';
import { useState, useEffect } from 'react';
import { Modal, Box } from '@mui/material';
import { X, Clock, ZoomIn } from 'lucide-react';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, Timestamp, query, where, addDoc } from 'firebase/firestore';
import Snackbar, { triggerSnackbar } from "./snakbar";

const db = getFirestore();

const getUserRefByDisplayName = async (displayName) => {
    if (!displayName) return "";
    try {
        const userCollectionRef = collection(db, "user");
        const userQuery = query(userCollectionRef, where("display_name", "==", displayName));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            return `/user/${userSnapshot.docs[0].id}`;
        }
        return "";
    } catch (error) {
        console.error("Error fetching user ref:", error);
        return "";
    }
};

export default function CloseTicketModal({ open, onClose, taskId, taskData, onSuccess }) {
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState([]);
    const [uploadsByCandidate, setUploadsByCandidate] = useState({});
    const [manualTimes, setManualTimes] = useState({});
    const [expenses, setExpenses] = useState({});
    const [saving, setSaving] = useState(false);
    const [markedCandidates, setMarkedCandidates] = useState({});

    useEffect(() => {
        if (open && taskId) {
            loadTicketData();
        }
    }, [open, taskId]);

    const loadTicketData = async () => {
        setLoading(true);
        try {
            const taskRef = doc(db, 'patronOtsAddRequest', taskId);
            const candidatesRef = collection(taskRef, 'candidateDetails');
            const candidatesSnap = await getDocs(candidatesRef);

            const candidatesList = [];
            const uploadsData = {};
            const initialManualTimes = {};

            for (const candidateDoc of candidatesSnap.docs) {
                const candidateData = {
                    id: candidateDoc.id,
                    ...candidateDoc.data()
                };
                candidatesList.push(candidateData);

                const uploadsRef = collection(candidateDoc.ref, 'uploads');
                const uploadsSnap = await getDocs(uploadsRef);

                const uploads = uploadsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const groupedByDate = {};
                uploads.forEach(upload => {
                    const date = upload.createdAt?.toDate ? upload.createdAt.toDate() : new Date(upload.createdAt);
                    const dateKey = date.toLocaleDateString('en-GB');

                    if (!groupedByDate[dateKey]) {
                        groupedByDate[dateKey] = { in: [], out: [] };
                    }

                    if (upload.type === 'in') {
                        groupedByDate[dateKey].in.push({ ...upload, timestamp: date });
                    } else if (upload.type === 'out') {
                        groupedByDate[dateKey].out.push({ ...upload, timestamp: date });
                    }
                });

                Object.keys(groupedByDate).forEach(dateKey => {
                    groupedByDate[dateKey].in.sort((a, b) => a.timestamp - b.timestamp);
                    groupedByDate[dateKey].out.sort((a, b) => a.timestamp - b.timestamp);
                });

                uploadsData[candidateDoc.id] = groupedByDate;
                // Populate taskStartTime and taskEndTime arrays from uploads
                const taskStartTimeArray = [];
                const taskEndTimeArray = [];

                // Sort all uploads by date
                const allUploads = [...uploads].sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                    return dateA - dateB;
                });

                allUploads.forEach(upload => {
                    const timestamp = upload.createdAt?.toDate ? upload.createdAt : Timestamp.fromDate(new Date(upload.createdAt));

                    if (upload.type === 'in') {
                        taskStartTimeArray.push(timestamp);
                    } else if (upload.type === 'out') {
                        taskEndTimeArray.push(timestamp);
                    }
                });

                // Update candidate document with arrays
                if (taskStartTimeArray.length > 0 || taskEndTimeArray.length > 0) {
                    await updateDoc(candidateDoc.ref, {
                        taskStartTime: taskStartTimeArray,
                        taskEndTime: taskEndTimeArray
                    });
                }

                const resourceInTimes = candidateData.resourceInTimeWithId || [];
                const resourceOutTimes = candidateData.resourceOutTimeWithId || [];

                initialManualTimes[candidateDoc.id] = {};

                const candidateExpenses = {
                    transportation: candidateData.transportationSpends || 0,
                    logistics: candidateData.logisticsSpends || 0
                };

                setExpenses(prev => ({
                    ...prev,
                    [candidateDoc.id]: candidateExpenses
                }));

                setMarkedCandidates(prev => ({
                    ...prev,
                    [candidateDoc.id]: candidateData.isCounted === true
                }));

                if (resourceInTimes.length > 0 && resourceOutTimes.length > 0) {
                    // ✅ USE SAVED TIMES: Group by date from resourceInTimeWithId/resourceOutTimeWithId
                    resourceInTimes.forEach((timestamp, idx) => {
                        const inDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                        const inDateKey = inDate.toLocaleDateString('en-GB');
                        const inTimeStr = inDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                        const inDateISO = `${inDate.getFullYear()}-${(inDate.getMonth() + 1).toString().padStart(2, '0')}-${inDate.getDate().toString().padStart(2, '0')}`;

                        // Get corresponding out time
                        const outTimestamp = resourceOutTimes[idx];
                        if (outTimestamp) {
                            const outDate = outTimestamp.toDate ? outTimestamp.toDate() : new Date(outTimestamp);
                            const outTimeStr = outDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                            const outDateISO = `${outDate.getFullYear()}-${(outDate.getMonth() + 1).toString().padStart(2, '0')}-${outDate.getDate().toString().padStart(2, '0')}`;

                            // Use IN date as the key
                            if (!initialManualTimes[candidateDoc.id][inDateKey]) {
                                initialManualTimes[candidateDoc.id][inDateKey] = {
                                    inDate: inDateISO,
                                    outDate: outDateISO,
                                    inTime: inTimeStr,
                                    outTime: outTimeStr
                                };
                            }
                        }
                    });
                } else {
                    // ✅ FALLBACK: Use upload times if no saved times exist
                    Object.keys(groupedByDate).forEach(dateKey => {
                        const dateUploads = groupedByDate[dateKey];

                        const firstInTime = dateUploads.in.length > 0
                            ? dateUploads.in[0].timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
                            : '';

                        const firstOutTime = dateUploads.out.length > 0
                            ? dateUploads.out[0].timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
                            : '';

                        initialManualTimes[candidateDoc.id][dateKey] = {
                            inDate: dateKey.split('/').reverse().join('-'), // Convert DD/MM/YYYY to YYYY-MM-DD
                            outDate: dateKey.split('/').reverse().join('-'),
                            inTime: firstInTime,
                            outTime: firstOutTime
                        };

                        if (!expenses[candidateDoc.id]) {
                            setExpenses(prev => ({
                                ...prev,
                                [candidateDoc.id]: {
                                    transportation: candidateData.transportationSpends || 0,
                                    logistics: candidateData.logisticsSpends || 0
                                }
                            }));
                        }

                    });
                }
            }

            setCandidates(candidatesList);
            setUploadsByCandidate(uploadsData);
            setManualTimes(initialManualTimes);
        } catch (error) {
            console.error('Error loading ticket data:', error);
            triggerSnackbar('Failed to load ticket data', 'error');
        }
        setLoading(false);
    };

    const handleManualTimeChange = (candidateId, dateKey, field, value) => {
        setManualTimes(prev => ({
            ...prev,
            [candidateId]: {
                ...prev[candidateId],
                [dateKey]: {
                    ...prev[candidateId][dateKey],
                    [field]: value
                }
            }
        }));
    };

    const handleExpenseChange = (candidateId, field, value) => {
        setExpenses(prev => ({
            ...prev,
            [candidateId]: {
                ...prev[candidateId],
                [field]: parseFloat(value) || 0
            }
        }));
    };

    const handleToggleCandidate = (candidateId) => {
        setMarkedCandidates(prev => ({
            ...prev,
            [candidateId]: !prev[candidateId]
        }));
    };

    const calculateHoursFromTimestamps = (inTimes, outTimes) => {
        if (!inTimes || !outTimes || inTimes.length === 0 || outTimes.length === 0) {
            return 0;
        }

        const sortedInTimes = [...inTimes]
            .map(t => ({ timestamp: t.toDate ? t.toDate() : new Date(t), original: t }))
            .sort((a, b) => a.timestamp - b.timestamp);

        const sortedOutTimes = [...outTimes]
            .map(t => ({ timestamp: t.toDate ? t.toDate() : new Date(t), original: t }))
            .sort((a, b) => a.timestamp - b.timestamp);

        const dateGroups = {};

        sortedInTimes.forEach(inTime => {
            const dateKey = inTime.timestamp.toLocaleDateString('en-GB');
            if (!dateGroups[dateKey]) {
                dateGroups[dateKey] = { in: [], out: [] };
            }
            dateGroups[dateKey].in.push(inTime.timestamp);
        });

        sortedOutTimes.forEach(outTime => {
            const dateKey = outTime.timestamp.toLocaleDateString('en-GB');
            if (!dateGroups[dateKey]) {
                dateGroups[dateKey] = { in: [], out: [] };
            }
            dateGroups[dateKey].out.push(outTime.timestamp);
        });

        let totalHours = 0;

        const pairs = Math.min(sortedInTimes.length, sortedOutTimes.length);

        for (let i = 0; i < pairs; i++) {
            const inTime = sortedInTimes[i].timestamp;
            const outTime = sortedOutTimes[i].timestamp;

            if (outTime > inTime) {
                const durationMs = outTime - inTime;
                const hours = durationMs / (1000 * 60 * 60);
                totalHours += hours;
            }
        }

        return parseFloat(totalHours.toFixed(2));
    };

    const resolveRole = (candidate, task) => {
        const nature = task?.natureOfRequirement?.trim();

        // PRIMARY: pricing must be driven by natureOfRequirement
        if (nature) {
            switch (nature) {
                case "Deep cleaning and Organization":
                    return " Deep cleaning and Organization";
                case "Deep cleaning":
                    return "Deep Cleaning";
                case "Wardrobe/Home organisation":
                    return "Wardrobe/Home organisation";
                case "On-demand MST":
                    return "MST";
                case "On-demand Home Cook":
                    return "On-demand Home Cook";

                case "On-demand Driver":
                    return "On-demand Driver";

                case "On-demand Housekeeper":
                    return "On-demand Housekeeper";

                case "On-demand Babysitter":
                    return "On-demand Babysitter";

                case "Errand Runners":
                    return "Errand Runners";

                case "On-demand Butler":
                    return "On-demand Butler";

                case "On-demand Chef":
                    return "On-demand Chef";


                case "On-demand Gardener":
                case "Gardener":
                    return "On-demand Gardener";
            }
        }
    };

    const calculatePricingForTask = async (totalHours, role, cxType, lateNightHours = 0, baseDeduction = 0) => {
        try {
            const pricingSnapshot = await getDocs(collection(db, "pricingSheet"));
            const pricingData = pricingSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const pricingItem = pricingData.find(item =>
                item.role === role && item.cxType === cxType
            );

            if (!pricingItem) {
                console.error(`No pricing found for role: ${role}, cxType: ${cxType}`);
                return 0;
            }

            let total = 0;
            const usedHours = totalHours;

            if (usedHours > 10) {
                total = pricingItem.perDayPricing + (pricingItem.perDayPricing * (usedHours - 10) / 10);
            } else if (usedHours > 4) {
                if (cxType === 'B2C') {
                    if (pricingItem.stepDownPrice && pricingItem.stepDownPrice > 0) {
                        total = ((usedHours - 4) * pricingItem.stepDownPrice) + (4 * pricingItem.perHourPrice);
                    } else {
                        const fourHourPackage = pricingItem.fourHourPackage || 0;
                        const perHourFromPackage = fourHourPackage / 4;
                        total = fourHourPackage + ((usedHours - 4) * perHourFromPackage);
                    }
                } else {
                    total = pricingItem.perDayPricing + (pricingItem.perDayPricing * (usedHours - 4) / 4);
                }
            } else {
                total = usedHours * pricingItem.perHourPrice;
            }

            total = Math.min(total, pricingItem.perDayPricing);

            if (usedHours >= 20 && pricingItem.fullDayPricing && pricingItem.fullDayPricing > 0) {
                total = Math.min(total, pricingItem.fullDayPricing);
            }

            if (lateNightHours > 0 && pricingItem.nightSurcharge) {
                total += lateNightHours * pricingItem.nightSurcharge;
            }

            total -= baseDeduction;

            return parseFloat(Math.max(0, total).toFixed(2));

        } catch (error) {
            console.error("Error calculating pricing:", error);
            return 0;
        }
    };

    // Replace your entire calculateAndUpdatePricing function with this:

    const calculateAndUpdatePricing = async (patronDocId) => {
        try {
            const patronDocRef = doc(db, "patronOtsAddRequest", patronDocId);
            const patronDocSnap = await getDoc(patronDocRef);

            if (!patronDocSnap.exists()) {
                console.error("Patron document not found");
                return;
            }

            const patronData = patronDocSnap.data();
            const { isD2C, natureOfRequirement, patronRef, primaryRole } = patronData;

            const candidateDetailsRef = collection(patronDocRef, "candidateDetails");
            const candidateSnapshot = await getDocs(candidateDetailsRef);

            if (candidateSnapshot.empty) {
                console.log("No candidate details found");
                return;
            }

            let taskTotalHours = 0;
            const candidateHoursUpdates = [];

            // ✅ CHANGE 1: Store candidate data for later pricing calculation
            for (const candidateDoc of candidateSnapshot.docs) {
                const candidateData = candidateDoc.data();
                const { resourceInTimeWithId, resourceOutTimeWithId } = candidateData;

                if (resourceInTimeWithId && resourceOutTimeWithId &&
                    resourceInTimeWithId.length > 0 && resourceOutTimeWithId.length > 0) {

                    const candidateHours = calculateHoursFromTimestamps(
                        resourceInTimeWithId,
                        resourceOutTimeWithId
                    );

                    taskTotalHours += candidateHours;

                    candidateHoursUpdates.push({
                        docRef: doc(db, "patronOtsAddRequest", patronDocId, "candidateDetails", candidateDoc.id),
                        totalHoursServe: candidateHours,
                        candidateData: candidateData, // Store for role resolution
                    });
                }
            }

            // Update task total hours
            await updateDoc(patronDocRef, {
                totalHours: taskTotalHours,
            });

            const cxType = isD2C ? 'D2C' : 'Non-D2C';
            let shouldCalculatePricing = false;
            let remainingHoursToCharge = taskTotalHours;
            let shouldCheckComplementary = false; // ✅ CHANGE 2: Add flag

            // Check complementary hours eligibility
            if (isD2C && patronRef) {
                const patronDetailsId = patronRef.split('/').pop();
                const patronDetailsRef = doc(db, "addPatronDetails", patronDetailsId);
                const patronDetailsSnap = await getDoc(patronDetailsRef);

                if (patronDetailsSnap.exists()) {
                    const patronDetails = patronDetailsSnap.data();
                    const isComplementary = patronDetails.isComplementary === true;

                    if (isComplementary) {
                        shouldCheckComplementary = true; // ✅ CHANGE 3: Set flag

                        if (natureOfRequirement === "Deep cleaning") {
                            const hoursLeft = patronDetails.patronDeepCleaningHoursLeft || 0;

                            if (hoursLeft >= taskTotalHours) {
                                await updateDoc(patronDetailsRef, {
                                    patronDeepCleaningHoursLeft: hoursLeft - taskTotalHours
                                });
                                remainingHoursToCharge = 0;
                            } else {
                                if (hoursLeft > 0) {
                                    await updateDoc(patronDetailsRef, {
                                        patronDeepCleaningHoursLeft: 0
                                    });
                                }
                                remainingHoursToCharge = taskTotalHours - hoursLeft;
                                shouldCalculatePricing = true;
                            }
                        } else if (natureOfRequirement === "Wardrobe/Home organisation") {
                            const hoursLeft = patronDetails.patronWardrobeHoursLeft || 0;

                            if (hoursLeft >= taskTotalHours) {
                                await updateDoc(patronDetailsRef, {
                                    patronWardrobeHoursLeft: hoursLeft - taskTotalHours
                                });
                                remainingHoursToCharge = 0;
                            } else {
                                if (hoursLeft > 0) {
                                    await updateDoc(patronDetailsRef, {
                                        patronWardrobeHoursLeft: 0
                                    });
                                }
                                remainingHoursToCharge = taskTotalHours - hoursLeft;
                                shouldCalculatePricing = true;
                            }
                        } else if (natureOfRequirement === "On-demand MST") {
                            const hoursLeft = patronDetails.patronMstHoursLeft || 0;

                            if (hoursLeft >= taskTotalHours) {
                                await updateDoc(patronDetailsRef, {
                                    patronMstHoursLeft: hoursLeft - taskTotalHours
                                });
                                remainingHoursToCharge = 0;
                            } else {
                                if (hoursLeft > 0) {
                                    await updateDoc(patronDetailsRef, {
                                        patronMstHoursLeft: 0
                                    });
                                }
                                remainingHoursToCharge = taskTotalHours - hoursLeft;
                                shouldCalculatePricing = true;
                            }
                        } else {
                            shouldCalculatePricing = true;
                        }
                    } else {
                        shouldCalculatePricing = true;
                    }
                } else {
                    shouldCalculatePricing = true;
                }
            } else {
                shouldCalculatePricing = true;
            }

            // ✅ CHANGE 4: Calculate per-candidate pricing
            let totalPreTaxAmount = 0;
            let tempRemainingHours = remainingHoursToCharge;

            for (const candidateUpdate of candidateHoursUpdates) {
                const candidateHours = candidateUpdate.totalHoursServe;
                let candidateChargeableHours = 0;
                let candidatePreTaxAmount = 0;

                // Determine chargeable hours for this candidate
                if (shouldCheckComplementary && remainingHoursToCharge < taskTotalHours) {
                    // D2C complementary customer - distribute chargeable hours proportionally
                    if (tempRemainingHours > 0) {
                        candidateChargeableHours = Math.min(candidateHours, tempRemainingHours);
                        tempRemainingHours -= candidateChargeableHours;
                    } else {
                        candidateChargeableHours = 0;
                    }
                } else {
                    // Non-complementary or B2B - charge all hours
                    candidateChargeableHours = candidateHours;
                }

                // Calculate pricing for chargeable hours
                if (candidateChargeableHours > 0) {
                    const resolvedRole = resolveRole(
                        { primaryRole: candidateUpdate.candidateData.primaryRole },
                        patronData
                    );

                    candidatePreTaxAmount = await calculatePricingForTask(
                        candidateChargeableHours,
                        resolvedRole,
                        cxType,
                        0,
                        0
                    );
                }

                // ✅ ADD: Get expenses from candidate data
                const candidateRef = candidateUpdate.docRef;
                const candidateSnap = await getDoc(candidateRef);
                const candidateData = candidateSnap.data();

                const transportationSpends = candidateData.transportationSpends || 0;
                const logisticsSpends = candidateData.logisticsSpends || 0;

                // ✅ NEW FIELD: totalPreAmount = preTaxAmount + expenses
                const totalPreAmount = parseFloat((
                    candidatePreTaxAmount + transportationSpends + logisticsSpends
                ).toFixed(2));

                // ✅ CHANGED: Calculate tax on totalPreAmount instead of preTaxAmount
                const candidateTaxAmount = parseFloat((totalPreAmount * 0.18).toFixed(2));
                const candidateBillableAmount = parseFloat((totalPreAmount + candidateTaxAmount).toFixed(2));

                // Update individual candidate document
                await updateDoc(candidateUpdate.docRef, {
                    totalHoursServe: candidateHours,
                    chargeableHours: candidateChargeableHours,
                    preTaxAmount: candidatePreTaxAmount, // Keep original for reference
                    totalPreAmount: totalPreAmount, // ✅ NEW FIELD
                    taxAmount: candidateTaxAmount,
                    billableAmount: candidateBillableAmount
                });

                totalPreTaxAmount += totalPreAmount; // ✅ CHANGED: Sum totalPreAmount instead
            }

            // The rest remains the same but uses totalPreTaxAmount correctly
            const totalTaxAmount = parseFloat((totalPreTaxAmount * 0.18).toFixed(2));
            const totalBillableAmount = parseFloat((totalPreTaxAmount + totalTaxAmount).toFixed(2));


            // Update main task document
            await updateDoc(patronDocRef, {
                preTaxAmount: totalPreTaxAmount,
                taxAmount: totalTaxAmount,
                billableAmount: totalBillableAmount
            });

            console.log("Pricing calculated successfully:", {
                totalHours: taskTotalHours,
                remainingHoursCharged: remainingHoursToCharge,
                totalPreTaxAmount,
                totalTaxAmount,
                totalBillableAmount
            });

        } catch (error) {
            console.error("Error in calculateAndUpdatePricing:", error);
            throw error;
        }
    };

    const handleSave = async () => {
        // Validation: Check if there are candidates
        if (candidates.length === 0) {
            triggerSnackbar('No candidates found. Cannot close ticket.', 'error');
            return;
        }

        const hasMarkedCandidate = Object.values(markedCandidates).some(marked => marked === true);
        if (!hasMarkedCandidate) {
            triggerSnackbar('Please select at least one candidate to include in Cash Memo', 'warning');
            return;
        }

        // Validation: Check if at least one time entry exists
        let hasValidEntry = false;
        for (const candidate of candidates) {
            const candidateTimes = manualTimes[candidate.id];
            if (candidateTimes) {
                for (const dateKey in candidateTimes) {
                    const times = candidateTimes[dateKey];
                    if (times.inTime && times.outTime) {
                        hasValidEntry = true;
                        break;
                    }
                }
            }
            if (hasValidEntry) break;
        }

        if (!hasValidEntry) {
            triggerSnackbar('Please enter at least one IN and OUT time to close the ticket.', 'warning');
            return;
        }
        setSaving(true);
        try {
            const taskRef = doc(db, 'patronOtsAddRequest', taskId);

            for (const candidate of candidates) {
                const candidateTimes = manualTimes[candidate.id];
                if (!candidateTimes) continue;

                for (const [dateKey, times] of Object.entries(candidateTimes)) {
                    if (times.inTime && times.outTime) {
                        const inDate = times.inDate || dateKey.split('/').reverse().join('-');
                        const outDate = times.outDate || dateKey.split('/').reverse().join('-');

                        const inDateTime = new Date(`${inDate}T${times.inTime}`);
                        const outDateTime = new Date(`${outDate}T${times.outTime}`);

                        // ✅ Check if dates are valid
                        if (isNaN(inDateTime.getTime())) {
                            triggerSnackbar(`Invalid IN date/time for ${candidate.candidateName} on ${dateKey}`, 'error');
                            setSaving(false);
                            return; // Stop entire save
                        }

                        if (isNaN(outDateTime.getTime())) {
                            triggerSnackbar(`Invalid OUT date/time for ${candidate.candidateName} on ${dateKey}`, 'error');
                            setSaving(false);
                            return; // Stop entire save
                        }

                        // ✅ Check if OUT is after IN
                        if (outDateTime <= inDateTime) {
                            triggerSnackbar(
                                `Invalid time range for ${candidate.candidateName} on ${dateKey}: OUT time (${outDate} ${times.outTime}) must be after IN time (${inDate} ${times.inTime})`,
                                'error'
                            );
                            setSaving(false);
                            return; // Stop entire save
                        }
                    }
                }
            }

            for (const candidate of candidates) {
                const candidateRef = doc(taskRef, 'candidateDetails', candidate.id);
                const candidateTimes = manualTimes[candidate.id];

                if (!candidateTimes) continue;

                const resourceInTimeWithId = [];
                const resourceOutTimeWithId = [];
                Object.entries(candidateTimes).forEach(([dateKey, times]) => {
                    if (times.inTime && times.outTime) {
                        const inDate = times.inDate || dateKey.split('/').reverse().join('-');
                        const outDate = times.outDate || dateKey.split('/').reverse().join('-');

                        const inDateTime = new Date(`${inDate}T${times.inTime}`);
                        const outDateTime = new Date(`${outDate}T${times.outTime}`);

                        resourceInTimeWithId.push(Timestamp.fromDate(inDateTime));
                        resourceOutTimeWithId.push(Timestamp.fromDate(outDateTime));
                    }
                });

                // Only update if we have valid time pairs
                if (resourceInTimeWithId.length > 0 && resourceOutTimeWithId.length > 0) {
                    await updateDoc(candidateRef, {
                        resourceInTimeWithId,
                        resourceOutTimeWithId,
                        candidateStatusTime: Timestamp.now()
                    });
                }

                if (resourceInTimeWithId.length === 0 || resourceOutTimeWithId.length === 0) {
                    console.warn(`No valid time entries for candidate ${candidate.candidateName}`);
                    continue; // Skip updating this candidate
                }

                await updateDoc(candidateRef, {
                    resourceInTimeWithId,
                    resourceOutTimeWithId,
                    candidateStatus: 'Service Closed',
                    candidateStatusTime: Timestamp.now(),
                    transportationSpends: expenses[candidate.id]?.transportation || 0,
                    logisticsSpends: expenses[candidate.id]?.logistics || 0,
                    isCounted: markedCandidates[candidate.id] === true
                });
            }

            await updateDoc(taskRef, {
                status: 'Service Completed',
                lastComment: 'Ticket has been closed successfully',
                taskStatusCategory: "Completed",
                ticketClosedTime: Timestamp.now()
            });

            try {
                const associateRef = `/patronOtsAddRequest/${taskId}`;
                const createTaskCollectionRef = collection(db, 'createTaskCollection');
                const taskQuery = query(createTaskCollectionRef, where('associateRef', '==', associateRef));
                const taskSnapshot = await getDocs(taskQuery);

                if (!taskSnapshot.empty) {
                    const taskDoc = taskSnapshot.docs[0];
                    const taskDocRef = taskDoc.ref;
                    const taskData = taskDoc.data();

                    // Create commentsThread subcollection
                    const commentsThreadRef = collection(taskDocRef, 'commentsThread');
                    const currentTime = Timestamp.now();

                    // const ownerRef = await getUserRefByDisplayName(lmName);
                    const commentData = {
                        comment_Text: `The ticket has been closed successfully`,
                        comment_owner_img: '',
                        // comment_owner_refcomment_owner_ref:'',
                        timeStamp: currentTime,
                        // comment_owner_name: taskData.assignedLMName || '',
                        taskRef: `/createTaskCollection/${taskDoc.id}`,
                        commentDate: currentTime,
                        taskStatusCategory: 'Completed', // or 'Closed' based on your requirement
                        isUpdate: true,
                    };

                    await addDoc(commentsThreadRef, commentData);

                    // Update main task document if needed

                    await updateDoc(taskDocRef, {
                        // isUpdate: true,
                        taskStatusCategory: 'Completed',
                        lastComment: 'Ticket has been closed successfully',
                        taskInProcessDate: currentTime,
                        taskCompletedDate: currentTime,
                        ticketClosedTime: Timestamp.now()
                    });

                }
            } catch (error) {
                console.error('Error creating commentsThread:', error);
            }

            await calculateAndUpdatePricing(taskId);

            triggerSnackbar('Ticket closed successfully!', 'success');
            const updatedTaskDoc = await getDoc(taskRef);
            onSuccess?.(updatedTaskDoc.data()); // Pass the updated data
            onClose();
        } catch (error) {
            console.error('Error saving ticket:', error);
            triggerSnackbar('Failed to close ticket: ' + error.message, 'error');
        }
        setSaving(false);
    };

    if (!open) return null;

    return (
        <>
            <Modal open={open} onClose={onClose}>
                <Box
                    className="relative top-1/2 left-1/2 bg-white rounded-xl shadow-2xl overflow-hidden"
                    style={{
                        transform: "translate(-50%, -50%)",
                        width: "95%",
                        maxWidth: "900px",
                        maxHeight: "90vh",
                        fontFamily: 'NeuzeitGro, sans-serif',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
                        <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                            Close Ticket Verification
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-gray-600 text-base" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                    Loading attendance data...
                                </div>
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 text-base" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                No candidates found for this task
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {candidates.map((candidate) => {
                                    const uploads = uploadsByCandidate[candidate.id] || {};
                                    const dates = Object.keys(uploads).sort((a, b) => {
                                        const [dayA, monthA, yearA] = a.split('/');
                                        const [dayB, monthB, yearB] = b.split('/');
                                        return new Date(`${yearA}-${monthA}-${dayA}`) - new Date(`${yearB}-${monthB}-${dayB}`);
                                    });

                                    return (
                                        <div key={candidate.id} className="border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
                                            {/* Candidate Header */}
                                            <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
                                                <h4 className="font-bold text-white text-base" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                    {candidate.candidateName} ({candidate.candidateId})
                                                </h4>

                                                {/* ✅ ADD CHECKBOX */}
                                                <div className="flex items-center gap-3 bg-white/10 px-3 py-1.5 rounded-lg">
                                                    <span className="text-white text-xs font-medium" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                        Include in Cash Memo
                                                    </span>
                                                    <button
                                                        onClick={() => handleToggleCandidate(candidate.id)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1 ${markedCandidates[candidate.id]
                                                            ? 'bg-green-500 hover:bg-green-600'
                                                            : 'bg-gray-400/80 hover:bg-gray-500'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${markedCandidates[candidate.id] ? 'translate-x-5' : 'translate-x-0.5'
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Dates */}
                                            <div className="p-5 space-y-5">
                                                {dates.length === 0 ? (
                                                    <div className="text-center py-6 text-gray-500 text-sm" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                        No attendance records found
                                                    </div>
                                                ) : (
                                                    dates.map((dateKey) => {
                                                        const dateUploads = uploads[dateKey];
                                                        return (
                                                            <div key={dateKey} className="border border-gray-200 rounded-lg p-5 bg-gradient-to-br from-white to-gray-50">
                                                                {/* Date Header */}
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <Clock className="w-5 h-5 text-orange-600" />
                                                                    <span className="font-bold text-gray-900 text-base" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                        {dateKey}
                                                                    </span>
                                                                </div>

                                                                {/* Uploads Display */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                                    {/* IN Uploads */}
                                                                    <div className="space-y-2">
                                                                        <div className="text-xs font-semibold text-gray-600 uppercase" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                            Check-In Times
                                                                        </div>
                                                                        {dateUploads.in.length === 0 ? (
                                                                            <div className="text-sm text-gray-400" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                                No check-in recorded
                                                                            </div>
                                                                        ) : (
                                                                            dateUploads.in.map((upload, idx) => (
                                                                                <div key={idx} className="flex items-start gap-3 p-2 bg-green-50 rounded border border-green-200">
                                                                                    {upload.photoUrl && (
                                                                                        <img
                                                                                            src={upload.photoUrl}
                                                                                            alt="Check-in"
                                                                                            className="w-16 h-16 object-cover rounded border border-green-300"
                                                                                        />
                                                                                    )}
                                                                                    <div className="flex-1">
                                                                                        <div className="text-xs font-semibold text-green-800" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                                            IN
                                                                                        </div>
                                                                                        <div className="text-sm text-gray-700" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                                            {upload.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>

                                                                    {/* OUT Uploads */}
                                                                    <div className="space-y-2">
                                                                        <div className="text-xs font-semibold text-gray-600 uppercase" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                            Check-Out Times
                                                                        </div>
                                                                        {dateUploads.out.length === 0 ? (
                                                                            <div className="text-sm text-gray-400" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                                No check-out recorded
                                                                            </div>
                                                                        ) : (
                                                                            dateUploads.out.map((upload, idx) => (
                                                                                <div key={idx} className="flex items-start gap-3 p-2 bg-red-50 rounded border border-red-200">
                                                                                    {upload.photoUrl && (
                                                                                        <img
                                                                                            src={upload.photoUrl}
                                                                                            alt="Check-out"
                                                                                            className="w-16 h-16 object-cover rounded border border-red-300"
                                                                                        />
                                                                                    )}
                                                                                    <div className="flex-1">
                                                                                        <div className="text-xs font-semibold text-red-800" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                                            OUT
                                                                                        </div>
                                                                                        <div className="text-sm text-gray-700" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                                            {upload.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Manual Time Entry */}
                                                                <div className="border-t-2 border-orange-200 pt-4 mt-4">
                                                                    <div className="text-xs font-bold text-orange-700 uppercase mb-3 tracking-wide">
                                                                        Confirm Final Times
                                                                    </div>

                                                                    {/* ✅ ADD: Date inputs for multi-day shifts */}
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                                IN Date
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                value={manualTimes[candidate.id]?.[dateKey]?.inDate || dateKey.split('/').reverse().join('-')}
                                                                                onChange={(e) => handleManualTimeChange(candidate.id, dateKey, 'inDate', e.target.value)}
                                                                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                                OUT Date
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                value={manualTimes[candidate.id]?.[dateKey]?.outDate || dateKey.split('/').reverse().join('-')}
                                                                                onChange={(e) => handleManualTimeChange(candidate.id, dateKey, 'outDate', e.target.value)}
                                                                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                                Final IN Time
                                                                            </label>
                                                                            <input
                                                                                type="time"
                                                                                value={manualTimes[candidate.id]?.[dateKey]?.inTime || ''}
                                                                                onChange={(e) => handleManualTimeChange(candidate.id, dateKey, 'inTime', e.target.value)}
                                                                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                                Final OUT Time
                                                                            </label>
                                                                            <input
                                                                                type="time"
                                                                                value={manualTimes[candidate.id]?.[dateKey]?.outTime || ''}
                                                                                onChange={(e) => handleManualTimeChange(candidate.id, dateKey, 'outTime', e.target.value)}
                                                                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-4 border-t pt-4">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                                Transportation Spends (₹)
                                                                            </label>
                                                                            <input
                                                                                type="text"  // ✅ Changed to text
                                                                                inputMode="decimal"  // ✅ Shows numeric keyboard on mobile
                                                                                pattern="[0-9]*\.?[0-9]*"  // ✅ Allows only numbers and decimal
                                                                                value={expenses[candidate.id]?.transportation || ''}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value;
                                                                                    // ✅ Allow only numbers and one decimal point
                                                                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                                                        handleExpenseChange(candidate.id, 'transportation', value);
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    // ✅ Format on blur (when user leaves field)
                                                                                    const value = parseFloat(e.target.value) || 0;
                                                                                    handleExpenseChange(candidate.id, 'transportation', value.toString());
                                                                                }}
                                                                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                                Logistic Spends (₹)
                                                                            </label>
                                                                            <input
                                                                                type="text"  // ✅ Changed to text
                                                                                inputMode="decimal"  // ✅ Shows numeric keyboard on mobile
                                                                                pattern="[0-9]*\.?[0-9]*"  // ✅ Allows only numbers and decimal
                                                                                value={expenses[candidate.id]?.logistics || ''}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value;
                                                                                    // ✅ Allow only numbers and one decimal point
                                                                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                                                        handleExpenseChange(candidate.id, 'logistics', value);
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    // ✅ Format on blur (when user leaves field)
                                                                                    const value = parseFloat(e.target.value) || 0;
                                                                                    handleExpenseChange(candidate.id, 'logistics', value.toString());
                                                                                }}
                                                                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-[#EF5F24] text-white rounded-lg text-sm font-medium hover:bg-[#d54d1a] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                            >
                                {saving ? 'Saving...' : 'Close Ticket & Calculate Price'}
                            </button>
                        </div>
                        <Snackbar />
                    </div>
                </Box>
            </Modal>
        </>
    );
}