'use client';
import React, { useState, useEffect } from 'react';
import { Modal, Box } from '@mui/material';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { X, Calendar, Clock, User, Filter, Search, ChevronDown } from 'lucide-react';

const db = getFirestore();

// Helper function to parse time from Firestore Timestamp string or format
const parseTimeFromTimestamp = (timeValue) => {
    if (!timeValue) return '09:00';

    // If it's already in HH:MM format
    if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}/.test(timeValue)) {
        const match = timeValue.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
            const hours = match[1].padStart(2, '0');
            const minutes = match[2];
            return `${hours}:${minutes}`;
        }
    }

    // If it's a Firestore Timestamp or Date object
    try {
        const date = timeValue.toDate ? timeValue.toDate() : new Date(timeValue);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        // If it's a string like "06 October 2025 at 12:56:52 UTC+5:30"
        if (typeof timeValue === 'string') {
            const timeMatch = timeValue.match(/at (\d{1,2}):(\d{2}):(\d{2})/);
            if (timeMatch) {
                const hours = timeMatch[1].padStart(2, '0');
                const minutes = timeMatch[2];
                return `${hours}:${minutes}`;
            }
        }
    }

    return '09:00';
};

// Confirmation Dialog Component
function RelocationConfirmDialog({ open, onClose, onConfirm, candidateInfo, defaultDate, defaultTime, scheduleData, taskData }) {
    const [selectedDate, setSelectedDate] = useState(defaultDate);
    const [selectedEndDate, setSelectedEndDate] = useState(defaultDate);
    const [startTime, setStartTime] = useState(defaultTime || '09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [remarks, setRemarks] = useState('');
    const [timeError, setTimeError] = useState('');
    const [selectedResourceType, setSelectedResourceType] = useState('');
    const [availableResourceTypes, setAvailableResourceTypes] = useState([]);
    const [purposeText, setPurposeText] = useState('');

    useEffect(() => {
        if (open) {
            setSelectedDate(defaultDate);
            setSelectedEndDate(defaultDate);
            // ✅ ADD THIS: Set default times from taskData
            if (taskData) {
                if (taskData.taskStartTime) {
                    const startTimeValue = Array.isArray(taskData.taskStartTime)
                        ? taskData.taskStartTime[0]
                        : taskData.taskStartTime;
                    const parsedStartTime = parseTimeFromTimestamp(startTimeValue);
                    setStartTime(parsedStartTime);
                }

                if (taskData.taskEndTime) {
                    const endTimeValue = Array.isArray(taskData.taskEndTime)
                        ? taskData.taskEndTime[0]
                        : taskData.taskEndTime;
                    const parsedEndTime = parseTimeFromTimestamp(endTimeValue);
                    setEndTime(parsedEndTime);
                }
            } else {
                setStartTime(defaultTime || '09:00');
                setEndTime('17:00');
            }

            setTimeError('');
        }
    }, [open, defaultDate, defaultTime, taskData]);

    useEffect(() => {
        const loadResourceTypes = async () => {
            if (!open) return;

            try {
                const snapshot = await getDocs(collection(db, 'patronOTS-NatureofRequirement'));
                const uniqueRoles = new Set();

                snapshot.forEach(doc => {
                    const role = doc.data()?.natureOfRequirement;
                    if (role) uniqueRoles.add(role);
                });

                // Add "Supervisor" as an option
                uniqueRoles.add('HK Supervisor');

                const types = Array.from(uniqueRoles).map(role => ({
                    label: role,
                    value: role
                }));

                setAvailableResourceTypes(types);
            } catch (error) {
                console.error('Error loading resource types:', error);
                setAvailableResourceTypes([]);
            }
        };

        loadResourceTypes();
    }, [open]);

    // Validate if candidate is free during ENTIRE selected time range
    const validateTimeAvailability = () => {
        if (!candidateInfo || !scheduleData || !scheduleData[candidateInfo.name]) {
            return true;
        }

        const candidateSchedule = scheduleData[candidateInfo.name];
        const startDateTime = new Date(`${selectedDate}T${startTime}`);
        const endDateTime = new Date(`${selectedEndDate}T${endTime}`);

        // ✅ If multi-day, we need to check schedule for BOTH days
        // For now, only validate if same-day task
        if (selectedDate !== selectedEndDate) {
            // Multi-day task - simplified validation or fetch additional schedule data
            return true; // Or implement cross-day validation
        }

        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;

        // Check every hour slot in the ENTIRE range
        for (let hour = startHour; hour <= endHour; hour++) {
            const timeKey = `${hour.toString().padStart(2, '0')}:00`;
            const slotData = candidateSchedule[timeKey];

            if (slotData?.status === 'busy') {
                // Check if busy slot overlaps with our selected time
                for (const task of slotData.tasks) {
                    const [taskStartHour, taskStartMin] = task.startTime.split(':').map(Number);
                    const [taskEndHour, taskEndMin] = task.endTime.split(':').map(Number);

                    const taskStartMinutes = taskStartHour * 60 + taskStartMin;
                    const taskEndMinutes = taskEndHour * 60 + taskEndMin;

                    // Check if there's any overlap
                    if (!(endTotalMinutes <= taskStartMinutes || startTotalMinutes >= taskEndMinutes)) {
                        return false;
                    }
                }
            }
        }

        return true;
    };

    const handleConfirm = () => {
        // ✅ NEW: Compare datetime, not just time
        const startDateTime = new Date(`${selectedDate}T${startTime}`);
        const endDateTime = new Date(`${selectedEndDate}T${endTime}`);

        // Allow same day only if end > start, OR allow next day scenarios
        if (startDateTime >= endDateTime) {
            setTimeError('End time must be after start time');
            return;
        }

        if (!validateTimeAvailability()) {
            setTimeError('Candidate is busy during the selected time range. Please choose a different time.');
            return;
        }

        if (!selectedResourceType) {
            setTimeError('Please select the type of resource');
            return;
        }

        onConfirm(candidateInfo.id, remarks, {
            date: selectedDate,
            endDate: selectedEndDate,
            startTime,
            endTime,
            candidateRole: selectedResourceType,
            purpose: selectedResourceType === 'HK Supervisor' ? purposeText : '',
            resourceType: selectedResourceType
        });
        setRemarks('');
        setTimeError('');
        onClose();

        setRemarks('');
        setSelectedResourceType('');  // ADD THIS
        setTimeError('');
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                className="relative top-1/2 left-1/2 bg-white rounded-lg shadow-xl p-6"
                style={{
                    transform: 'translate(-50%, -50%)',
                    width: '90%',
                    maxWidth: '500px',
                    fontFamily: 'NeuzeitGro, sans-serif'
                }}

            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-blue-900">
                        Candidate Allocation Form
                    </h3>
                    <button
                        onClick={onClose}
                        className="top-3 right-3 text-gray-500 hover:text-red-600 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div
                    className="space-y-4 overflow-y-auto pr-1"
                    style={{
                        maxHeight: '70vh',
                    }}
                >
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-semibold text-blue-900">Candidate: {candidateInfo?.name}</p>
                        <p className="text-sm text-blue-700">ID: {candidateInfo?.id}</p>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Task Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">End Date (Optional - if different from start)</label>
                        <input
                            type="date"
                            value={selectedEndDate}
                            onChange={(e) => setSelectedEndDate(e.target.value)}
                            min={selectedDate}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Start Time</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => {
                                    setStartTime(e.target.value);
                                    setTimeError('');
                                }}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">End Time</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => {
                                    setEndTime(e.target.value);
                                    setTimeError('');
                                }}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {timeError && (
                        <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm">
                            {timeError}
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Type of Resource</label>
                        <select
                            value={selectedResourceType}
                            onChange={(e) => {
                                setSelectedResourceType(e.target.value);
                                if (e.target.value !== 'HK Supervisor') {
                                    setPurposeText(''); // Clear purpose if not Supervisor
                                }
                            }}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Resource Type</option>
                            {availableResourceTypes.map((type, idx) => (
                                <option key={idx} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Purpose field - only show when Supervisor is selected */}
                    {selectedResourceType === 'HK Supervisor' && (
                        <div className="mt-3">
                            <label className="block text-gray-700 font-medium mb-2">Purpose</label>
                            <input
                                type="text"
                                value={purposeText}
                                onChange={(e) => setPurposeText(e.target.value)}
                                placeholder="Enter purpose (e.g., Property Visit, Supervision)"
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-700 font-medium mb-2">Remarks</label>
                        <textarea
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder="Enter your remarks..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
                    >
                        Confirm
                    </button>
                </div>
            </Box>
        </Modal>
    );
}

export default function CandidateScheduleModal({ open, onClose, onConfirm, selectedDate, primaryRole = null, taskData = null }) {
    const [allCandidateNames, setAllCandidateNames] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [scheduleData, setScheduleData] = useState({});
    const [loading, setLoading] = useState(false);

    const [selectedCandidateNames, setSelectedCandidateNames] = useState([]);
    const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState({ start: '07:00', end: '24:00' });
    const [selectedDay, setSelectedDay] = useState(selectedDate || new Date().toISOString().split('T')[0]);
    const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedCandidateInfo, setSelectedCandidateInfo] = useState(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

    const timeSlots = [];
    for (let hour = 7; hour < 24; hour++) {
        timeSlots.push({
            start: `${hour.toString().padStart(2, '0')}:00`,
            end: `${(hour + 1).toString().padStart(2, '0')}:59`,
            label: `${hour}:00 - ${hour}:59`
        });
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showCandidateDropdown && !event.target.closest('.candidate-dropdown-container')) {
                setShowCandidateDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCandidateDropdown]);

    // Load all unique candidate names - NO CANDIDATES SELECTED BY DEFAULT
    // Load all unique candidate names filtered by profession matching primaryRole
    useEffect(() => {
        const fetchCandidateNames = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'patronYcwHelps'));
                const nameSet = new Set();
                const candidateList = [];

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const name = data.name;
                    const id = data.id;
                    const profession = data.profession || '';
                    const primarySkill = data.primarySkill || '';
                    const secondarySkill = data.secondarySkill || '';
                    const tertiarySkill = data.tertiarySkill || [];
                    const isRemoved = data.isRemoved === true;

                    // ✅ Match primaryRole with profession, primarySkill, secondarySkill, or tertiarySkill
                    // const roleMatch =
                    //     profession === primaryRole ||
                    //     primarySkill === primaryRole ||
                    //     secondarySkill === primaryRole ||
                    //     (Array.isArray(tertiarySkill) && tertiarySkill.includes(primaryRole));

                    let skillMatches = false;

                    if (!primaryRole) {
                        skillMatches = true; // If no primaryRole filter, include all
                    } else {
                        // Check profession
                        if (profession === primaryRole) {
                            skillMatches = true;
                        }
                        // Check primarySkill
                        else if (primarySkill === primaryRole) {
                            skillMatches = true;
                        }
                        // Check secondarySkill
                        else if (secondarySkill === primaryRole) {
                            skillMatches = true;
                        }
                        // Check tertiarySkill (array)
                        else if (Array.isArray(tertiarySkill) && tertiarySkill.includes(primaryRole)) {
                            skillMatches = true;
                        }
                    }

                    if (name && !nameSet.has(name) && skillMatches && !isRemoved) {
                        nameSet.add(name);
                        candidateList.push({
                            name: name,
                            id: id,
                            docId: doc.id,
                            source: data.source || '',
                            profession: profession,
                            primarySkill: primarySkill,
                            secondarySkill: secondarySkill,
                            tertiarySkill: tertiarySkill,
                            isRemoved: isRemoved
                        });
                    }
                });

                setAllCandidateNames(candidateList);
                setSelectedCandidateNames([]);
            } catch (err) {
                console.error('Error fetching candidate names:', err);
            }
        };
        if (open) fetchCandidateNames();
    }, [open, primaryRole]); // ✅ Added primaryRole dependency

    // Show ALL candidates in calendar, filter display based on selection
    useEffect(() => {
        // If no candidates selected, show all
        if (selectedCandidateNames.length === 0) {
            setCandidates(allCandidateNames);
        } else {
            const filteredCandidates = allCandidateNames.filter(c =>
                selectedCandidateNames.includes(c.name)
            );
            setCandidates(filteredCandidates);
        }
    }, [selectedCandidateNames, allCandidateNames]);

    // Load schedule when candidates or date changes
    useEffect(() => {
        if (open && allCandidateNames.length > 0) {
            fetchScheduleData();
        }
    }, [open, selectedDay, allCandidateNames]);

    const fetchScheduleData = async () => {
        setLoading(true);
        try {
            const scheduleMap = {};

            // Initialize ALL candidates as free (not just selected ones)
            allCandidateNames.forEach(candidate => {
                scheduleMap[candidate.name] = {};
                timeSlots.forEach(slot => {
                    scheduleMap[candidate.name][slot.start] = { status: 'free', tasks: [] };
                });
            });

            // Query ONLY "Resource Allocated" status
            const taskQuery = query(
                collection(db, 'patronOtsAddRequest'),
                where('status', '==', 'Resource Allocated')
            );
            const taskSnapshot = await getDocs(taskQuery);

            for (const taskDoc of taskSnapshot.docs) {
                const taskData = taskDoc.data();

                if (!taskData.taskDate) continue;

                const taskDate = taskData.taskDate?.toDate ? taskData.taskDate.toDate() : new Date(taskData.taskDate);
                const taskDateStr = taskDate.toISOString().split('T')[0];

                if (taskDateStr === selectedDay) {
                    // Check candidateDetails subcollection
                    const candidateDetailsRef = collection(db, 'patronOtsAddRequest', taskDoc.id, 'candidateDetails');
                    const candidateSnapshot = await getDocs(candidateDetailsRef);

                    candidateSnapshot.forEach(candidateDoc => {
                        const candidate = candidateDoc.data();
                        const candidateName = candidate.candidateName;

                        if (scheduleMap[candidateName]) {
                            // ✅ Handle both array and single timestamp values
                            let taskStartTime = candidate.taskStartTime || taskData.taskStartTime;
                            let taskEndTime = candidate.taskEndTime || taskData.taskEndTime;

                            // If it's an array, take the first element
                            if (Array.isArray(taskStartTime)) {
                                taskStartTime = taskStartTime[0];
                            }
                            if (Array.isArray(taskEndTime)) {
                                taskEndTime = taskEndTime[0];
                            }

                            const startTime = parseTimeFromTimestamp(taskStartTime);
                            const endTime = parseTimeFromTimestamp(taskEndTime);

                            timeSlots.forEach(slot => {
                                if (isTimeInRange(slot.start, startTime, endTime)) {
                                    scheduleMap[candidateName][slot.start].status = 'busy';
                                    scheduleMap[candidateName][slot.start].tasks.push({
                                        patronName: taskData.patronName,
                                        requestID: taskData.requestID,
                                        taskRef: taskDoc.id,
                                        startTime,
                                        endTime
                                    });
                                }
                            });
                        }
                    });

                    // Also check main document
                    if (taskData.candidateName && scheduleMap[taskData.candidateName]) {
                        // ✅ Handle both array and single timestamp values
                        let taskStartTime = taskData.taskStartTime;
                        let taskEndTime = taskData.taskEndTime;

                        if (Array.isArray(taskStartTime)) {
                            taskStartTime = taskStartTime[0];
                        }
                        if (Array.isArray(taskEndTime)) {
                            taskEndTime = taskEndTime[0];
                        }

                        const startTime = parseTimeFromTimestamp(taskStartTime);
                        const endTime = parseTimeFromTimestamp(taskEndTime);

                        timeSlots.forEach(slot => {
                            if (isTimeInRange(slot.start, startTime, endTime)) {
                                if (!scheduleMap[taskData.candidateName][slot.start].tasks.some(t => t.taskRef === taskDoc.id)) {
                                    scheduleMap[taskData.candidateName][slot.start].status = 'busy';
                                    scheduleMap[taskData.candidateName][slot.start].tasks.push({
                                        patronName: taskData.patronName,
                                        requestID: taskData.requestID,
                                        taskRef: taskDoc.id,
                                        startTime,
                                        endTime
                                    });
                                }
                            }
                        });
                    }
                }
            }

            setScheduleData(scheduleMap);
        } catch (error) {
            console.error('Error fetching schedule:', error);
        }
        setLoading(false);
    };

    const isTimeInRange = (slotStart, taskStart, taskEnd) => {
        const slotHour = parseInt(slotStart.split(':')[0]);

        const [startHour, startMinute] = taskStart.split(':').map(Number);
        const [endHour, endMinute] = taskEnd.split(':').map(Number);

        // ✅ Calculate slot range (e.g., 7:00 slot covers 7:00-7:59)
        const slotStartMinutes = slotHour * 60;
        const slotEndMinutes = (slotHour + 1) * 60; // Next hour

        const taskStartMinutes = startHour * 60 + startMinute;
        const taskEndMinutes = endHour * 60 + endMinute;

        // ✅ Check for overlap: task starts before slot ends AND task ends after slot starts
        return taskStartMinutes < slotEndMinutes && taskEndMinutes > slotStartMinutes;
    };

    const toggleCandidateName = (candidateName) => {
        setSelectedCandidateNames(prev => {
            if (prev.includes(candidateName)) {
                return prev.filter(name => name !== candidateName);
            } else {
                return [...prev, candidateName];
            }
        });
    };

    const handleCellClick = (candidate, timeSlot) => {
        const slotData = scheduleData[candidate.name]?.[timeSlot.start];

        if (slotData?.status === 'free') {
            setSelectedCandidateInfo(candidate);
            setSelectedTimeSlot(timeSlot);
            setConfirmDialogOpen(true);
        }
    };

    const handleConfirmRelocation = async (candidateId, remarks, scheduleInfo) => {
        await onConfirm(candidateId, remarks, scheduleInfo);
        setConfirmDialogOpen(false);
        await fetchScheduleData();
        onClose();
    };

    const handleOpenRelocate = (row) => {
        setSelectedRow(row);
        setScheduleModalOpen(true);
    };

    const filteredTimeSlots = timeSlots.filter(slot => {
        const slotHour = parseInt(slot.start.split(':')[0]);
        const startHour = parseInt(timeRange.start.split(':')[0]);
        const endHour = parseInt(timeRange.end.split(':')[0]);
        return slotHour >= startHour && slotHour < endHour;
    });

    const searchFilteredCandidates = allCandidateNames.filter(c =>
        c.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(candidateSearchTerm.toLowerCase())
    );

    return (
        <>
            <Modal open={open} onClose={onClose}>
                <Box
                    className="relative top-1/2 left-1/2 bg-white rounded-lg shadow-xl overflow-hidden"
                    style={{
                        transform: 'translate(-50%, -50%)',
                        width: '95vw',
                        maxWidth: '1400px',
                        height: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: 'NeuzeitGro, sans-serif'
                    }}
                >
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center" >
                        <div className="flex items-center gap-3">
                            <Calendar className="w-6 h-6" />
                            <h2 className="text-xl font-bold">Candidate Schedule - {selectedDay}</h2>
                        </div>
                        <button onClick={onClose} className="hover:bg-blue-800 p-2 rounded-full transition">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="bg-gray-50 p-4 border-b">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-600" />
                                <input
                                    type="date"
                                    value={selectedDay}
                                    onChange={(e) => setSelectedDay(e.target.value)}
                                    className="border rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-600" />
                                <select
                                    value={timeRange.start}
                                    onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="border rounded px-3 py-2 text-sm"
                                >
                                    {timeSlots.map(slot => (
                                        <option key={slot.start} value={slot.start}>{slot.start}</option>
                                    ))}
                                </select>
                                <span>to</span>
                                <select
                                    value={timeRange.end}
                                    onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="border rounded px-3 py-2 text-sm"
                                >
                                    {timeSlots.map(slot => (
                                        <option key={slot.end} value={slot.end}>{slot.end}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative candidate-dropdown-container">
                                <button
                                    onClick={() => setShowCandidateDropdown(!showCandidateDropdown)}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>Filter Candidates ({selectedCandidateNames.length}/{allCandidateNames.length})</span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>

                                {showCandidateDropdown && (
                                    <div className="fixed sm:absolute top-1/2 left-1/2 sm:top-full sm:left-0 transform -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0 mt-0 sm:mt-2 bg-white rounded-lg shadow-xl border z-50 w-[90vw] sm:w-72 md:w-80 max-h-[70vh] sm:max-h-none overflow-hidden">
                                        <div className="p-3">
                                            <div className="flex justify-between items-center mb-2 sm:hidden">
                                                <span className="font-semibold text-gray-700">Filter Candidates</span>
                                                <button onClick={() => setShowCandidateDropdown(false)} className="text-gray-500 hover:text-red-600">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search candidates..."
                                                value={candidateSearchTerm}
                                                onChange={(e) => setCandidateSearchTerm(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                                            />
                                            <div className="max-h-[50vh] sm:max-h-64 overflow-y-auto">
                                                {searchFilteredCandidates.length > 0 ? (
                                                    searchFilteredCandidates.map(candidate => (
                                                        <label
                                                            key={`${candidate.docId}-${candidate.name}`}
                                                            className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded transition"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCandidateNames.includes(candidate.name)}
                                                                onChange={() => toggleCandidateName(candidate.name)}
                                                                className="w-4 h-4 accent-blue-600"
                                                            />
                                                            <div className="text-sm flex-1">
                                                                <div className="font-medium text-gray-900">{candidate.name}</div>
                                                                <div className="text-xs text-gray-500">{candidate.id}</div>
                                                            </div>
                                                        </label>
                                                    ))
                                                ) : (
                                                    <div className="text-center text-gray-500 py-8 text-sm">
                                                        {candidateSearchTerm ? 'No candidates found' : 'No candidates available'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={fetchScheduleData}
                                disabled={loading}
                                className="ml-auto bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:bg-gray-400"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-lg text-gray-600">Loading schedule...</div>
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-lg text-gray-500">Select candidates from the filter to view their schedule</div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 bg-gray-100 z-10">
                                        <tr>
                                            <th className="border p-2 text-left font-semibold text-sm min-w-[150px]">
                                                Candidate
                                            </th>
                                            {filteredTimeSlots.map(slot => (
                                                <th key={slot.start} className="border p-2 text-center font-semibold text-xs min-w-[100px]">
                                                    {slot.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.map(candidate => (
                                            <tr key={`${candidate.docId}-row`} className="hover:bg-gray-50">
                                                <td className="border p-2 font-medium text-sm bg-gray-50">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-600" />
                                                        <div>
                                                            <div>{candidate.name}</div>
                                                            <div className="text-xs text-gray-500">{candidate.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {filteredTimeSlots.map(slot => {
                                                    const slotData = scheduleData[candidate.name]?.[slot.start] || { status: 'free', tasks: [] };
                                                    const isBusy = slotData.status === 'busy';

                                                    return (
                                                        <td
                                                            key={`${candidate.docId}-${slot.start}`}
                                                            className={`border p-2 text-center text-xs transition-all ${isBusy
                                                                ? 'bg-red-500 text-white cursor-not-allowed'
                                                                : 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                                                                }`}
                                                            onClick={() => !isBusy && handleCellClick(candidate, slot)}
                                                            title={isBusy ? `Busy: ${slotData.tasks.map(t => t.requestID).join(', ')}` : 'Available - Click to allocate'}
                                                        >
                                                            {isBusy ? '✕ Busy' : '✓ Free'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-3 border-t flex items-center justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span>Available (Click to allocate)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span>Busy</span>
                        </div>
                    </div>
                </Box>
            </Modal>

            <RelocationConfirmDialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={handleConfirmRelocation}
                candidateInfo={selectedCandidateInfo}
                defaultDate={selectedDay}
                defaultTime={selectedTimeSlot?.start}
                scheduleData={scheduleData}
                taskData={taskData}
            />
        </>
    );
}