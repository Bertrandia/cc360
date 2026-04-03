'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase/config';
import RoleSpecificFields from './RoleSpecificForm';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp,
    updateDoc
} from 'firebase/firestore';
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { UploadCloud, FileText, X } from 'lucide-react';
import Snackbar, { triggerSnackbar } from './snakbar';

const fontStyle = { fontFamily: 'NeuzeitGro, "Inter", sans-serif' };

// Add this function after your imports and before the SearchableSelect component
function generateTaskID(patronName, category, createdTime, subCategory) {
    if (!patronName || patronName.length < 3) return '';

    const nameCode = patronName[0].toUpperCase() +
        patronName.substring(patronName.length - 2).toUpperCase();
    const categoryCode = category.substring(0, 3).toUpperCase();

    const day = String(createdTime.getDate()).padStart(2, '0');
    const month = String(createdTime.getMonth() + 1).padStart(2, '0');
    const year = String(createdTime.getFullYear()).slice(-2);
    const dateCode = `${day}${month}${year}`;

    const hours = String(createdTime.getHours()).padStart(2, '0');
    const minutes = String(createdTime.getMinutes()).padStart(2, '0');
    const seconds = String(createdTime.getSeconds()).padStart(2, '0');
    const timeCode = `${hours}${minutes}${seconds}`;

    const subCategoryCode = subCategory.substring(0, 2).toUpperCase();

    return `${nameCode}${categoryCode}${dateCode}${timeCode}${subCategoryCode}`;
}

