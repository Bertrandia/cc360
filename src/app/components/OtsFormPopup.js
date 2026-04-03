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

export default function OTSFormDialog({
    open,
    onClose,
    onSuccess,
    activeTab = 'ots',
    onSwitchTab,
    isFromOtsDash = false,
    currentUserEmail
}) {
    const { user } = useAuth();

    const [requestType, setRequestType] = useState('D2C');

    // D2C specific - Client Codes
    const [clientCodes, setClientCodes] = useState([]);
    const [selectedClientCode, setSelectedClientCode] = useState('');

    // Non-D2C specific - Patron Names
    const [allPatronNames, setAllPatronNames] = useState([]);
    const [patronName, setPatronName] = useState('');

    const [allLMs, setAllLMs] = useState([]);
    const [selectedLM, setSelectedLM] = useState('');
    const [filteredClientCodes, setFilteredClientCodes] = useState([]);
    const [filteredPatronNames, setFilteredPatronNames] = useState([]);

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    // useffect for selecting lm
    useEffect(() => {
        if (!open || !isFromOtsDash) return;

        const loadLMs = async () => {
            try {
                const userSnap = await getDocs(collection(db, 'user'));
                const lmList = [];
                userSnap.forEach((doc) => {
                    const data = doc.data();
                    if (data?.otsRole === 'LM' && data?.display_name) {
                        lmList.push({
                            label: data.display_name,
                            value: data.display_name,
                            email: data.email
                        });
                    }
                });
                setAllLMs(lmList);
            } catch (error) {
                console.error('Error loading LMs:', error);
            }
        };

        loadLMs();
    }, [open, isFromOtsDash]);


    useEffect(() => {
        if (!selectedLM || !isFromOtsDash) return;

        const loadPatronsForLM = async () => {
            try {
                const codes = [];
                const names = [];

                const qPm = query(
                    collection(db, 'patronMaster'),
                    where('assignedLMName', '==', selectedLM)
                );
                const pmSnap = await getDocs(qPm);

                const assignedNames = [];
                pmSnap.forEach((d) => {
                    if (d.data()?.assignedLMName) {
                        assignedNames.push(d.data().assignedLMName);
                    }
                });

                for (const lmName of assignedNames) {
                    const qAdd = query(
                        collection(db, 'addPatronDetails'),
                        where('assignedLM', '==', lmName)
                    );
                    const addSnap = await getDocs(qAdd);

                    addSnap.forEach((doc) => {
                        const data = doc.data();
                        if (data?.patronBusinessID) {
                            codes.push({
                                label: data.patronBusinessID,
                                value: data.patronBusinessID,
                                id: doc.id
                            });
                        }
                        if (data?.patronName) {
                            names.push({
                                label: data.patronName,
                                value: data.patronName,
                                id: doc.id
                            });
                        }
                    });
                }

                setFilteredClientCodes(
                    Array.from(new Map(codes.map((c) => [c.value, c])).values())
                );
                setFilteredPatronNames(
                    Array.from(new Map(names.map((c) => [c.value, c])).values())
                );
            } catch (error) {
                console.error('Error loading patrons for LM:', error);
            }
        };

        loadPatronsForLM();
    }, [selectedLM, isFromOtsDash]);

    // Load all master data from Firebase on open
    useEffect(() => {
        if (!open) return;
        const loadMasterData = async () => {
            try {
                const [
                    norSnap,
                    catSnap,
                    famSnap,
                    citySnap,
                    prefSnap,
                    roleSnap,
                    pkgSnap,
                    orgPkgSnap,
                    mstSnap,
                    odSnap
                ] = await Promise.all([
                    getDocs(collection(db, 'patronOTS-NatureofRequirement')),
                    getDocs(collection(db, 'd2cExpenseCategory')),
                    getDocs(collection(db, 'patronFamilyMembers')),
                    getDocs(collection(db, 'patronOTS-Location')),
                    getDocs(collection(db, 'patronYcwHelps')),
                    getDocs(collection(db, 'patronPrimaryRole')),
                    getDocs(collection(db, 'patronOtsPackageType')),
                    getDocs(collection(db, 'patronOTS-Organization-TypeofPackage')),
                    getDocs(collection(db, 'patronOTS-MST-GDR-TypeofPackage')),
                    getDocs(collection(db, 'patronOTS-OD-TypeofPackage')),
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

                // Don't load subcategories and tags initially - they'll be loaded based on category/subcategory selection
                setSubCategories([]);
                setTags([]);

                const famList = [];
                famSnap.forEach((d) => {
                    const val = d.data()?.name || d.data()?.Name;
                    if (val) famList.push({ label: val, value: val });
                });
                setFamilyMembers(famList);

                const cityList = [];
                citySnap.forEach((d) => { const val = d.data()?.cityOfService; if (val) cityList.push({ label: val, value: val }); });
                setCitiesOfService(cityList);

                const prefList = [];
                prefSnap.forEach((d) => { const val = d.data()?.name; if (val) prefList.push({ label: val, value: val }); });
                setPreferences(prefList);

                const roles = [];
                roleSnap.forEach((d) => { const v = d.data()?.primaryRole; if (v) roles.push({ label: v, value: v }); });
                setPrimaryRoles(roles);

                const pkgList = [];
                pkgSnap.forEach((d) => { const val = d.data()?.typeOfPackage; if (val) pkgList.push({ label: val, value: val }); });
                setPackageTypes(pkgList);

                const orgPkgList = [];
                orgPkgSnap.forEach((d) => { const val = d.data()?.organizationTypeofPackage; if (val) orgPkgList.push({ label: val, value: val }); });
                setWardPackageTypes(orgPkgList);

                const mstList = [];
                mstSnap.forEach((d) => { const val = d.data()?.mst_gdr_TypeOfPackage; if (val) mstList.push({ label: val, value: val }); });
                setMstPackages(mstList);

                const odList = [];
                odSnap.forEach((d) => { const val = d.data()?.od_TypeofPackage; if (val) odList.push({ label: val, value: val }); });
                setOdPackages(odList);

                // ✅ Load client codes for logged-in LM
                if (user?.email) {
                    const isOTSDash = window.location.pathname.includes('otsdash');

                    const codes = [];
                    const names = [];

                    if (isFromOtsDash) {
                        // For OtsDash: Load ALL patrons (LM will be selected first)
                        const allPatronsSnap = await getDocs(collection(db, 'addPatronDetails'));
                        allPatronsSnap.forEach((doc) => {
                            const data = doc.data();
                            if (data?.patronBusinessID) {
                                codes.push({ label: data.patronBusinessID, value: data.patronBusinessID, id: doc.id });
                            }
                            if (data?.patronName) {
                                names.push({ label: data.patronName, value: data.patronName, id: doc.id });
                            }
                        });
                    } else {
                        // For LM Sheet: Filter by current user's LM name
                        // First, get the current user's display name
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
                    }

                    setClientCodes(Array.from(new Map(codes.map((c) => [c.value, c])).values()));
                    setAllPatronNames(Array.from(new Map(names.map((c) => [c.value, c])).values()));
                }
            } catch (error) {
                console.error('Error loading master data:', error);
                triggerSnackbar('Failed to load form data');
            }
        };

        loadMasterData();
    }, [open, user?.email]);

    // ✅ SEPARATE useEffect: Filter subcategories when category changes
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
                setSubCategory(''); // Reset subcategory selection
                setTags([]);
                setTag('');
            } catch (error) {
                console.error('Error loading subcategories:', error);
                setSubCategories([]);
            }
        };

        loadSubCategories();
    }, [category]);

    // ✅ SEPARATE useEffect: Filter tags when subcategory changes
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
                setTag(''); // Reset tag selection
            } catch (error) {
                console.error('Error loading tags:', error);
                setTags([]);
            }
        };

        loadTags();
    }, [subCategory]);

    // ✅ Load family members when client code or patron name changes
    useEffect(() => {
        const loadFamilyMembers = async () => {
            try {
                let patronDocId = '';

                if (requestType === 'D2C' && selectedClientCode) {
                    const q = query(
                        collection(db, 'addPatronDetails'),
                        where('patronBusinessID', '==', selectedClientCode)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) patronDocId = snap.docs[0].id;
                } else if (requestType === 'Non-D2C' && patronName) {
                    const q = query(
                        collection(db, 'addPatronDetails'),
                        where('patronName', '==', patronName)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) patronDocId = snap.docs[0].id;
                }

                if (patronDocId) {
                    const patronRef = doc(db, 'addPatronDetails', patronDocId);
                    const qFam = query(
                        collection(db, 'patronFamilyMembers'),
                        where('patronRef', '==', patronRef)
                    );
                    const famSnap = await getDocs(qFam);
                    const famList = [];
                    famSnap.forEach((d) => {
                        const data = d.data();
                        const name = data?.Name || data?.name;
                        if (name) famList.push({ label: name, value: name });
                    });
                    setFamilyMembers(famList);
                } else {
                    setFamilyMembers([]);
                }
            } catch (error) {
                console.error('Error loading family members:', error);
                setFamilyMembers([]);
            }
        };

        loadFamilyMembers();
    }, [selectedClientCode, patronName, requestType]);

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

    const showDeepCleaningFields = useMemo(() => {
        return ['Deep cleaning'].includes(natureOfRequirement);
    }, [natureOfRequirement]);

    const showWardrobeFields = useMemo(() => {
        return ['Wardrobe/Home organisation'].includes(natureOfRequirement);
    }, [natureOfRequirement]);

    const showMSTFields = useMemo(() => {
        return ['On-demand MST', 'On-Demand Gardener'].includes(natureOfRequirement);
    }, [natureOfRequirement]);

    const showODFields = useMemo(() => {
        return natureOfRequirement && ['On-demand Home Cook', 'On-demand Housekeeper', 'On-demand Babysitter', 'On-demand Driver', 'On-demand Buttler', 'Errand Runners', 'On-demand Chef'].includes(natureOfRequirement);
    }, [natureOfRequirement]);

    const onCreateTask = async () => {
  

         if (isSubmitting) return;

    setIsSubmitting(true); // lock button 30-03-26

        try {
            if (!natureOfRequirement || !category || !subCategory || !tag || !scopeOfDetail) {
                triggerSnackbar('Please fill all required fields: Nature of Requirement, Category, SubCategory, Tag, and Scope of Work');
                return;
            }

            if (recurringService && startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (end < start) {
                    triggerSnackbar('End date cannot be earlier than start date');
                    return;
                }
            }

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

            const now = new Date();
            const createdAt = Timestamp.fromDate(now);
            const taskDate = createdAt;
            const taskAssignDate = createdAt;

            // const taskRecievedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const taskRecievedDate = createdAt;

            const patronCity = patronData?.city || '';
            const patronAddress = addressMode === 'registered' ? registeredAddress : otherAddress;
            const patronID = patronData?.patronBusinessID || '';
            const patronRef = doc(db, 'addPatronDetails', patronDocId);
            const lmRef = patronData?.lmRef || '';
            const newPatronID = patronData?.newPatronID || '';
            const newPatronName = patronData?.newPatronName || '';
            const patronNameResolved = requestType === 'D2C' ? (patronData?.patronName || '') : patronName;
            const backupLmName = patronData?.backupLmName || '';
            const backupLmRef = patronData?.backupLmRef || '';

            const dynamicCode = 'OTS';
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

                    // Generate serviceCode
                    serviceCode = `${code}${currentCount + 1}`;

                    // Increment existingRequestsCount in patronPrimaryRole
                    const roleDocRef = doc(db, 'patronOTS-NatureofRequirement', roleDoc.id);
                    await updateDoc(roleDocRef, {
                        NoOfRequirements: currentCount + 1
                    });
                }
            } catch (error) {
                console.error('Error generating serviceCode:', error);
            }

            // Get count of requests created TODAY with OTS code
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);

            const qCount = query(
                collection(db, 'patronOtsAddRequest'),
                where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
                where('createdAt', '<=', Timestamp.fromDate(endOfDay))
            );
            const countSnapshot = await getDocs(qCount);
            const todayRequestCount = countSnapshot.size;

            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const datePart = `${yy}${mm}${dd}`;
            // const requestCountPart = (existingCount + 1).toString();
            // const requestID = `${datePart}${dynamicCode}${requestCountPart}`;
            const monthName = now.toLocaleString('default', { month: 'long' });

            const taskID = generateTaskID(
                patronNameResolved || 'Unknown',
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

            const dueDate = taskEndTimestamp
                ? new Date(taskEndTimestamp.toDate().getTime() + 45 * 24 * 60 * 60 * 1000)
                : new Date(occurrence.date.getTime() + 45 * 24 * 60 * 60 * 1000);
            const taskDueDate = Timestamp.fromDate(dueDate);

            let assignedByRef = null;

            if (taskAssignedBy) {
                const familyQuery = query(
                    collection(db, "patronFamilyMembers"),
                    where("Name", "==", taskAssignedBy)
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
            const resolvedAssignedLMName =
                assignedLMName?.trim()
                    ? assignedLMName
                    : selectedLM?.trim()
                        ? selectedLM
                        : '';


            const taskPayload = {
                assignedLMName: resolvedAssignedLMName || '',
                assignedByRef: assignedByRef || '',
                createdAt,
                createdBy: user?.email || '',
                lmNumber: lmNumber || '',
                lmRef: lmRef || '',
                lmStartTime: createdAt || '',
                location: patronCity || '',
                patronAddress: patronAddress || '',
                patronCity: patronCity || '',
                clientCode: patronID || '',
                patronID: patronID || '',
                patronRef,
                taskAssignDate,
                taskCategory: 'OTS',
                taskType: 'OTS',
                isCockpitTaskCreated: false,
                isDelayed: false,
                isOTSTask: true,
                isTaskDisabled: false,
                taskDate,
                taskDescription: scopeOfDetail || '',
                taskOwner: resolvedAssignedLMName || '',
                taskRecievedTime: createdAt,
                taskStartTime: taskStartTimestamp, // ✅ Changed to Timestamp
                taskEndTime: taskEndTimestamp,
                taskDueDate: taskDueDate,
                adminStartTime: taskStartTimestamp, // ✅ Changed to Timestamp
                adminEndTime: taskEndTimestamp,
                month: monthName || '',
                taskStatusCategory: 'To be Started',
                requestType,
                natureOfRequirement: natureOfRequirement || '',
                categoryTag: category || '',
                subCategory: subCategory || '',
                status: 'Pending',
                priority: 'Medium',
                billingModel: 'Billable',
                lastComment: "Task has been created",
                taskInProcessDate: createdAt,
                categoryTagName: tag || '',
                taskAssignedBy: taskAssignedBy || '',
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
            const otsRef = doc(db, 'patronOtsAddRequest', addRequestRef);

            const taskPayloadWithRef = {
                ...taskPayload,
                associateRef: associateRef, // Add this field
                newPatronID: newPatronID,
                newPatronName: newPatronName,
                otsRef: otsRef,
                taskSubject: scopeOfDetail,
                partonName: patronNameResolved || '',
            };

            const taskRef = await addDoc(collection(db, 'createTaskCollection'), taskPayloadWithRef);

            // Update all patronOtsAddRequest documents with mainTaskRef
            for (const otsId of addRequestRefs) {
                await updateDoc(doc(db, 'patronOtsAddRequest', otsId), {
                    mainTaskRef: taskRef.id,
                });
            }


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
                } else if (['On-demand MST', 'On-Demand Gardener'].includes(natureOfRequirement)) {
                    // Save MST package if needed
                    if (mstPackage) {
                        await addDoc(collection(db, 'patronOTS-MST-GDR-Selection'), {
                            mstPackage,
                            createdAt,
                            AddRequestRef: addRequestRefPath,
                        });
                    }
                } else if (['On-demand Home Cook', 'On-demand Housekeeper', 'On-demand Babysitter', 'On-demand Driver', 'On-demand Buttler', 'Errand Runners', 'On-demand Chef'].includes(natureOfRequirement)) {
                    if (odPackage) {
                        await addDoc(collection(db, 'patronOTS-OD-Selection'), {
                            odPackage,
                            createdAt,
                            AddRequestRef: addRequestRefPath,
                        });
                    }
                }
            }

            triggerSnackbar(`Task successfully created! ${taskOccurrences.length} occurrence(s) saved.`);
            onSuccess?.();
            onClose?.();
        } catch (err) {
            console.error('Failed to create task:', err);
            triggerSnackbar('Failed to create task. Please try again.');
        }
        finally {
        // ✅ Always unlock button 30-03-26
        setIsSubmitting(false);
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
                        <h2 className="text-[20px] font-semibold text-[#2C2C2C] tracking-tight">OTS Request Form</h2>
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

                        {isFromOtsDash && (
                            <div className="md:col-span-2">
                                <SearchableSelect
                                    label="Select LM"
                                    placeholder="Choose LM first"
                                    items={allLMs}
                                    value={selectedLM}
                                    onChange={setSelectedLM}
                                    required
                                />
                            </div>
                        )}

                        {(!isFromOtsDash || selectedLM) && (
                            <>
                                {requestType === 'D2C' ? (
                                    <SearchableSelect
                                        label="Client Code"
                                        placeholder="Select Client Code"
                                        items={isFromOtsDash ? filteredClientCodes : clientCodes}
                                        value={selectedClientCode}
                                        onChange={setSelectedClientCode}
                                        required
                                    />
                                ) : (
                                    <SearchableSelect
                                        label="Patron Name"
                                        placeholder="Select Patron Name"
                                        items={isFromOtsDash ? filteredPatronNames : allPatronNames}
                                        value={patronName}
                                        onChange={setPatronName}
                                        required
                                    />
                                )}

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

                                <SearchableSelect
                                    label="Task Assigned By"
                                    placeholder="Select"
                                    items={familyMembers}
                                    value={taskAssignedBy}
                                    onChange={setTaskAssignedBy}
                                    required
                                />

                                {/* <SimpleSelect
                            label="Primary Role"
                            placeholder="Select"
                            items={primaryRoles}
                            value={selectedPrimaryRole}
                            onChange={setSelectedPrimaryRole}
                        /> */}

                                <SearchableSelect
                                    label="Preference"
                                    placeholder="Select preferences"
                                    items={preferences}
                                    value={selectedPreferences}
                                    onChange={setSelectedPreferences}
                                    multiple
                                />

                                <SimpleSelect
                                    label="Recurring Service"
                                    placeholder="Select"
                                    items={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]}
                                    value={recurringService}
                                    onChange={setRecurringService}
                                    required
                                />
                            </>
                        )}
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

                    {showDeepCleaningFields && (
                        <div className="mt-4 pt-6 border-t border-[#EDEDED]">
                            <h3 className="text-sm font-semibold text-[#4C4C4C] mb-4">Property Details</h3>

                            <div className="bg-[#F9F9F9] rounded-2xl p-4 border border-[#EDEDED] mb-4">
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

                    {showWardrobeFields && (
                        <div className="mt-4 pt-6 border-t border-[#EDEDED]">
                            <h3 className="text-sm font-semibold text-[#4C4C4C] mb-4">Property Details</h3>

                            <div className="bg-[#F9F9F9] rounded-2xl p-4 border border-[#EDEDED] mb-4">
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

                    {showMSTFields && (
                        <div className="mt-4 pt-6 border-t border-[#EDEDED]">
                            <SimpleSelect
                                label="MST/GDR - Type of Package"
                                placeholder="Select"
                                items={mstPackages}
                                value={mstPackage}
                                onChange={setMstPackage}
                            />
                        </div>
                    )}

                    {showODFields && (
                        <div className="mt-4 pt-6 border-t border-[#EDEDED]">
                            <SimpleSelect
                                label="OD - Type of Package"
                                placeholder="Select"
                                items={odPackages}
                                value={odPackage}
                                onChange={setOdPackage}
                            />
                        </div>
                    )}

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
                        {/* <button
                            onClick={onCreateTask}
                          //  className="px-6 py-2.5 bg-[#F36A23] text-white rounded-full text-sm font-semibold shadow-[0_8px_24px_rgba(243,106,35,0.35)] hover:bg-[#e45f1d] transition-colors"
                          
                        >
                            Create Requirement
                        </button> */}
                        <button
  onClick={onCreateTask}
  disabled={isSubmitting}
  className={`
    px-6 py-2.5 rounded-full text-sm font-semibold text-white 
    shadow-md transition-all duration-200 flex items-center justify-center gap-2
    ${
      isSubmitting
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-[#F36A23] hover:bg-[#e45f1d] active:scale-95"
    }
  `}
>
  {isSubmitting && (
    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
  )}

  {isSubmitting ? "Creating..." : "Create Requirement"}
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