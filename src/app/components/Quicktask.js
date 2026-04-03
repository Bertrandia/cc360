'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    Timestamp,
    addDoc,
    updateDoc
} from 'firebase/firestore';
import { Plus, Minus, X } from 'lucide-react';
import { triggerSnackbar } from '../components/snakbar';

const fontStyle = { fontFamily: 'NeuzeitGro, "Inter", sans-serif' };

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

// Searchable Select Component
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
                    className="w-full text-left border border-gray-300 bg-gray-50 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-between"
                >
                    <span>{selectedLabel || placeholder}</span>
                    <span className="text-gray-400">▾</span>
                </button>

                {open && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                        <ul className="max-h-56 overflow-auto">
                            {(items || []).map((it, idx) => {
                                const val = it?.value ?? it;
                                const lab = it?.label ?? it;
                                const highlighted = idx === highlightIndex;
                                return (
                                    <li
                                        key={`${idx}-${String(val)}`}
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


export default function QuickTaskDialog({ open, onClose, onSuccess, currentUserEmail }) {
    const { user } = useAuth();

    // ✅ CHANGE 1: Add purpose field
    const [purpose, setPurpose] = useState('');
    const [requestType, setRequestType] = useState('D2C');

    // ✅ CHANGE 2: All patrons (not filtered)
    const [allPatronNames, setAllPatronNames] = useState([]);
    const [patronName, setPatronName] = useState('');

    // Fetched dropdown data from Firebase
    const [natureOfRequirements, setNatureOfRequirements] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [citiesOfService, setCitiesOfService] = useState([]);

    // Form fields
    const [natureOfRequirement, setNatureOfRequirement] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [tag, setTag] = useState('');
    const [recurringService, setRecurringService] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [recurringCounter, setRecurringCounter] = useState(1);
    const [cityOfService, setCityOfService] = useState('');
    const [addressMode, setAddressMode] = useState('registered');
    const [registeredAddress, setRegisteredAddress] = useState('');
    const [otherAddress, setOtherAddress] = useState('');
    const [selectedPreferences, setSelectedPreferences] = useState([]);
    const [currentUserDisplayName, setCurrentUserDisplayName] = useState("");


    const [scopeOfDetail, setScopeOfDetail] = useState('');

    // Load all master data from Firebase on open
    useEffect(() => {
        if (!open) return;
        const loadMasterData = async () => {
            try {
                const [
                    norSnap,
                    catSnap,
                    citySnap,
                    prefSnap,
                    pkgSnap,
                    orgPkgSnap,
                    mstSnap,
                    odSnap,
                    patronSnap
                ] = await Promise.all([
                    getDocs(collection(db, 'patronOTS-NatureofRequirement')),
                    getDocs(collection(db, 'd2cExpenseCategory')),
                    getDocs(collection(db, 'patronOTS-Location')),
                    getDocs(collection(db, 'patronYcwHelps')),
                    getDocs(collection(db, 'patronOtsPackageType')),
                    getDocs(collection(db, 'patronOTS-Organization-TypeofPackage')),
                    getDocs(collection(db, 'patronOTS-MST-GDR-TypeofPackage')),
                    getDocs(collection(db, 'patronOTS-OD-TypeofPackage')),
                    getDocs(collection(db, 'addPatronDetails'))
                ]);

                const norList = [];
                norSnap.forEach((d) => { const val = d.data()?.natureOfRequirement; if (val) norList.push({ label: val, value: val }); });
                setNatureOfRequirements(norList);

                const catList = [];
                catSnap.forEach((d) => {
                    const data = d.data();
                    if (data?.categoryName) catList.push({ label: data.categoryName, value: data.categoryName });
                });
                setCategories(Array.from(new Map(catList.map(c => [c.value, c])).values()));

                const cityList = [];
                citySnap.forEach((d) => { const val = d.data()?.cityOfService; if (val) cityList.push({ label: val, value: val }); });
                setCitiesOfService(cityList);


                // ✅ Load ALL patron names (no filtering)
                const patronNames = [];
                patronSnap.forEach((d) => {
                    const name = d.data()?.patronName;
                    if (name) patronNames.push({ label: name, value: name });
                });
                setAllPatronNames(Array.from(new Map(patronNames.map(p => [p.value, p])).values()));

            } catch (error) {
                console.error('Error loading master data:', error);
                triggerSnackbar('Failed to load form data', 'error');
            }
        };

        loadMasterData();
    }, [open]);

    // Load subcategories when category changes
    useEffect(() => {
        const loadSubCategories = async () => {
            if (!category) {
                setSubCategories([]);
                setSubCategory('');
                setTags([]);
                setTag('');
                return;
            }

            try {
                const q = query(
                    collection(db, 'd2cExpenseSubCategory'),
                    where('categoryName', '==', category)
                );
                const snap = await getDocs(q);

                const subCatList = [];
                snap.forEach((d) => {
                    const data = d.data();
                    if (data?.subCategoryName) {
                        subCatList.push({ label: data.subCategoryName, value: data.subCategoryName });
                    }
                });

                setSubCategories(Array.from(new Map(subCatList.map(c => [c.value, c])).values()));
                setSubCategory('');
                setTags([]);
                setTag('');
            } catch (error) {
                console.error('Error loading subcategories:', error);
                setSubCategories([]);
            }
        };

        loadSubCategories();
    }, [category]);

    // Load tags when subcategory changes
    useEffect(() => {
        const loadTags = async () => {
            if (!subCategory) {
                setTags([]);
                setTag('');
                return;
            }

            try {
                const q = query(
                    collection(db, 'd2cCategoryTagsNameList'),
                    where('subCategoryName', '==', subCategory)
                );
                const snap = await getDocs(q);

                const tagList = [];
                snap.forEach((d) => {
                    const data = d.data();
                    if (data?.categoryTagName) {
                        tagList.push({ label: data.categoryTagName, value: data.categoryTagName });
                    }
                });

                setTags(Array.from(new Map(tagList.map(c => [c.value, c])).values()));
                setTag('');
            } catch (error) {
                console.error('Error loading tags:', error);
                setTags([]);
            }
        };

        loadTags();
    }, [subCategory]);

    // Load address when patron name changes
    useEffect(() => {
        const loadAddress = async () => {
            if (!patronName) {
                setRegisteredAddress('');
                return;
            }

            try {
                const q = query(
                    collection(db, 'addPatronDetails'),
                    where('patronName', '==', patronName)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    setRegisteredAddress(data?.billingAddress || '');
                }
            } catch (error) {
                console.error('Error loading address:', error);
            }
        };

        loadAddress();
    }, [patronName]);

    const fetchCurrentUserDetails = async () => {
        try {
            const auth = getAuth(app);

            // Wait for auth state to be ready
            return new Promise((resolve) => {
                const unsubscribe = auth.onAuthStateChanged(async (user) => {
                    unsubscribe(); // Unsubscribe after first call

                    if (!user) {
                        console.error("No user logged in");
                        triggerSnackbar("Please log in to access the dashboard", "error");
                        // Optionally redirect to login page
                        // router.push('/login');
                        resolve();
                        return;
                    }

                    const email = user.email;
                    setCurrentUserEmail(email);

                    // Fetch user details from "user" collection
                    const userCollectionRef = collection(db, "user");
                    const userQuery = query(userCollectionRef, where("email", "==", email));
                    const userSnapshot = await getDocs(userQuery);

                    if (!userSnapshot.empty) {
                        const userData = userSnapshot.docs[0].data();
                        const displayName = userData.display_name || "";
                        const supplyRole = userData.supplyRole || "";

                        setCurrentUserDisplayName(displayName);
                        setCurrentUserSupplyRole(supplyRole);

                        // Check if admin or specific email
                        const isAdminUser = supplyRole.toLowerCase() === "admin" || email === "sohail@carecrew.in";
                        setIsAdmin(isAdminUser);
                    } else {
                        console.error("User document not found in database");
                        triggerSnackbar("User profile not found", "error");
                    }

                    resolve();
                });
            });
        } catch (error) {
            console.error("Error fetching user details:", error);
            triggerSnackbar("Error loading user details: " + error.message, "error");
        }
    };


    const onCreateQuickTask = async () => {
        try {
            if (!purpose || !natureOfRequirement) {
                triggerSnackbar('Please fill all required fields: Purpose, Nature of Requirement', 'error');
                return;
            }

            if (recurringService && startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (end < start) {
                    triggerSnackbar('End date cannot be earlier than start date', 'error');
                    return;
                }
            }

            // Get patron data if selected
            let patronDocId = '';
            let patronData = null;
            let patronRef = null;

            if (patronName) {
                const qPat = query(collection(db, 'addPatronDetails'), where('patronName', '==', patronName.trim()));
                const snap = await getDocs(qPat);
                if (!snap.empty) {
                    patronDocId = snap.docs[0].id;
                    patronData = snap.docs[0].data();
                    patronRef = doc(db, 'addPatronDetails', patronDocId);
                }
            }

            // Get LM details from current user
            let assignedLMName = '';
            let lmNumber = '';
            let lmRef = '';

            if (user?.email) {
                const qUser = query(collection(db, 'user'), where('email', '==', user.email));
                const uSnap = await getDocs(qUser);
                if (!uSnap.empty) {
                    const data = uSnap.docs[0].data();
                    assignedLMName = data?.display_name || '';
                    lmNumber = data?.phone_number || '';
                }
            }

            const now = new Date();
            const createdAt = Timestamp.fromDate(now);
            const taskRecievedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const patronCity = patronData?.city || cityOfService || '';
            const patronAddress = patronName ? (addressMode === 'registered' ? registeredAddress : otherAddress) : '';
            const patronID = patronData?.patronBusinessID || '';
            const patronNameResolved = patronName || purpose.trim();
            const backupLmName = patronData?.backupLmName || '';
            const backupLmRef = patronData?.backupLmRef || '';

            // Generate service code
            let serviceCode = '';
            try {
                const primaryRoleQuery = query(
                    collection(db, 'patronOTS-NatureofRequirement'),
                    where('natureOfRequirement', '==', natureOfRequirement)
                );
                const roleSnapshot = await getDocs(primaryRoleQuery);

                if (!roleSnapshot.empty) {
                    const roleDoc = roleSnapshot.docs[0];
                    const roleData = roleDoc.data();
                    const code = roleData.code || '';
                    const currentCount = roleData.NoOfRequirements || 0;

                    serviceCode = `${code}${currentCount + 1}`;

                    const roleDocRef = doc(db, 'patronOTS-NatureofRequirement', roleDoc.id);
                    await updateDoc(roleDocRef, {
                        NoOfRequirements: currentCount + 1
                    });
                }
            } catch (error) {
                console.error('Error generating serviceCode:', error);
            }

            const monthName = now.toLocaleString('default', { month: 'long' });

            const taskID = generateTaskID(
                patronName || purpose,
                category || 'OTS',
                now,
                subCategory || 'Service'
            );

            const taskStartTimestamp = startTime
                ? Timestamp.fromDate(new Date(`${startDate}T${startTime}`))
                : null;
            const taskEndTimestamp = endTime
                ? Timestamp.fromDate(new Date(`${endDate}T${endTime}`))
                : null;

            let assignedByName = '';
            if (currentUserEmail) {
                const qUser = query(collection(db, 'user'), where('email', '==', currentUserEmail));
                const uSnap = await getDocs(qUser);
                if (!uSnap.empty) {
                    assignedByName = uSnap.docs[0].data()?.display_name || '';
                }
            }

            const taskPayload = {
                purpose: purpose,
                isQuickTask: true,
                quickTaskAssignedTo: assignedByName || '',
                assignedBy: assignedByName || '',
                assignedLMName: assignedLMName || '',
                createdAt,
                createdBy: assignedByName || '',
                lmNumber: lmNumber || '',
                lmRef: lmRef || '',
                lmStartTime: createdAt || '',
                location: patronCity || '',
                patronAddress: patronAddress || '',
                patronCity: patronCity || '',
                clientCode: patronID || '',
                patronID: patronID || '',
                patronRef: patronRef,
                taskAssignDate: createdAt,
                taskCategory: 'OTS',
                taskType: 'OTS',
                isCockpitTaskCreated: false,
                isDelayed: false,
                isOTSTask: true,
                isTaskDisabled: false,
                isQuickTask: true,
                requestType,
                taskDate: createdAt,
                taskDescription: scopeOfDetail || '',
                taskOwner: assignedByName || '',
                taskRecievedTime,
                taskStartTime: taskStartTimestamp,
                taskEndTime: taskEndTimestamp,
                adminStartTime: taskStartTimestamp,
                adminEndTime: taskEndTimestamp,
                month: monthName || '',
                taskStatusCategory: 'To be Started',
                natureOfRequirement: natureOfRequirement || '',
                category: category || '',
                subCategory: subCategory || '',
                status: 'Pending',
                priority: 'Medium',
                billingModel: 'Billable',
                lastComment: "Task has been created",
                taskInProcessDate: createdAt,
                tag: tag || '',
                recurringService: recurringService || '',
                cityOfService: cityOfService || '',
                serviceLocation: addressMode || '',
                scopeOfDetail: scopeOfDetail || '',
                // requestID: requestID || '',
                taskID: taskID || '',
                backupLmName: backupLmName,
                backupLmRef: backupLmRef
            };

            if (recurringService) {
                const startDateTime = `${startDate} ${startTime}`;
                const endDateTime = `${endDate} ${endTime}`;
                taskPayload.recurringStartDateTime = startDateTime;
                taskPayload.recurringEndDateTime = endDateTime;

                if (recurringService === 'Yes') {
                    taskPayload.intervalDays = recurringCounter;
                }
            }

            const taskOccurrences = [];

            if (recurringService && startDate && endDate) {
                const start = new Date(`${startDate}T${startTime || '00:00'}`);
                const end = new Date(`${endDate}T${endTime || '23:59'}`);

                if (recurringService === 'Yes') {
                    let currentDate = new Date(start);
                    let count = 0;

                    while (currentDate <= end) {
                        taskOccurrences.push({
                            date: new Date(currentDate),
                            timestamp: Timestamp.fromDate(new Date(currentDate)),
                            occurrenceNumber: count + 1
                        });

                        currentDate.setDate(currentDate.getDate() + recurringCounter);
                        count++;
                    }
                } else {
                    taskOccurrences.push({
                        date: start,
                        timestamp: Timestamp.fromDate(start),
                        occurrenceNumber: 1
                    });
                }
            } else {
                taskOccurrences.push({
                    date: new Date(),
                    timestamp: Timestamp.fromDate(new Date()),
                    occurrenceNumber: 1
                });
            }

            // const taskRef = await addDoc(collection(db, 'createTaskCollection'), taskPayload);

            const addRequestRefs = [];

            for (const occurrence of taskOccurrences) {
                const otsRequestPayload = {
                    ...taskPayload,
                    taskDate: occurrence.timestamp,
                    occurrenceNumber: occurrence.occurrenceNumber,
                    totalOccurrences: taskOccurrences.length,
                    isExpand: false,
                    mainTaskRef: '',
                    serviceCode: serviceCode || '',
                    otsPreferences: selectedPreferences || [],
                    patronName: patronNameResolved,
                };

                const otsRef = await addDoc(collection(db, 'patronOtsAddRequest'), otsRequestPayload);
                addRequestRefs.push(otsRef.id);
            }

            // Now create the task with the first addRequestRef
            const addRequestRef = addRequestRefs[0];
            const associateRef = doc(db, 'patronOtsAddRequest', addRequestRef);

            const taskPayloadWithRef = {
                ...taskPayload,
                associateRef: associateRef, // Add this field
                partonName: patronNameResolved,
            };

            const taskRef = await addDoc(collection(db, 'createTaskCollection'), taskPayloadWithRef);

            // Update all patronOtsAddRequest documents with mainTaskRef
            for (const otsId of addRequestRefs) {
                await updateDoc(doc(db, 'patronOtsAddRequest', otsId), {
                    mainTaskRef: taskRef.id,
                });
            }



            triggerSnackbar(`Task successfully created! ${taskOccurrences.length} occurrence(s) saved.`);
            onSuccess?.();
            onClose?.();
        } catch (err) {
            console.error('Failed to create task:', err);
            triggerSnackbar('Failed to create task. Please try again.');
        }
    };

    if (!open) return null;

    const content = (
        <div
            className="cc-modal-card w-full max-w-[540px] bg-white rounded-2xl border border-[#EFEFEF] shadow-[0_18px_60px_rgba(0,0,0,0.12)] max-h-[95vh] overflow-hidden flex flex-col"
            style={fontStyle}
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0] bg-white/80 backdrop-blur-sm">
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-[20px] font-semibold text-[#2C2C2C] tracking-tight">Quick Form</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[#F2F2F2] rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4 text-[#6F6F6F]" />
                        </button>
                    </div>

                </div>
            </div>

            <div className="cc-form flex-1 overflow-y-auto px-5 pb-6 pt-4 bg-[#F7F7F7]">
                <div className="bg-white rounded-2xl border border-[#F0F0F0] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        <span className="text-sm font-semibold text-[#4C4C4C]">Request Type</span>
                        <div className="flex gap-4 flex-wrap">
                            {['D2C', 'Non-D2C'].map((type) => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer text-sm text-[#3C3C3C]">
                                    <input
                                        type="radio"
                                        name="requestType"
                                        checked={requestType === type}
                                        onChange={() => setRequestType(type)}
                                        className="h-4 w-4 rounded-full border border-[#CFCFCF] text-[#F36A23] focus:ring-[#F36A23]"
                                    />
                                    <span className="leading-none">
                                        {type === 'D2C' ? 'D2C Customer' : 'Non - D2C Customer'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">
                                Task Purpose <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                placeholder="Enter task purpose"
                                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                        </div>

                        <SearchableSelect
                            label="Patron Name (Optional)"
                            placeholder="Select Patron (if needed)"
                            items={allPatronNames}
                            value={patronName}
                            onChange={setPatronName}
                        />

                        <SimpleSelect
                            label="Nature of Requirement"
                            placeholder="Select"
                            items={natureOfRequirements}
                            value={natureOfRequirement}
                            onChange={setNatureOfRequirement}
                            required
                        />

                        <SearchableSelect
                            label="Select Category"
                            placeholder="Select"
                            items={categories}
                            value={category}
                            onChange={setCategory}
                            required
                        />

                        <SearchableSelect
                            label="Select SubCategory"
                            placeholder="Select"
                            items={subCategories}
                            value={subCategory}
                            onChange={setSubCategory}
                            required
                        />

                        <SearchableSelect
                            label="Select Tag"
                            placeholder="Select"
                            items={tags}
                            value={tag}
                            onChange={setTag}
                            required
                        />


                        <SimpleSelect
                            label="Recurring Service"
                            placeholder="Select"
                            items={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]}
                            value={recurringService}
                            onChange={setRecurringService}
                            required
                        />

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                Task Start Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                                Task End Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                            />
                        </div>
                    </div>

                    {recurringService === 'Yes' && (
                        <div className="flex items-center gap-4 mt-2 p-4 bg-[#F9F9F9] border border-[#EDEDED] rounded-2xl">
                            <span className="text-sm font-semibold text-[#4C4C4C]">Recurrence Frequency:</span>
                            <button
                                type="button"
                                onClick={() => setRecurringCounter(Math.max(1, recurringCounter - 1))}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#E6E6E6] hover:border-[#F36A23]/60 transition-colors shadow-[0_3px_10px_rgba(0,0,0,0.06)]"
                            >
                                <Minus className="w-4 h-4 text-[#5A5A5A]" />
                            </button>
                            <span className="text-xl font-bold text-[#F36A23] min-w-[3rem] text-center">{recurringCounter}</span>
                            <button
                                type="button"
                                onClick={() => setRecurringCounter(recurringCounter + 1)}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#E6E6E6] hover:border-[#F36A23]/60 transition-colors shadow-[0_3px_10px_rgba(0,0,0,0.06)]"
                            >
                                <Plus className="w-4 h-4 text-[#5A5A5A]" />
                            </button>
                            <span className="text-xs text-[#7A7A7A] ml-2">
                                (1 = Daily, 2 = Every other day, 3 = Every 2 days, etc.)
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <SimpleSelect
                            label="City of Service"
                            placeholder="Select"
                            items={citiesOfService}
                            value={cityOfService}
                            onChange={setCityOfService}
                            required
                        />

                        <SimpleSelect
                            label="Service Location"
                            placeholder="Select"
                            items={[
                                { label: "Client's Registered Address", value: 'registered' },
                                { label: 'Other', value: 'other' }
                            ]}
                            value={addressMode}
                            onChange={setAddressMode}
                            required
                        />

                        <div className="md:col-span-2 xl:col-span-1">
                            {addressMode === 'registered' ? (
                                <div>
                                    <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">Address</label>
                                    <textarea
                                        className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 min-h-[88px] text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                                        value={registeredAddress}
                                        readOnly
                                        placeholder="Client's registered address will appear here"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">Address</label>
                                    <textarea
                                        className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 min-h-[88px] text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                                        placeholder="Enter address"
                                        value={otherAddress}
                                        onChange={(e) => setOtherAddress(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>



                    <div>
                        <label className="block text-[11px] font-semibold mb-2 uppercase tracking-[0.04em] text-[#8A8A8A]">
                            Scope of Work in Detail <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full border border-[#E6E6E6] bg-[#F6F6F6] rounded-xl px-3.5 py-2.5 min-h-[120px] text-sm text-[#313131] placeholder:text-[#A8A8A8] focus:outline-none focus:ring-2 focus:ring-[#F36A23]/70 focus:border-[#F36A23] transition-all"
                            placeholder="Describe the work scope in detail"
                            value={scopeOfDetail}
                            onChange={(e) => setScopeOfDetail(e.target.value)}
                        />
                    </div>

                    <div className="pt-2 flex justify-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 border border-[#E6E6E6] rounded-full text-sm font-semibold text-[#4C4C4C] hover:bg-[#F4F4F4]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onCreateQuickTask}
                            className="px-6 py-2.5 bg-[#F36A23] text-white rounded-full text-sm font-semibold shadow-[0_8px_24px_rgba(243,106,35,0.35)] hover:bg-[#e45f1d] transition-colors"
                        >
                            Create Requirement
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
                .cc-form .room-counter {
                    color: #2c2c2c;
                }
            `}</style>
        </div>
    );
}

