'use client';
import React, { useState, useEffect } from 'react';
import { Modal, Box } from '@mui/material';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { X, Calendar, Clock, Filter, User } from 'lucide-react';

const db = getFirestore();

export default function ReadOnlyScheduleModal({ open, onClose }) {
    const [allCandidateNames, setAllCandidateNames] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [scheduleData, setScheduleData] = useState({});
    const [loading, setLoading] = useState(false);

    const [selectedCandidateNames, setSelectedCandidateNames] = useState([]);
    const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState({ start: '07:00', end: '24:00' });
    const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
    const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);

    const timeSlots = [];
    for (let hour = 7; hour < 24; hour++) {
        timeSlots.push({
            start: `${hour.toString().padStart(2, '0')}:00`,
            end: `${(hour + 1).toString().padStart(2, '0')}:00`,
            label: `${hour}:00 - ${hour}:59`
        });
    }

    const parseTimeFromTimestamp = (timeValue) => {
        if (!timeValue) return '09:00';
        if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}/.test(timeValue)) {
            const match = timeValue.match(/^(\d{1,2}):(\d{2})/);
            if (match) {
                const hours = match[1].padStart(2, '0');
                const minutes = match[2];
                return `${hours}:${minutes}`;
            }
        }
        try {
            const date = timeValue.toDate ? timeValue.toDate() : new Date(timeValue);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        } catch (e) {
            return '09:00';
        }
    };

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

                    if (name && !nameSet.has(name)) {
                        nameSet.add(name);
                        candidateList.push({
                            name: name,
                            id: id,
                            docId: doc.id,
                            source: data.source || ''
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
    }, [open]);

    useEffect(() => {
        if (selectedCandidateNames.length === 0) {
            setCandidates(allCandidateNames);
        } else {
            const filteredCandidates = allCandidateNames.filter(c =>
                selectedCandidateNames.includes(c.name)
            );
            setCandidates(filteredCandidates);
        }
    }, [selectedCandidateNames, allCandidateNames]);

    useEffect(() => {
        if (open && allCandidateNames.length > 0) {
            fetchScheduleData();
        }
    }, [open, selectedDay, allCandidateNames]);

    const fetchScheduleData = async () => {
        setLoading(true);
        try {
            const scheduleMap = {};

            allCandidateNames.forEach(candidate => {
                scheduleMap[candidate.name] = {};
                timeSlots.forEach(slot => {
                    scheduleMap[candidate.name][slot.start] = { status: 'free', tasks: [] };
                });
            });

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
                    const candidateDetailsRef = collection(db, 'patronOtsAddRequest', taskDoc.id, 'candidateDetails');
                    const candidateSnapshot = await getDocs(candidateDetailsRef);

                    candidateSnapshot.forEach(candidateDoc => {
                        const candidate = candidateDoc.data();
                        const candidateName = candidate.candidateName;

                        if (scheduleMap[candidateName]) {
                            // ✅ FIXED: Handle both array and single timestamp values properly
                            let taskStartTime = candidate.taskStartTime || taskData.taskStartTime;
                            let taskEndTime = candidate.taskEndTime || taskData.taskEndTime;

                            // If it's an array, take the first element
                            if (Array.isArray(taskStartTime)) {
                                taskStartTime = taskStartTime[0];
                            }
                            if (Array.isArray(taskEndTime)) {
                                taskEndTime = taskEndTime[0];
                            }

                            // ✅ FIXED: Parse the extracted values, not the original arrays
                            const startTime = parseTimeFromTimestamp(taskStartTime);
                            const endTime = parseTimeFromTimestamp(taskEndTime);

                            timeSlots.forEach(slot => {
                                if (isTimeInRange(slot.start, startTime, endTime)) {
                                    scheduleMap[candidateName][slot.start].status = 'busy';
                                    scheduleMap[candidateName][slot.start].tasks.push({
                                        patronName: taskData.patronName,
                                        requestID: taskData.requestID || taskData.serviceCode,
                                        startTime,
                                        endTime
                                    });
                                }
                            });
                        }
                    });
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
        <Modal open={open} onClose={onClose}>
            <Box
                className="relative top-1/2 left-1/2 bg-white rounded-lg shadow-xl overflow-hidden"
                style={{
                    transform: 'translate(-50%, -50%)',
                    width: '95vw',
                    maxWidth: '1400px',
                    height: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 md:p-4 flex justify-between items-center" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                    <div className="flex items-center gap-2 md:gap-3">
                        <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                        <h2 className="text-lg md:text-xl font-bold">Schedule Viewer - {selectedDay}</h2>
                        <span className="hidden sm:inline bg-purple-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm">Read Only</span>
                    </div>
                    <button onClick={onClose} className="hover:bg-purple-800 p-1 md:p-2 rounded-full transition">
                        <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-gray-50 p-2 md:p-4 border-b">
                    <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                            <input
                                type="date"
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(e.target.value)}
                                className="border rounded px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                            <select
                                value={timeRange.start}
                                onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
                                className="border rounded px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm"
                            >
                                {timeSlots.map(slot => (
                                    <option key={slot.start} value={slot.start}>{slot.start}</option>
                                ))}
                            </select>
                            <span className="text-xs md:text-sm">to</span>
                            <select
                                value={timeRange.end}
                                onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
                                className="border rounded px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm"
                            >
                                {timeSlots.map(slot => (
                                    <option key={slot.end} value={slot.end}>{slot.end}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowCandidateDropdown(!showCandidateDropdown)}
                                className="flex items-center gap-2 bg-purple-600 text-white px-3 md:px-4 py-1 md:py-2 rounded hover:bg-purple-700 transition text-xs md:text-sm"
                            >
                                <Filter className="w-3 h-3 md:w-4 md:h-4" />
                                <span className="hidden sm:inline">Filter</span> ({selectedCandidateNames.length}/{allCandidateNames.length})
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
                                            {searchFilteredCandidates.map(candidate => (
                                                <label key={candidate.docId} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCandidateNames.includes(candidate.name)}
                                                        onChange={() => toggleCandidateName(candidate.name)}
                                                        className="w-4 h-4 accent-purple-600"
                                                    />
                                                    <div className="text-sm flex-1">
                                                        <div className="font-medium">{candidate.name}</div>
                                                        <div className="text-xs text-gray-500">{candidate.id}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={fetchScheduleData}
                            disabled={loading}
                            className="ml-auto bg-green-600 text-white px-3 md:px-4 py-1 md:py-2 rounded hover:bg-green-700 transition text-xs md:text-sm disabled:bg-gray-400"
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Schedule Table */}
                <div className="flex-1 overflow-auto p-2 md:p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-base md:text-lg">Loading schedule...</div>
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-sm md:text-lg text-gray-500 text-center px-4">
                                Select candidates from the filter to view their schedule
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-max">
                                <thead className="sticky top-0 bg-gray-100 z-10">
                                    <tr>
                                        <th className="border p-2 text-left text-xs md:text-sm font-semibold min-w-[120px] md:min-w-[150px]">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-600" />
                                                Candidate
                                            </div>
                                        </th>
                                        {filteredTimeSlots.map(slot => (
                                            <th key={slot.start} className="border p-2 text-center text-xs font-semibold min-w-[80px] md:min-w-[100px]">
                                                {slot.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map(candidate => (
                                        <tr key={candidate.docId} className="hover:bg-gray-50">
                                            <td className="border p-2 text-xs md:text-sm bg-gray-50 font-medium">
                                                <div>
                                                    <div className="font-semibold">{candidate.name}</div>
                                                    <div className="text-xs text-gray-500">{candidate.id}</div>
                                                </div>
                                            </td>
                                            {filteredTimeSlots.map(slot => {
                                                const slotData = scheduleData[candidate.name]?.[slot.start] || { status: 'free' };
                                                const isBusy = slotData.status === 'busy';
                                                return (
                                                    <td
                                                        key={slot.start}
                                                        className={`border p-2 text-center text-xs transition-all ${isBusy
                                                            ? 'bg-red-500 text-white cursor-help'
                                                            : 'bg-green-500 text-white'
                                                            }`}
                                                        title={isBusy ? `Busy: ${slotData.tasks.map(t => t.requestID).join(', ')}` : 'Available'}
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

                {/* Legend */}
                <div className="bg-gray-50 p-2 md:p-3 border-t flex justify-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded"></div>
                        <span className="text-xs md:text-sm">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded"></div>
                        <span className="text-xs md:text-sm">Busy</span>
                    </div>
                </div>
            </Box>
        </Modal>
    );
}