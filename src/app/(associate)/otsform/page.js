'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Nav from '../../components/navbar';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    Timestamp,
    addDoc
} from 'firebase/firestore';
import { Plus, Minus } from 'lucide-react';
import Snackbar, { triggerSnackbar } from '../../components/snakbar';
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
                    if (current.includes(val)) {
                        onChange(current.filter((v) => v !== val));
                    } else {
                        onChange([...current, val]);
                    }
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

// Room Counter Component
function RoomCounter({ label, value, onChange }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((num) => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => onChange(num)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors ${value === num
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-gray-300 text-gray-600 hover:border-orange-300'
                            }`}
                    >
                        {num}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function OTSFormPage() {
    const { user } = useAuth();

    const [requestType, setRequestType] = useState('D2C');

    // D2C specific - Client Codes
    const [clientCodes, setClientCodes] = useState([]);
    const [selectedClientCode, setSelectedClientCode] = useState('');

    // Non-D2C specific - Patron Names
    const [allPatronNames, setAllPatronNames] = useState([]);
    const [patronName, setPatronName] = useState('');


    // Fetched dropdown data from Firebase
    const [natureOfRequirements, setNatureOfRequirements] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [citiesOfService, setCitiesOfService] = useState([]);
    const [preferences, setPreferences] = useState([]);
    const [packageTypes, setPackageTypes] = useState([]);
    const [wardPackageTypes, setWardPackageTypes] = useState([]);
    const [mstPackages, setMstPackages] = useState([]);
    const [odPackages, setOdPackages] = useState([]);

    // Form fields
    const [natureOfRequirement, setNatureOfRequirement] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [tag, setTag] = useState('');
    const [taskAssignedBy, setTaskAssignedBy] = useState('');
    const [primaryRoles, setPrimaryRoles] = useState([]);
    const [selectedPrimaryRole, setSelectedPrimaryRole] = useState('');
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

    // Conditional fields
    const [bedrooms, setBedrooms] = useState(1);
    const [bathrooms, setBathrooms] = useState(1);
    const [livingDining, setLivingDining] = useState(1);
    const [kitchen, setKitchen] = useState(1);
    const [balcony, setBalcony] = useState(1);
    const [houseHelp, setHouseHelp] = useState(1);
    const [terrace, setTerrace] = useState(1);
    const [staircase, setStaircase] = useState(1);

    const [closet, setCloset] = useState(1);
    const [wardKitchen, setWardKitchen] = useState(1);
    const [storageRoom, setStorageRoom] = useState(1);
    const [library, setLibrary] = useState(1);
    const [otherSpaces, setOtherSpaces] = useState(1);
    const [packageType, setPackageType] = useState('');
    const [wardPackageType, setWardPackageType] = useState('');
    const [estimatedDays, setEstimatedDays] = useState('');
    const [lmSize, setLmSize] = useState('');
    const [hkSize, setHkSize] = useState('');
    const [houseType, setHouseType] = useState('');
    const [mstPackage, setMstPackage] = useState('');
    const [odPackage, setOdPackage] = useState('');
    const [scopeOfDetail, setScopeOfDetail] = useState('');

    // Load all master data from Firebase on component mount
    useEffect(() => {
        const loadMasterData = async () => {
            try {
                // 1. Nature of Requirement - from patronOTS-NatureOfRequirement.natureofRequirement
                const norSnap = await getDocs(collection(db, 'patronOTS-NatureofRequirement'));
                const norList = [];
                norSnap.forEach((d) => {
                    const val = d.data()?.natureOfRequirement;
                    if (val) norList.push({ label: val, value: val });
                });
                setNatureOfRequirements(norList);

                // 2-4. Category, SubCategory, Tag - from d2cExpenseCategory
                const catSnap = await getDocs(collection(db, 'd2cExpenseCategory'));
                const catList = [];
                const subCatSnap = await getDocs(collection(db, 'd2cExpenseSubCategory'));
                const subCatList = [];
                const tagSnap = await getDocs(collection(db, 'd2cCategoryTagsNameList'));
                const tagList = [];
                catSnap.forEach((d) => {
                    const data = d.data();
                    // Category from categoryName
                    if (data?.categoryName) {
                        catList.push({ label: data.categoryName, value: data.categoryName });
                    }
                });
                subCatSnap.forEach((d) => {
                    const data = d.data();
                    // SubCategory from categoryTagName
                    if (data?.subCategoryName) {
                        subCatList.push({ label: data.subCategoryName, value: data.subCategoryName });
                    }
                });
                tagSnap.forEach((d) => {
                    // Tag also from categoryTagName
                    const data = d.data();
                    if (data?.categoryTagName) {
                        tagList.push({ label: data.categoryTagName, value: data.categoryTagName });
                    }
                });

                const roleSnap = await getDocs(collection(db, 'patronPrimaryRole'));
                const roles = [];
                roleSnap.forEach((d) => {
                    const v = d.data()?.primaryRole;
                    if (v) roles.push({ label: v, value: v });
                });
                setPrimaryRoles(roles);


                // Remove duplicates
                setCategories(Array.from(new Map(catList.map(c => [c.value, c])).values()));
                setSubCategories(Array.from(new Map(subCatList.map(c => [c.value, c])).values()));
                setTags(Array.from(new Map(tagList.map(c => [c.value, c])).values()));

                // 5. Task Assigned By - from patronFamilyMembers.name
                const famSnap = await getDocs(collection(db, 'patronFamilyMembers'));
                const famList = [];
                famSnap.forEach((d) => {
                    const val = d.data()?.name || d.data()?.Name;
                    if (val) famList.push({ label: val, value: val });
                });
                setFamilyMembers(famList);

                // 7. City of Service - from patronOTS-Location.cityOfService
                const citySnap = await getDocs(collection(db, 'patronOTS-Location'));
                const cityList = [];
                citySnap.forEach((d) => {
                    const val = d.data()?.cityOfService;
                    if (val) cityList.push({ label: val, value: val });
                });
                setCitiesOfService(cityList);

                // 9. Preferences - from patronYcwHelps.name
                const prefSnap = await getDocs(collection(db, 'patronYcwHelps'));
                const prefList = [];
                prefSnap.forEach((d) => {
                    const val = d.data()?.name;
                    if (val) prefList.push({ label: val, value: val });
                });
                setPreferences(prefList);

                // 12. Package Type - from patronOTS-Organization-TypeOfPackage.organizationTypeofPackage
                const pkgSnap = await getDocs(collection(db, 'patronOtsPackageType'));
                const pkgList = [];
                pkgSnap.forEach((d) => {
                    const val = d.data()?.typeOfPackage;
                    if (val) pkgList.push({ label: val, value: val });
                });
                setPackageTypes(pkgList);

                // 13. Package Type - from patronOTS-Organization-TypeOfPackage.organizationTypeofPackage
                const orgPkgSnap = await getDocs(collection(db, 'patronOTS-Organization-TypeOfPackage'));
                const orgPkgList = [];
                orgPkgSnap.forEach((d) => {
                    const val = d.data()?.organizationTypeofPackage;
                    if (val) orgPkgList.push({ label: val, value: val });
                });
                setWardPackageTypes(orgPkgList);

                // 15. MST/GDR Package - from patronOTS-MST-GDR-TypeOfPackage.mst_gdr_TypeOfPackage
                const mstSnap = await getDocs(collection(db, 'patronOTS-MST-GDR-TypeOfPackage'));
                const mstList = [];
                mstSnap.forEach((d) => {
                    const val = d.data()?.mst_gdr_TypeOfPackage;
                    if (val) mstList.push({ label: val, value: val });
                });
                setMstPackages(mstList);

                // 16. OD Package - from patronOTS-OD-TypeOfPackage.od_TypeOfPackage
                const odSnap = await getDocs(collection(db, 'patronOTS-OD-TypeOfPackage'));
                const odList = [];
                odSnap.forEach((d) => {
                    const val = d.data()?.od_TypeOfPackage;
                    if (val) odList.push({ label: val, value: val });
                });
                setOdPackages(odList);

                // Client Codes and Patron Names - from addPatronDetails
                const patronSnap = await getDocs(collection(db, 'addPatronDetails'));
                const ccList = [];
                const pnList = [];

                patronSnap.forEach((d) => {
                    const data = d.data();
                    // Client Code from patronBusinessID
                    if (data?.patronBusinessID) {
                        ccList.push({ label: data.patronBusinessID, value: data.patronBusinessID, id: d.id });
                    }
                    // Patron Name from patronName
                    if (data?.patronName) {
                        pnList.push({ label: data.patronName, value: data.patronName, id: d.id });
                    }
                });
                setClientCodes(Array.from(new Map(ccList.map(c => [c.value, c])).values()));
                setAllPatronNames(Array.from(new Map(pnList.map(c => [c.value, c])).values()));

            } catch (error) {
                console.error('Error loading master data:', error);
                console.log('Error loading master data:', error);
                triggerSnackbar('Failed to load form data');
            }
        };

        loadMasterData();
    }, []);

    // Load address when client code or patron name changes
    useEffect(() => {
        const loadAddress = async () => {
            try {
                if (requestType === 'D2C' && selectedClientCode) {
                    const q = query(
                        collection(db, 'addPatronDetails'),
                        where('patronBusinessID', '==', selectedClientCode)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const data = snap.docs[0].data();
                        setRegisteredAddress(data?.billingAddress || '');
                    }
                } else if (requestType === 'Non-D2C' && patronName) {
                    const q = query(
                        collection(db, 'addPatronDetails'),
                        where('patronName', '==', patronName)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const data = snap.docs[0].data();
                        setRegisteredAddress(data?.billingAddress || '');
                    }
                }
            } catch (error) {
                console.error('Error loading address:', error);
            }
        };

        loadAddress();
    }, [selectedClientCode, patronName, requestType]);

    // Determine which conditional fields to show based on Nature of Requirement
    const showDeepCleaningFields = useMemo(() => {
        return ['Deep cleaning'].includes(natureOfRequirement);
    }, [natureOfRequirement]);

    const showWardrobeFields = useMemo(() => {
        return ['Wardrobe/Home organisation'].includes(natureOfRequirement);
    }, [natureOfRequirement]);

    const showMSTFields = useMemo(() => {
        // return natureOfRequirement === 'On-demand MST' || 'On-demand Gardener';
        return ['On-demand MST', 'On-Demand Gardener'].includes(natureOfRequirement);
    }, [natureOfRequirement]);

    const showODFields = useMemo(() => {
        return natureOfRequirement && ['On-demand Home Cook', 'On-demand Housekeeper', 'On-demand Babysitter', 'On-demand Driver', 'On-demand Buttler', 'Errand Runners', 'On-demand Chef'].includes(natureOfRequirement);
    }, [natureOfRequirement]);

    const onCreateTask = async () => {
        try {
            // Validation: Check required fields
            if (!natureOfRequirement || !category || !subCategory || !tag || !scopeOfDetail) {
                triggerSnackbar('Please fill all required fields: Nature of Requirement, Category, SubCategory, Tag, and Scope of Work');
                return;
            }

            // Validation: Date check
            if (recurringService && startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (end < start) {
                    triggerSnackbar('End date cannot be earlier than start date');
                    return;
                }
            }

            // 1) Resolve patron doc by client code (D2C) or patron name (Non-D2C)
            let patronDocId = '';
            let patronData = null;

            if (requestType === 'D2C' && selectedClientCode) {
                const qPat = query(collection(db, 'addPatronDetails'), where('patronBusinessID', '==', selectedClientCode));
                const snap = await getDocs(qPat);
                if (snap.empty) {
                    triggerSnackbar('Client Code not found');
                    return;
                }
                patronDocId = snap.docs[0].id;
                patronData = snap.docs[0].data();
            } else if (requestType === 'Non-D2C' && patronName) {
                const qPat = query(collection(db, 'addPatronDetails'), where('patronName', '==', patronName.trim()));
                const snap = await getDocs(qPat);
                if (snap.empty) {
                    triggerSnackbar('Patron Name not found');
                    return;
                }
                patronDocId = snap.docs[0].id;
                patronData = snap.docs[0].data();
            } else {
                triggerSnackbar('Please select Client Code or Patron Name');
                return;
            }

            // 2) Resolve LM details
            let assignedLMName = '';
            let lmNumber = '';

            if (user?.email) {
                const qUser = query(collection(db, 'user'), where('email', '==', user.email));
                const uSnap = await getDocs(qUser);
                if (!uSnap.empty) {
                    const data = uSnap.docs[0].data();
                    assignedLMName = data?.display_name || '';
                    lmNumber = data?.phone_number || '';
                }
            }

            // 3) Build timestamps
            const now = new Date();
            const createdAt = Timestamp.fromDate(now);
            const taskDate = createdAt;
            const taskAssignDate = createdAt;
            const due = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
            const taskDueDate = Timestamp.fromDate(due);
            const taskReceivedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // 4) Patron details
            const patronCity = patronData?.city || '';
            const patronAddress = addressMode === 'registered' ? registeredAddress : otherAddress;
            const patronID = patronData?.patronBusinessID || '';
            const patronRef = doc(db, 'addPatronDetails', patronDocId);
            const lmRef = patronData?.lmRef || '';
            const patronNameResolved = requestType === 'D2C' ? (patronData?.patronName || '') : patronName;

            // 5) Generate requestID
            const dynamicCode = 'OTS';
            const qCount = await getDocs(collection(db, 'patronOtsAddRequest'));
            const existingCount = qCount.size;

            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const datePart = `${yy}${mm}${dd}`;
            const requestCountPart = (existingCount + 1).toString();
            const requestID = `${datePart}${dynamicCode}${requestCountPart}`;
            const monthName = now.toLocaleString('default', { month: 'long' });

            // 6) Build common task payload for createTaskCollection
            const taskPayload = {
                assignedLMName: assignedLMName || '',
                createdAt,
                createdBy: user?.email || '',
                lmNumber: lmNumber || '',
                lmRef: lmRef || '',
                lmStartTime: createdAt || '',
                location: patronCity || '',
                patronName: patronNameResolved || '',
                patronAddress: patronAddress || '',
                primaryRole: selectedPrimaryRole || '',
                patronCity: patronCity || '',
                clientCode: patronID || '',
                patronID: patronID || '',
                patronRef,
                taskAssignDate,
                taskCategory: 'OTS',
                taskType: 'OTS Request',
                isCockpitTaskCreated: false,
                isDelayed: false,
                isOTSTask: true,
                isTaskDisabled: false,
                taskDate,
                taskDescription: scopeOfDetail || '',
                taskOwner: assignedLMName || '',
                taskReceivedTime,
                taskStartTime: startTime || '',
                taskEndTime: endTime || '',
                month: monthName || '',
                taskStatusCategory: 'To be Started',
                requestType,
                natureOfRequirement: natureOfRequirement || '',
                category: category || '',
                subCategory: subCategory || '',
                status: 'Pending',
                priority: 'Medium',
                billingModel: 'Billable',
                tag: tag || '',
                taskAssignedBy: taskAssignedBy || '',
                recurringService: recurringService || '',
                cityOfService: cityOfService || '',
                serviceLocation: addressMode || '',
                otsPreferences: selectedPreferences || [],
                scopeOfDetail: scopeOfDetail || '',
                requestID: requestID || '',
            };

            // 7) Add recurring fields if applicable
            if (recurringService) {
                const startDateTime = `${startDate} ${startTime}`;
                const endDateTime = `${endDate} ${endTime}`;

                taskPayload.recurringStartDateTime = startDateTime;
                taskPayload.recurringEndDateTime = endDateTime;

                if (recurringService === 'Yes') {
                    taskPayload.intervalDays = recurringCounter;
                }
            }

            // 8) Calculate task occurrences for recurring service
            const taskOccurrences = [];

            if (recurringService && startDate && endDate) {
                const start = new Date(`${startDate}T${startTime || '00:00'}`);
                const end = new Date(`${endDate}T${endTime || '23:59'}`);

                if (recurringService === 'Yes') {
                    // Calculate occurrences based on interval
                    let currentDate = new Date(start);
                    let count = 0;

                    while (currentDate <= end) {
                        taskOccurrences.push({
                            date: new Date(currentDate),
                            timestamp: Timestamp.fromDate(new Date(currentDate)),
                            occurrenceNumber: count + 1
                        });

                        // Add interval days
                        currentDate.setDate(currentDate.getDate() + recurringCounter);
                        count++;
                    }
                } else {
                    // Single occurrence
                    taskOccurrences.push({
                        date: start,
                        timestamp: Timestamp.fromDate(start),
                        occurrenceNumber: 1
                    });
                }
            }

            // 9) Save main task to createTaskCollection
            const taskRef = await addDoc(collection(db, 'createTaskCollection'), taskPayload);
            console.log('Main task created:', taskRef.id);

            // 10) Save individual occurrences to patronOtsAddRequest
            const addRequestRefs = [];

            for (const occurrence of taskOccurrences) {
                const otsRequestPayload = {
                    ...taskPayload,
                    taskDate: occurrence.timestamp,
                    occurrenceNumber: occurrence.occurrenceNumber,
                    totalOccurrences: taskOccurrences.length,
                    isExpand: false,
                    mainTaskRef: taskRef.id,
                    primaryRole: selectedPrimaryRole || '',
                };

                const otsRef = await addDoc(collection(db, 'patronOtsAddRequest'), otsRequestPayload);
                addRequestRefs.push(otsRef.id);
                console.log(`OTS Request ${occurrence.occurrenceNumber} created:`, otsRef.id);
            }

            // 11) Save conditional fields based on Nature of Requirement
            if (addRequestRefs.length > 0) {
                const firstAddRequestRef = addRequestRefs[0];
                const addRequestRefPath = `/patronOtsAddRequest/${firstAddRequestRef}`;

                if (natureOfRequirement === 'Deep cleaning') {
                    const deepCleaningPayload = {
                        bedrooms: bedrooms || 0,
                        bathrooms: bathrooms || 0,
                        living_DiningRoom: livingDining || 0,
                        kitchen: kitchen || 0,
                        balcony: balcony || 0,
                        houseHelpRoom: houseHelp || 0,
                        terrace: terrace || 0,
                        passageStaircaseFoyers: staircase || 0,
                        packagetype: packageType || '',
                        noOfDaysRequired: estimatedDays || '',
                        houseType: houseType || '',
                        AddRequestRef: addRequestRefPath,
                        createdAt,
                    };

                    await addDoc(collection(db, 'patronOTS-DeepCleaningSpace'), deepCleaningPayload);
                    console.log('Deep Cleaning space details saved');
                } else if (natureOfRequirement === 'Wardrobe/Home organisation') {
                    const wardrobePayload = {
                        wardrobeClosets: closet || 0,
                        kitchen: wardKitchen || 0,
                        storageRooms: storageRoom || 0,
                        library: library || 0,
                        otherSpaces: otherSpaces || 0,
                        clientCode: patronID || '',
                        requiredNoOfLm: lmSize || 0,
                        requiredNoOfHK: hkSize || 0,
                        packagetype: wardPackageType || '',
                        AddRequestRef: addRequestRefPath,
                        createdAt,
                    };

                    await addDoc(collection(db, 'patronOTSOrganisationSpace'), wardrobePayload);
                    console.log('Wardrobe/Organisation space details saved');
                } else if (['On-demand MST', 'On-Demand Gardener'].includes(natureOfRequirement)) {
                    // Save MST package if needed
                    console.log('MST Package:', mstPackage);
                } else if (['On-demand Home Cook', 'On-demand Housekeeper', 'On-demand Babysitter', 'On-demand Driver', 'On-demand Buttler', 'errand Runners', 'On-demand Chef'].includes(natureOfRequirement)) {
                    // Save OD package if needed
                    console.log('OD Package:', odPackage);
                }
            }

            triggerSnackbar(`Task successfully created! ${taskOccurrences.length} occurrence(s) saved.`);

            // Optional: Reset form or redirect
            // You can add form reset logic here

        } catch (err) {
            console.error('Failed to create task:', err);
            triggerSnackbar('Failed to create task. Please try again.');
        }
    };

    return (
        <div>
            <Nav />
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-5xl mx-auto p-6">
                    <h1 className="text-3xl font-bold text-orange-600 mb-6">OTS Request</h1>

                    {/* Request Type Toggle */}
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Request</h2>
                        <div className="flex gap-6">
                            {['D2C', 'Non-D2C'].map((type) => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="requestType"
                                        checked={requestType === type}
                                        onChange={() => setRequestType(type)}
                                        className="w-4 h-4 text-orange-600"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {type === 'D2C' ? 'D2C Customer' : 'Non - D2C Customer'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                            {/* Client Code / Patron Name */}
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
                                <SearchableSelect
                                    label="Patron Name"
                                    placeholder="Select Patron Name"
                                    items={allPatronNames}
                                    value={patronName}
                                    onChange={setPatronName}
                                    required
                                />
                            )}

                            {/* Nature of Requirement */}
                            <SimpleSelect
                                label="Nature of Requirement"
                                placeholder="Select"
                                items={natureOfRequirements}
                                value={natureOfRequirement}
                                onChange={setNatureOfRequirement}
                                required
                            />

                            {/* Category */}
                            <SearchableSelect
                                label="Select Category"
                                placeholder="Select"
                                items={categories}
                                value={category}
                                onChange={setCategory}
                                required
                            />

                            {/* SubCategory */}
                            <SearchableSelect
                                label="Select SubCategory"
                                placeholder="Select"
                                items={subCategories}
                                value={subCategory}
                                onChange={setSubCategory}
                                required
                            />

                            {/* Tag */}
                            <SearchableSelect
                                label="Select Tag"
                                placeholder="Select"
                                items={tags}
                                value={tag}
                                onChange={setTag}
                                required
                            />

                            {/* Task Assigned By */}
                            <SearchableSelect
                                label="Task Assigned By"
                                placeholder="Select"
                                items={familyMembers}
                                value={taskAssignedBy}
                                onChange={setTaskAssignedBy}
                                required
                            />

                            {/* Primary Role */}
                            <div className="md:col-span-1 xl:col-span-1">
                                <SimpleSelect
                                    label="Primary Role"
                                    placeholder="Select"
                                    items={primaryRoles}
                                    value={selectedPrimaryRole}
                                    onChange={setSelectedPrimaryRole}
                                />
                            </div>

                            {/* Preference - Multi-select */}

                            <SearchableSelect
                                label="Preference"
                                placeholder="Select preferences"
                                items={preferences}
                                value={selectedPreferences}
                                onChange={setSelectedPreferences}
                                required
                                multiple
                            />

                            {/* Recurring Service */}
                            <SimpleSelect
                                label="Recurring Service"
                                placeholder="Select"
                                items={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]}
                                value={recurringService}
                                onChange={setRecurringService}
                                required
                            />
                        </div>

                        {/* Date/Time Selection for Recurring Service */}

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">
                                        Start Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">
                                        Task Start Date/Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">
                                        End Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">
                                        Task End Date/Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                            </div>

                            {/* Counter for Recurring = Yes */}
                            {recurringService === 'Yes' && (
                                <div className="flex items-center gap-4 mt-4 p-4 bg-gray-50 rounded-xl">
                                    <span className="text-sm font-medium text-gray-700">Recurrence Frequency:</span>
                                    <button
                                        type="button"
                                        onClick={() => setRecurringCounter(Math.max(1, recurringCounter - 1))}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-gray-300 hover:border-orange-400 transition-colors"
                                    >
                                        <Minus className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <span className="text-2xl font-bold text-orange-600 min-w-[3rem] text-center">{recurringCounter}</span>
                                    <button
                                        type="button"
                                        onClick={() => setRecurringCounter(recurringCounter + 1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white border-2 border-gray-300 hover:border-orange-400 transition-colors"
                                    >
                                        <Plus className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <span className="text-xs text-gray-500 ml-2">
                                        (1 = Daily, 2 = Every other day, 3 = Every 2 days, etc.)
                                    </span>
                                </div>
                            )}
                        </div>


                        {/* City of Service & Service Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
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
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Address</label>
                                        <textarea
                                            className="w-full border border-gray-300 bg-gray-50 rounded-xl px-3 py-3 min-h-[80px]"
                                            value={registeredAddress}
                                            readOnly
                                            placeholder="Client's registered address will appear here"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Address</label>
                                        <textarea
                                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 min-h-[80px]"
                                            placeholder="Enter address"
                                            value={otherAddress}
                                            onChange={(e) => setOtherAddress(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Conditional Fields Based on Nature of Requirement */}

                        {/* Deep Cleaning  */}
                        {showDeepCleaningFields && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Property Details</h3>

                                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                    <RoomCounter label="Bedrooms" value={bedrooms} onChange={setBedrooms} />
                                    <RoomCounter label="Bathrooms" value={bathrooms} onChange={setBathrooms} />
                                    <RoomCounter label="Living/Dining Room" value={livingDining} onChange={setLivingDining} />
                                    <RoomCounter label="Kitchen" value={kitchen} onChange={setKitchen} />
                                    <RoomCounter label="Balcony" value={balcony} onChange={setBalcony} />
                                    <RoomCounter label="House Help " value={houseHelp} onChange={setHouseHelp} />
                                    <RoomCounter label="Terrace" value={terrace} onChange={setTerrace} />
                                    <RoomCounter label="Staircase" value={staircase} onChange={setStaircase} />

                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    <SimpleSelect
                                        label="Package Type"
                                        placeholder="Select"
                                        items={packageTypes}
                                        value={packageType}
                                        onChange={setPackageType}
                                    />
                                    <SimpleSelect
                                        label="Estimated Number of Days"
                                        placeholder="Select"
                                        items={[1, 2, 3, 4, 5, 6, 7].map(d => ({ label: `${d} day${d > 1 ? 's' : ''}`, value: d }))}
                                        value={estimatedDays}
                                        onChange={setEstimatedDays}
                                    />

                                    <SimpleSelect
                                        label="House Type"
                                        placeholder="Select"
                                        items={[
                                            { label: 'Unfurnished', value: 'Unfurnished' },
                                            { label: 'Furnished', value: 'Furnished' }
                                        ]}
                                        value={houseType}
                                        onChange={setHouseType}
                                    />
                                </div>
                            </div>
                        )}

                        {/*  Wardrobe Organization Fields */}
                        {showWardrobeFields && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Property Details</h3>

                                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                    <RoomCounter label="Wardrobe Closet" value={closet} onChange={setCloset} />
                                    <RoomCounter label="Kitchen" value={wardKitchen} onChange={setWardKitchen} />
                                    <RoomCounter label="Storage Rooom" value={storageRoom} onChange={setStorageRoom} />
                                    <RoomCounter label="Library" value={library} onChange={setLibrary} />
                                    <RoomCounter label="Other Spaces" value={otherSpaces} onChange={setOtherSpaces} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    <SimpleSelect
                                        label="Package Type"
                                        placeholder="Select"
                                        items={wardPackageTypes}
                                        value={wardPackageType}
                                        onChange={setWardPackageType}
                                    />

                                    <SimpleSelect
                                        label="Required Team Size LM"
                                        placeholder="Select"
                                        items={[1, 2, 3].map(d => ({ label: d, value: d }))}
                                        value={lmSize}
                                        onChange={setLmSize}
                                    />

                                    <SimpleSelect
                                        label="Required Team Size HK"
                                        placeholder="Select"
                                        items={[1, 2, 3, 5].map(d => ({ label: d, value: d }))}
                                        value={hkSize}
                                        onChange={setHkSize}
                                    />

                                </div>
                            </div>
                        )}

                        {/* MST Package Fields */}
                        {showMSTFields && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <SimpleSelect
                                    label="MST/GDR - Type of Package"
                                    placeholder="Select"
                                    items={mstPackages}
                                    value={mstPackage}
                                    onChange={setMstPackage}
                                />
                            </div>
                        )}

                        {/* OD Package Fields */}
                        {showODFields && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <SimpleSelect
                                    label="OD - Type of Package"
                                    placeholder="Select"
                                    items={odPackages}
                                    value={odPackage}
                                    onChange={setOdPackage}
                                />
                            </div>
                        )}

                        {/* Scope of Detail - Always shown after preference */}
                        <div className="mt-6">
                            <label className="block text-sm font-medium mb-1 text-gray-700">
                                Scope of Work in Detail <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 min-h-[120px]"
                                placeholder="Describe the work scope in detail"
                                value={scopeOfDetail}
                                onChange={(e) => setScopeOfDetail(e.target.value)}
                            />
                        </div>

                        {/* Create Task Button */}
                        <div className="mt-8 flex justify-center">
                            <button
                                type="button"
                                onClick={onCreateTask}
                                className="w-full md:w-96 bg-orange-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-orange-700 transition-colors shadow-md hover:shadow-lg"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}