// Searchable Select Component (keyboard friendly)
function SearchableSelect({ label, placeholder = 'Select', items, value, onChange, required = false, multiple = false }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listRefs = useRef([]);

    useEffect(() => {
        const onClickAway = (e) => {
            if (!containerRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('click', onClickAway);
        return () => document.removeEventListener('click', onClickAway);
    }, []);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return items || [];
        return (items || []).filter((it) => String(it?.label ?? it).toLowerCase().includes(term));
    }, [items, search]);

    useEffect(() => {
        setHighlightIndex(filtered.length ? 0 : -1);
    }, [filtered.length]);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            setSearch('');
        }
    }, [open]);

    useEffect(() => {
        if (highlightIndex >= 0 && listRefs.current[highlightIndex]) {
            listRefs.current[highlightIndex].scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex]);

    const selectedLabel = useMemo(() => {
        if (multiple && Array.isArray(value)) {
            if (value.length === 0) return '';
            return `${value.length} selected`;
        }
        if (!value) return '';
        const found = (items || []).find((it) => (it?.value ?? it) === value);
        if (!found) return String(value);
        return String(found?.label ?? found);
    }, [items, value, multiple]);

    const onKeyDown = (e) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && filtered[highlightIndex]) {
                const val = filtered[highlightIndex]?.value ?? filtered[highlightIndex];
                if (multiple) {
                    const current = Array.isArray(value) ? value : [];
                    if (current.includes(val)) onChange(current.filter((v) => v !== val));
                    else onChange([...current, val]);
                } else {
                    onChange(val);
                    setOpen(false);
                }
                setSearch('');
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
        }
    };

    const handleItemClick = (val) => {
        if (multiple) {
            const current = Array.isArray(value) ? value : [];
            if (current.includes(val)) {
                onChange(current.filter((v) => v !== val));
            } else {
                onChange([...current, val]);
            }
        } else {
            onChange(val);
            setOpen(false);
        }
    };

    return (
        <div className="w-full" ref={containerRef} onKeyDown={onKeyDown}>
            {label && (
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="w-full text-left border border-gray-300 bg-gray-50 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-between"
                >
                    <span className="truncate">{selectedLabel || placeholder}</span>
                    <span className="text-gray-400">▾</span>
                </button>

                {open && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                        <div className="p-2">
                            <input
                                ref={inputRef}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setHighlightIndex(0); }}
                            />
                        </div>
                        <ul className="max-h-56 overflow-auto">
                            {filtered.length === 0 && (
                                <li className="px-3 py-2 text-sm text-gray-500">No results</li>
                            )}
                            {filtered.map((it, idx) => {
                                const val = it?.value ?? it;
                                const lab = it?.label ?? it;
                                const highlighted = idx === highlightIndex;
                                const selected = multiple ? (Array.isArray(value) && value.includes(val)) : value === val;
                                return (
                                    <li
                                        key={`${it.id || idx}-${String(val)}`}
                                        ref={(el) => (listRefs.current[idx] = el)}
                                        className={`px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer flex items-center gap-2 ${highlighted ? 'bg-orange-50' : ''}`}
                                        onMouseEnter={() => setHighlightIndex(idx)}
                                        onMouseDown={(ev) => ev.preventDefault()}
                                        onClick={() => handleItemClick(val)}
                                    >
                                        {multiple && (
                                            <input type="checkbox" checked={selected} readOnly className="pointer-events-none" />
                                        )}
                                        {String(lab)}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

// Simple Select Component
function SimpleSelect({ label, placeholder = 'Select', items, value, onChange, required = false }) {
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef(null);
    const listRefs = useRef([]);

    useEffect(() => {
        const onClickAway = (e) => {
            if (!containerRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('click', onClickAway);
        return () => document.removeEventListener('click', onClickAway);
    }, []);

    const selectedLabel = useMemo(() => {
        if (value === null || value === undefined || value === '') return '';
        const found = (items || []).find((it) => String(it?.value ?? it) === String(value));
        if (!found) return String(value);
        return String(found?.label ?? found);
    }, [items, value]);

    useEffect(() => {
        if (open) {
            setHighlightIndex(items && items.length ? 0 : -1);
        } else {
            setHighlightIndex(-1);
        }
    }, [open, items]);

    useEffect(() => {
        if (highlightIndex >= 0 && listRefs.current[highlightIndex]) {
            listRefs.current[highlightIndex].scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex]);

    const onKeyDown = (e) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, (items || []).length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const itm = (items || [])[highlightIndex];
            if (itm) {
                onChange(itm?.value ?? itm);
                setOpen(false);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="w-full" ref={containerRef} onKeyDown={onKeyDown}>
            {label && (
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="w-full text-left border border-gray-300 bg-gray-50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                    <span>{selectedLabel || placeholder}</span>
                </button>

                {open && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                        <ul>
                            {(items || []).map((it, idx) => {
                                const val = it?.value ?? it;
                                const lab = it?.label ?? it;
                                const highlighted = idx === highlightIndex;
                                return (
                                    <li
                                        key={String(val)}
                                        ref={(el) => (listRefs.current[idx] = el)}
                                        className={`px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer ${highlighted ? 'bg-orange-50' : ''}`}
                                        onMouseEnter={() => setHighlightIndex(idx)}
                                        onMouseDown={(ev) => ev.preventDefault()}
                                        onClick={() => { onChange(val); setOpen(false); }}
                                    >
                                        {String(lab)}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AssociateFormDialog({
    open,
    onClose,
    onSuccess,
    activeTab = 'associate',
    onSwitchTab,
}) {
    const { user } = useAuth();

    const [requestType, setRequestType] = useState('D2C');
    const [clientCodes, setClientCodes] = useState([]);
    const [selectedClientCode, setSelectedClientCode] = useState('');
    const [familyMembers, setFamilyMembers] = useState([]);
    const [assignedBy, setAssignedBy] = useState('');
    const [patronName, setPatronName] = useState('');
    const [showPatronSuggestions, setShowPatronSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const suggestionRefs = useRef([]);
    const [requirementType, setRequirementType] = useState('');
    const [primaryRoles, setPrimaryRoles] = useState([]);
    const [selectedPrimaryRole, setSelectedPrimaryRole] = useState('');
    const [ethnicities, setEthnicities] = useState([]);
    const [selectedEthnicity, setSelectedEthnicity] = useState('');
    const [gender, setGender] = useState('');
    const [languages, setLanguages] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState([]);
    const [workingHours, setWorkingHours] = useState('');
    const [addressMode, setAddressMode] = useState('registered');
    const [registeredAddress, setRegisteredAddress] = useState('');
    const [otherAddress, setOtherAddress] = useState('');
    const [salaryRange, setSalaryRange] = useState('');
    const [lastComment, setLastComment] = useState('');
    const [taskInProcessDate, setTaskInPrcoessDate] = useState('');
    const [scopeOfWork, setScopeOfWork] = useState('');
    const [advancePaymentReceived, setAdvancePaymentReceived] = useState('');
    const [requestOpenDate, setRequestOpenDate] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [allPatronNames, setAllPatronNames] = useState([]);
    const workingHourOptions = useMemo(() => ['<6 hours', '6-8 hours', '8-10 hours', '12 hours', 'Live in'], []);
    const [taskDueDate, setTaskDueDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [roleSpecificFields, setRoleSpecificFields] = useState({
        houseSize: '', cleaningFrequency: '', cleaningScope: '', laundryResponsibilities: '',
        kitchenCleaning: '', timePreference: '', cuisineType: '', mealsPerDay: '',
        groceryManagement: '', foodType: '', servingExpectations: '', healthBasedFood: '',
        mealTiming: '', vehicleType: '', drivingPurpose: '', shiftDuration: '',
        nightOutstationReadiness: '', additionalTasksDriver: '', vehicleOwnership: '',
        childAge: '', nannyDuties: '', dayOrLiveIn: '', parentPresence: '', nightDuty: '',
        firstAidKnowledge: '', travelFlexibility: '', gardenType: '', gardenScope: '',
        toolsProvided: '', gardenFrequency: '', shiftType: '', locationType: '',
        securityDuties: '', uniformProvision: '', armedUnarmed: '', petType: '', petTasks: '',
        petCoverage: '', breedExperience: '', indoorOutdoor: '', elderAge: '', medicalNeeds: '',
        overnightCare: '', eldercareTasks: '', typicalErrands: '', travelRange: '',
        vehicleRequired: '', cashHandling: '', reportingPreference: '', priorityExpectation: '',
        dutySequence: '', vegNonVegSeparation: '', deepCleaningFrequency: '', roleSplit: '',
        childDietaryRestrictions: '', specialRequirements: ''
    });

    // Load master data and patron suggestions
    useEffect(() => {
        if (!open) return;
        const loadMasters = async () => {
            try {
                // Load client codes for logged-in LM
                // if (user?.email) {
                //     const qPm = query(collection(db, 'patronMaster'), where('assignedLmEmail', '==', user.email));
                //     const pmSnap = await getDocs(qPm);
                //     const assignedNames = [];
                //     pmSnap.forEach((d) => {
                //         if (d.data()?.assignedLMName) assignedNames.push(d.data().assignedLMName);
                //     });

                //     const codes = [];
                //     for (const lmName of assignedNames) {
                //         const qAdd = query(collection(db, 'addPatronDetails'), where('assignedLM', '==', lmName));
                //         const addSnap = await getDocs(qAdd);
                //         addSnap.forEach((doc) => {
                //             const data = doc.data();
                //             if (data?.clientCode) {
                //                 codes.push({ label: data.patronBusinessID, value: data.patronBusinessID });
                //             }
                //         });
                //     }
                //     setClientCodes(Array.from(new Map(codes.map((c) => [c.value, c])).values()));
                // }
                if (user?.email) {
                    // const isOTSDash = window.location.pathname.includes('otsdash');

                    const codes = [];
                    const names = [];
                    const userCollectionRef = collection(db, 'user');
                    const userQuery = query(userCollectionRef, where('email', '==', user.email));
                    const userSnapshot = await getDocs(userQuery);

                    if (!userSnapshot.empty) {
                        const currentUserDisplayName = userSnapshot.docs[0].data().display_name;
         
                        // Then filter patrons by assignedLM matching current user's name
                        const qAdd = query(
                            collection(db, 'addPatronDetails'),
                            where('assignedLM', '==', currentUserDisplayName)
                        );
                        const addSnap = await getDocs(qAdd);

                        addSnap.forEach((doc) => {
                            const data = doc.data();
                            if (data?.patronBusinessID) {
                                codes.push({ label: data.patronBusinessID, value: data.patronBusinessID, id: doc.id });
                            }
                            if (data?.patronName) {
                                names.push({ label: data.patronName, value: data.patronName, id: doc.id });
                            }
                        });
                    }
                   // console.log("NEW DATA",allPatronNames)
                    setClientCodes(Array.from(new Map(codes.map((c) => [c.value, c])).values()));
                    setAllPatronNames(Array.from(new Map(names.map((c) => [c.value, c])).values()));
                }

                const [roleSnap, ethSnap, langSnap, namesSnap] = await Promise.all([
                    getDocs(collection(db, 'patronPrimaryRole')),
                    getDocs(collection(db, 'patronEthnicityPreference')),
                    getDocs(collection(db, 'patronLanguage')),
                    getDocs(collection(db, 'addPatronDetails')),
                ]);

                const roles = [];
                roleSnap.forEach((d) => { const v = d.data()?.primaryRole; if (v) roles.push({ label: v, value: v }); });
                setPrimaryRoles(roles);

                const eths = [];
                ethSnap.forEach((d) => { const v = d.data()?.ethnicity; if (v) eths.push({ label: v, value: v }); });
                setEthnicities(eths);

                const langs = [];
                langSnap.forEach((d) => { const v = d.data()?.language; if (v) langs.push({ label: v, value: v }); });
                setLanguages(langs);

                const names = [];
                namesSnap.forEach((d) => { const v = d.data()?.patronName; if (v) names.push({ label: v, value: v }); });
                const uniq = Array.from(new Map(names.map(n => [n.value.toLowerCase(), n])).values());
                setAllPatronNames(uniq);
            } catch (e) {
                console.error('Failed to load master data', e);
            }
        };
        loadMasters();
    }, [open, user]);

  console.log("selectedClientCode111",clientCodes)
    // Helpers
    const loadFamilyMembersByDocId = async (docId) => {
        try {
            if (!docId) return;
            const patronRef = doc(db, "addPatronDetails", docId);
            const qFam = query(collection(db, 'patronFamilyMembers'), where('patronRef', '==', patronRef));
            const famSnap = await getDocs(qFam);
            const famList = [];
            famSnap.forEach((d) => {
                const data = d.data();
                const name = data?.Name || data?.name;
                if (name) famList.push({ label: name, value: name });
            });
            setFamilyMembers(famList);
        } catch (err) {
            console.error('Failed to load family members:', err);
        }
    };

    const findPatronDocByClientCode = async (clientCode) => {
        if (!clientCode) return null;
        const q = query(collection(db, 'addPatronDetails'), where('patronBusinessID', '==', clientCode));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const doc0 = snap.docs[0];
        return { docId: doc0.id, billing: doc0.data()?.billingAddress || '', data: doc0.data() };
    };

    const findPatronDocByName = async (nameToFind) => {
        if (!nameToFind) return null;
        const q = query(collection(db, 'addPatronDetails'), where('patronName', '==', nameToFind));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const doc0 = snap.docs[0];
        return { docId: doc0.id, billing: doc0.data()?.billingAddress || '', data: doc0.data() };
    };

    // Load address + family on clientCode change
    useEffect(() => {
        const load = async () => {
            if (!selectedClientCode) {
                setRegisteredAddress('');
                setFamilyMembers([]);
                return;
            }
            const found = await findPatronDocByClientCode(selectedClientCode);
            if (!found) {
                setRegisteredAddress('');
                setFamilyMembers([]);
                return;
            }
            setRegisteredAddress(found.billing || '');
            await loadFamilyMembersByDocId(found.docId);
        };
        load();
    }, [selectedClientCode]);

    // Load on patron name change
    useEffect(() => {
        const load = async () => {
            if (requestType === 'D2C') return;
            if (!patronName) {
                setRegisteredAddress('');
                setFamilyMembers([]);
                return;
            }
            const found = await findPatronDocByName(patronName.trim());
            if (!found) {
                setRegisteredAddress('');
                setFamilyMembers([]);
                return;
            }
            setRegisteredAddress(found.billing || '');
            await loadFamilyMembersByDocId(found.docId);
        };
        load();
    }, [patronName, requestType]);

    const onUploadFiles = async (files) => {
        if (!files || files.length === 0) return;
        if (uploadedFiles.length > 0) {
            triggerSnackbar('Please remove the existing file before uploading a new one.');
            return;
        }
        try {
            setUploading(true);
            const file = files[0];
            const path = `associate-requests/${user?.uid || 'anonymous'}/${Date.now()}_${file.name}`;
            const r = storageRef(storage, path);
            await uploadBytes(r, file);
            const url = await getDownloadURL(r);
            setUploadedFiles([{ name: file.name, url, path }]);
        } catch (e) {
            console.error('Upload failed', e);
            triggerSnackbar('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const onCreateTask = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            if (!selectedPrimaryRole || !requirementType || !advancePaymentReceived || !addressMode || !scopeOfWork) {
                triggerSnackbar('Please fill all required fields');
                return;
            }

            let patronDocId = '';
            let patronData = null;
            if (requestType === 'D2C' && selectedClientCode) {
                const found = await findPatronDocByClientCode(selectedClientCode);
                patronDocId = found?.docId || '';
                patronData = found?.data || null;

            } else if (requestType !== 'D2C' && patronName) {
                const found = await findPatronDocByName(patronName.trim());
                patronDocId = found?.docId || '';
                patronData = found?.data || null;
            }

            if (!patronDocId || !patronData) {
                triggerSnackbar('Could not resolve patron record. Please select a valid Client Code or Patron Name.');
                return;
            }

            let assignedLMName = '';
            let lmNumber = '';
            if (user?.email) {
                const qUser = query(collection(db, 'user'), where('email', '==', user.email));
                const uSnap = await getDocs(qUser);
                uSnap.forEach((d) => {
                    const data = d.data();
                    if (!assignedLMName) assignedLMName = data?.display_name || '';
                    if (!lmNumber) lmNumber = data?.phone_number || '';
                });
            }
           const taskDueDateTimestamp = taskDueDate
  ? Timestamp.fromDate(new Date(taskDueDate))
  : null;

            const now = new Date();
            const createdAt = Timestamp.fromDate(now);
            const taskAssignDate = createdAt;
            const taskDate = createdAt;
            // const due = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
            // const taskDueDate = Timestamp.fromDate(due);
            const taskRecievedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const patronCity = patronData?.city || '';
            const patronAddress = addressMode === 'registered' ? (patronData?.billingAddress || registeredAddress) : otherAddress;
            const patronID = patronData?.patronBusinessID || '';
            const patronRef = doc(db, 'addPatronDetails', patronDocId);
            const lmRef = patronData?.lmRef || '';
            const patronNameResolved = requestType === 'D2C' ? (patronData?.patronName || '') : patronName;
            const newPatronID = patronData?.newPatronID || '';
            const newPatronName = patronData?.newPatronName || '';
            const backupLmName = patronData?.backupLmName || '';
            const backupLmRef = patronData?.backupLmRef || '';

            let requestID = '';
            let dynamicCode = '';
            try {
                const primaryRoleQuery = query(
                    collection(db, 'patronPrimaryRole'),
                    where('primaryRole', '==', selectedPrimaryRole)
                );
                const roleSnapshot = await getDocs(primaryRoleQuery);

                if (!roleSnapshot.empty) {
                    const roleDoc = roleSnapshot.docs[0];
                    const roleData = roleDoc.data();
                    dynamicCode = roleData.code || 'ASR';
                    const currentCount = roleData.existingRequestsCount || 0;

                    // Generate requestID: YYMMDD + code + incrementedCount
                    const yy = String(now.getFullYear()).slice(-2);
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    const datePart = `${yy}${mm}${dd}`;
                    const requestCountPart = (currentCount + 1).toString();
                    requestID = `${datePart}${dynamicCode}${requestCountPart}`;

                    // Increment existingRequestsCount in patronPrimaryRole
                    const roleDocRef = doc(db, 'patronPrimaryRole', roleDoc.id);
                    await updateDoc(roleDocRef, {
                        existingRequestsCount: currentCount + 1
                    });
                } else {
                    // Fallback if primaryRole not found
                    const yy = String(now.getFullYear()).slice(-2);
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    requestID = `${yy}${mm}${dd}ASR1`;
                }
            } catch (error) {
                console.error('Error generating requestID:', error);
                const yy = String(now.getFullYear()).slice(-2);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                requestID = `${yy}${mm}${dd}ASR1`;
            }

            const taskID = generateTaskID(
                patronNameResolved || 'Unknown',
                'Trained Manpower',
                now,
                'Recruitment'
            );

            let assignedByRef = null;

            if (assignedBy) {
                const familyQuery = query(
                    collection(db, "patronFamilyMembers"),
                    where("Name", "==", assignedBy)
                );

                const familySnap = await getDocs(familyQuery);

                if (!familySnap.empty) {
                    assignedByRef = doc(
                        db,
                        "patronFamilyMembers",
                        familySnap.docs[0].id
                    );
                }
            }

            const payload = {
                assignedLMName: assignedLMName || '',
                createdAt,
                createdBy: user?.email || '',
                lmNumber: lmNumber || '',
                lmRef: lmRef || '',
                location: patronCity || '',
                patronAddress: patronAddress || '',
                patronCity: patronCity || '',
                clientCode: patronID || '',
                patronID: patronID || '',
                patronRef,
                taskAssignDate,
                taskDueDate: taskDueDateTimestamp,
                taskAssignedBy: assignedBy,
                assignedByRef: assignedByRef,
                taskCategory: 'Trained Manpower',
                taskType: 'Associate',
                isCockpitTaskCreated: false,
                isDelayed: false,
                isOTSTask: false,
                isTaskDisabled: false,
                taskDate,
                taskDescription: scopeOfWork || '',
                primaryRole: selectedPrimaryRole || '',
                requirementType: requirementType || '',
                taskOwner: assignedLMName || '',
                taskRecievedTime,
                taskSubCategory: 'Recruitment',
                requestType,
                language: Array.isArray(selectedLanguage) ? selectedLanguage : (selectedLanguage ? [selectedLanguage] : []),
                workingHours,
                salaryRange,
                advancePaymentReceived,
                requestID,
                taskID,
                backupLmName: backupLmName,
                backupLmRef: backupLmRef,
                natureOfRequirement: selectedPrimaryRole || '',
                lmEmail: user?.email || '',
            };

            const patronload = {
                ...payload,
                status: 'Pending',
                patronName: patronNameResolved || '',
                scopeOfWork,
                requestOpenDate,
                isExpand: false,
                ethnicityPreference: selectedEthnicity,
                genderPreference: gender,
                attachments: uploadedFiles,
                roleSpecificData: roleSpecificFields,
                isCompleteDetails: false,
            };

            const patronAddRequestRef = await addDoc(collection(db, 'patronAddRequest'), patronload);
            const associateRef = doc(db, 'patronAddRequest', patronAddRequestRef.id);
            const createTaskPayload = {
                ...payload,
                partonName: patronNameResolved || '',
                associateRef,
                status: 'Pending',
                categoryTag: selectedPrimaryRole || '',  // New field
                priority: 'Medium',  // New field
                taskStatusCategory: 'To be Started', // New field
                newPatronID: newPatronID,
                newPatronName: newPatronName,
                billingModel: 'Billable',
                taskSubject: scopeOfWork,
                lastComment: 'Task Created',
                taskInProcessDate: createdAt,

            };
            await addDoc(collection(db, 'createTaskCollection'), createTaskPayload);

            triggerSnackbar('Task successfully created and linked!');
            onSuccess?.();
            onClose?.();

            setRequestType('D2C');
            setSelectedClientCode('');
            setFamilyMembers([]);
            setAssignedBy('');
            setPatronName('');
            setRequirementType('');
            setSelectedPrimaryRole('');
            setSelectedEthnicity('');
            setGender('');
            setSelectedLanguage([]);
            setWorkingHours('');
            setAddressMode('registered');
            setRegisteredAddress('');
            setOtherAddress('');
            setSalaryRange('');
            setLastComment('');
            setScopeOfWork('');
            setTaskDueDate('');
            setAdvancePaymentReceived('');
            setRequestOpenDate('');
            setUploadedFiles([]);
            setRoleSpecificFields({
                houseSize: '', cleaningFrequency: '', cleaningScope: '', laundryResponsibilities: '',
                kitchenCleaning: '', timePreference: '', cuisineType: '', mealsPerDay: '',
                groceryManagement: '', foodType: '', servingExpectations: '', healthBasedFood: '',
                mealTiming: '', vehicleType: '', drivingPurpose: '', shiftDuration: '',
                nightOutstationReadiness: '', additionalTasksDriver: '', vehicleOwnership: '',
                childAge: '', nannyDuties: '', dayOrLiveIn: '', parentPresence: '', nightDuty: '',
                firstAidKnowledge: '', travelFlexibility: '', gardenType: '', gardenScope: '',
                toolsProvided: '', gardenFrequency: '', shiftType: '', locationType: '',
                securityDuties: '', uniformProvision: '', armedUnarmed: '', petType: '', petTasks: '',
                petCoverage: '', breedExperience: '', indoorOutdoor: '', elderAge: '', medicalNeeds: '',
                overnightCare: '', eldercareTasks: '', typicalErrands: '', travelRange: '',
                vehicleRequired: '', cashHandling: '', reportingPreference: '', priorityExpectation: '',
                dutySequence: '', vegNonVegSeparation: '', deepCleaningFrequency: '', roleSplit: '',
                childDietaryRestrictions: '', specialRequirements: ''
            });
        } catch (err) {
            console.error('Failed to create task', err);
            triggerSnackbar('Failed to create task. Please try again.');
        } finally {
    setIsSubmitting(false); // ✅ Unlock button
  }
    };

    // console.log("clientCodesss",clientCodes)
    if (!open) return null;

    const content = (
        <div
            className="cc-modal-card w-full max-w-[540px] bg-white rounded-2xl border border-[#EFEFEF] shadow-[0_18px_60px_rgba(0,0,0,0.12)] max-h-[95vh] overflow-hidden flex flex-col"
            style={fontStyle}
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0] bg-white/80 backdrop-blur-sm">
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-[20px] font-semibold text-[#2C2C2C] tracking-tight">Associate Request Form</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[#F2F2F2] rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4 text-[#6F6F6F]" />
                        </button>
                    </div>
                    {onSwitchTab && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onSwitchTab('associate')}
                                className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${activeTab === 'associate'
                                    ? 'bg-[#F36A23] text-white border-[#F36A23] shadow-sm'
                                    : 'bg-white text-[#3D3D3D] border-[#E8E8E8] hover:border-[#F36A23]/40'
                                    }`}
                            >
                                Associate Request
                            </button>
                            <button
                                onClick={() => onSwitchTab('ots')}
                                className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${activeTab === 'ots'
                                    ? 'bg-[#F36A23] text-white border-[#F36A23] shadow-sm'
                                    : 'bg-white text-[#3D3D3D] border-[#E8E8E8] hover:border-[#F36A23]/40'
                                    }`}
                            >
                                OTS Request
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="cc-form flex-1 overflow-y-auto px-5 pb-6 pt-4 bg-[#F7F7F7]">
                <div className="bg-white rounded-2xl border border-[#F0F0F0] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        <span className="text-sm font-semibold text-[#4C4C4C]">Request Type</span>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {['D2C', 'B2B', 'Non-D2C', 'Bench'].map((t) => (
                                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-[#3C3C3C]">
                                    <input
                                        type="radio"
                                        name="requestType"
                                        checked={requestType === t}
                                        onChange={() => setRequestType(t)}
                                        className="h-4 w-4 rounded-full border border-[#CFCFCF] text-[#F36A23] focus:ring-[#F36A23]"
                                    />
                                    <span className="leading-none">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        {requestType === 'D2C' ? (
                            <SearchableSelect
                                label="Client Code"
                                placeholder="Select Client Code"
                                items={clientCodes}
                                value={selectedClientCode}
                                onChange={setSelectedClientCode}
                                required
                            />
                        ) : (
                            <div className="relative">
                                <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                    Patron Name
                                </label>

                                <input
                                    type="text"
                                    className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                                    placeholder="Enter Patron Name"
                                    value={patronName}
                                    onChange={(e) => {
                                        setPatronName(e.target.value);
                                        setShowPatronSuggestions(true);
                                        setSuggestionIndex(-1);
                                    }}
                                    onFocus={() => setShowPatronSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowPatronSuggestions(false), 150)}
                                    onKeyDown={(e) => {
                                        const filtered = allPatronNames.filter(n =>
                                            n.value.toLowerCase().includes((patronName || '').toLowerCase())
                                        ).slice(0, 50);

                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setSuggestionIndex(idx => Math.min((idx >= 0 ? idx + 1 : 0), filtered.length - 1));
                                            return;
                                        }
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setSuggestionIndex(idx => Math.max(idx - 1, 0));
                                            return;
                                        }
                                        if (e.key === 'Enter') {
                                            if (suggestionIndex >= 0 && filtered[suggestionIndex]) {
                                                e.preventDefault();
                                                setPatronName(filtered[suggestionIndex].value);
                                                setShowPatronSuggestions(false);
                                                setSuggestionIndex(-1);
                                            }
                                        }
                                        if (e.key === 'Escape') {
                                            setShowPatronSuggestions(false);
                                            setSuggestionIndex(-1);
                                        }
                                    }}
                                />

                                {showPatronSuggestions && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-[#ECECEC] rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.08)] max-h-48 sm:max-h-56 overflow-auto">
                                        {allPatronNames.filter(n =>
                                            n.value.toLowerCase().includes((patronName || '').toLowerCase())
                                        ).slice(0, 50).map((n, idx) => (
                                            <div
                                                key={n.value}
                                                ref={(el) => (suggestionRefs.current[idx] = el)}
                                                className={`px-3.5 py-2.5 text-sm hover:bg-[#FFF4EE] cursor-pointer ${idx === suggestionIndex ? 'bg-[#FFF4EE]' : ''
                                                    }`}
                                                onMouseDown={(ev) => {
                                                    ev.preventDefault();
                                                    setPatronName(n.value);
                                                    setShowPatronSuggestions(false);
                                                    setSuggestionIndex(-1);
                                                }}
                                            >
                                                {n.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <SimpleSelect
                            label="Task Assigned By"
                            placeholder="Select"
                            items={familyMembers}
                            value={assignedBy}
                            onChange={setAssignedBy}
                        />

                        <SimpleSelect
                            label="Requirement Type"
                            placeholder="Select"
                            items={[
                                { label: 'New', value: 'New' },
                                { label: 'Replacement', value: 'Replacement' }
                            ]}
                            value={requirementType}
                            onChange={setRequirementType}
                            required
                        />

                        <SimpleSelect
                            label="Primary Role"
                            placeholder="Select"
                            items={primaryRoles}
                            value={selectedPrimaryRole}
                            onChange={setSelectedPrimaryRole}
                            required
                        />

                        <RoleSpecificFields
                            selectedPrimaryRole={selectedPrimaryRole}
                            fields={roleSpecificFields}
                            setFields={setRoleSpecificFields}
                        />

                        <SimpleSelect
                            label="Ethnicity Preference"
                            placeholder="Select"
                            items={ethnicities}
                            value={selectedEthnicity}
                            onChange={setSelectedEthnicity}
                        />

                        <SimpleSelect
                            label="Gender"
                            placeholder="Select"
                            items={[
                                { label: 'Male', value: 'Male' },
                                { label: 'Female', value: 'Female' },
                                { label: 'Other', value: 'Other' }
                            ]}
                            value={gender}
                            onChange={setGender}
                        />

                        <SearchableSelect
                            label="Language"
                            placeholder="Select languages"
                            items={languages}
                            value={selectedLanguage}
                            onChange={setSelectedLanguage}
                            multiple
                        />

                        <SimpleSelect
                            label="Working Hours"
                            placeholder="Select"
                            items={workingHourOptions.map((x) => ({ label: x, value: x }))}
                            value={workingHours}
                            onChange={setWorkingHours}
                            required
                        />

                        <div className="md:col-span-1">
                            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                Salary / Salary Range
                            </label>
                            <input
                                type="text"
                                className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                                placeholder="e.g. 18,000 - 22,000"
                                value={salaryRange}
                                onChange={(e) => setSalaryRange(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                Request Open Date
                            </label>
                            <input
                                type="date"
                                className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                                value={requestOpenDate}
                                onChange={(e) => setRequestOpenDate(e.target.value)}
                            />
                        </div>
                        
                        <div className="md:col-span-1">
  <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
    Request Due Date
  </label>
  <input
    type="datetime-local"
    className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 text-sm text-[#313131] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23]"
    value={taskDueDate}
    onChange={(e) => setTaskDueDate(e.target.value)}
  />
</div>

                        <SimpleSelect
                            label="Client's Address"
                            placeholder="Select"
                            items={[
                                { label: "Client's Registered Address", value: 'registered' },
                                { label: 'Other', value: 'other' }
                            ]}
                            value={addressMode}
                            onChange={(v) => setAddressMode(v)}
                            required
                        />

                        <div className="md:col-span-2">
                            {addressMode === 'registered' ? (
                                <textarea
                                    className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-5.5 py-3.5 min-h-26 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                                    placeholder="Address"
                                    value={registeredAddress}
                                    readOnly
                                />
                            ) : (
                                <textarea
                                    className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 min-h-24 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                                    placeholder="Type address"
                                    value={otherAddress}
                                    onChange={(e) => setOtherAddress(e.target.value)}
                                />
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                Scope of Work in Detail
                            </label>
                            <textarea
                                className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 min-h-28 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                                placeholder="Describe the work scope"
                                value={scopeOfWork}
                                onChange={(e) => setScopeOfWork(e.target.value)}
                                required
                            />
                        </div>

                        <SimpleSelect
                            label="Advance Payment Received"
                            placeholder="Select"
                            items={[
                                { label: 'Yes', value: 'Yes' },
                                { label: 'No', value: 'No' },
                                { label: 'Not Applicable', value: 'Not Applicable' }
                            ]}
                            value={advancePaymentReceived}
                            onChange={setAdvancePaymentReceived}
                            required
                        />

                        {advancePaymentReceived === 'Yes' && (
                            <div className="md:col-span-2 flex flex-col items-center">
                                <label className="block text-[11px] font-semibold mb-3 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                    Upload Advance Payment Proof
                                </label>
                                <div className="border-2 border-dashed border-[#E6E6E6] rounded-2xl p-5 flex flex-col items-center justify-center bg-[#F9F9F9] w-full">
                                    <UploadCloud className="w-6 sm:w-7 h-6 sm:h-7 text-[#F36A23] mb-3" />
                                    <p className="text-xs sm:text-sm text-[#4B4B4B] mb-3 text-center px-2">
                                        Drag & drop files here, or click to browse
                                    </p>
                                    <label className="inline-flex items-center gap-2 bg-[#F36A23] text-white px-4 py-2.5 rounded-full cursor-pointer hover:bg-[#e05f1d] text-sm font-semibold shadow-sm">
                                        <UploadCloud className="w-4 h-4" />
                                        <span>Select Files</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => onUploadFiles(Array.from(e.target.files || []))}
                                        />
                                    </label>
                                    {uploading && (
                                        <span className="text-xs sm:text-sm text-[#6B6B6B] mt-2">
                                            Uploading...
                                        </span>
                                    )}
                                </div>

                                {uploadedFiles.length > 0 && (
                                    <ul className="mt-3 space-y-2 w-full">
                                        {uploadedFiles.map((f, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center justify-between bg-white border border-[#EDEDED] rounded-xl px-3 py-2 text-xs sm:text-sm shadow-[0_4px_18px_rgba(0,0,0,0.04)]"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <FileText className="w-4 h-4 text-[#7A7A7A] flex-shrink-0" />
                                                    <a
                                                        className="text-[#F36A23] underline truncate"
                                                        href={f.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {f.name}
                                                    </a>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="p-1 hover:bg-[#F3F3F3] rounded-full flex-shrink-0 ml-2"
                                                    onClick={async () => {
                                                        try {
                                                            if (f.path) await deleteObject(storageRef(storage, f.path));
                                                        } catch (e) { }
                                                        setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
                                                    }}
                                                    aria-label="Remove file"
                                                >
                                                    <X className="w-4 h-4 text-[#7A7A7A]" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-2 flex justify-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 border border-[#E6E6E6] rounded-full text-sm font-semibold text-[#4C4C4C] hover:bg-[#F4F4F4]"
                        >
                            Cancel
                        </button>
                        {/* <button
                            onClick={onCreateTask}
                            className="px-6 py-2.5 bg-[#F36A23] text-white rounded-full text-sm font-semibold shadow-[0_8px_24px_rgba(243,106,35,0.35)] hover:bg-[#e45f1d] transition-colors"
                        >
                            Create Requirement
                        </button> */}
                        <button
  onClick={onCreateTask}
  disabled={isSubmitting}
  className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
    isSubmitting
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-[#F36A23] hover:bg-[#e45f1d] text-white shadow-[0_8px_24px_rgba(243,106,35,0.35)]'
  }`}
>
  {isSubmitting ? 'Creating...' : 'Create Requirement'}
</button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F0F10]/40 backdrop-blur-[2px] flex items-center justify-center p-4">
            {content}
            <style jsx>{`
                .cc-form label {
                    color: #8a8a8a;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }
                .cc-form input,
                .cc-form select,
                .cc-form textarea {
                    transition: all 0.2s ease;
                }
            `}</style>
        </div>
    );
}