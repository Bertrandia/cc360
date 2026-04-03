'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Nav from '../../components/navbar';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import RoleSpecificFields from '../../components/RoleSpecificForm';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  Timestamp,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { UploadCloud, FileText, X } from 'lucide-react';
import Snackbar, { triggerSnackbar } from '../../components/snakbar';

// Local helper: searchable dropdown kept inside this page to avoid global changes
// Searchable select with keyboard support (ArrowUp/Down, Enter, Escape, Home, End)
function SearchableSelect({ label, placeholder = 'Select', items, value, onChange, required = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRefs = useRef([]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const suggestionRefs = useRef([]);

  useEffect(() => {
    const onClickAway = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
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
    // when list changes reset highlight
    setHighlightIndex(filtered.length ? 0 : -1);
  }, [filtered.length]);

  useEffect(() => {
    if (open) {
      // focus input quickly when opening
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    // scroll highlighted into view
    if (highlightIndex >= 0 && listRefs.current[highlightIndex]) {
      try { listRefs.current[highlightIndex].scrollIntoView({ block: 'nearest' }); } catch (e) { }
    }
  }, [highlightIndex]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const found = (items || []).find((it) => (it?.value ?? it) === value);
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
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setHighlightIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setHighlightIndex(filtered.length - 1);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex]) {
        const val = filtered[highlightIndex]?.value ?? filtered[highlightIndex];
        onChange(val);
        setOpen(false);
        setSearch('');
      }
      return;
    }
  };
  useEffect(() => {
    if (suggestionIndex >= 0 && suggestionRefs.current[suggestionIndex]) {
      suggestionRefs.current[suggestionIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [suggestionIndex]);

  return (
    <div className="w-full" ref={containerRef} onKeyDown={onKeyDown}>
      {label && (
        <label className="block text-sm font-medium mb-1 text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={`relative`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full text-left border border-gray-300 bg-gray-50 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          tabIndex={0}
        >
          {selectedLabel || placeholder}
        </button>

        {open && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="p-2">
              <input
                ref={inputRef}
                autoFocus
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setHighlightIndex(0); }}
                onKeyDown={onKeyDown}
              />
            </div>

            <ul className="max-h-56 overflow-auto" role="listbox" aria-activedescendant={highlightIndex >= 0 ? `item-${highlightIndex}` : undefined}>
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-500">No results</li>
              )}
              {filtered.map((it, idx) => {
                const val = it?.value ?? it;
                const lab = it?.label ?? it;
                const highlighted = idx === highlightIndex;
                return (
                  <li
                    id={`item-${idx}`}
                    key={String(val)}
                    ref={(el) => (listRefs.current[idx] = el)}
                    className={`px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer ${highlighted ? 'bg-orange-50' : ''}`}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseDown={(ev) => { ev.preventDefault(); /* prevent blur */ }}
                    onClick={() => { onChange(val); setOpen(false); setSearch(''); }}
                    role="option"
                    aria-selected={highlighted}
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

// Simple non-search dropdown used by most fields
// Simple non-search dropdown with keyboard support
function SimpleSelect({ label, placeholder = 'Select', items, value, onChange, required = false }) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRefs = useRef([]);

  useEffect(() => {
    const onClickAway = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClickAway);
    return () => document.removeEventListener('click', onClickAway);
  }, []);

  const selectedLabel = useMemo(() => {
    if (value === null || value === undefined || value === '') return '';
    const found = (items || []).find((it) => {
      const itemValue = it?.value ?? it;
      // Handle boolean comparison properly
      if (typeof itemValue === 'boolean' && typeof value === 'boolean') {
        return itemValue === value;
      }
      return String(itemValue) === String(value);
    });
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
      try { listRefs.current[highlightIndex].scrollIntoView({ block: 'nearest' }); } catch (e) { }
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
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setHighlightIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setHighlightIndex((items || []).length - 1);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const itm = (items || [])[highlightIndex];
      if (itm) {
        const val = itm?.value ?? itm;
        onChange(val);
      }
      setOpen(false);
      return;
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
          tabIndex={0}
        >
          <span>{selectedLabel || placeholder}</span>
          <span className="text-gray-400">▾</span>
        </button>

        {open && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
            <ul className="max-h-56 overflow-auto" role="listbox" aria-activedescendant={highlightIndex >= 0 ? `simple-item-${highlightIndex}` : undefined}>
              {(items || []).map((it, idx) => {
                const val = it?.value ?? it;
                const lab = it?.label ?? it;
                const highlighted = idx === highlightIndex;
                return (
                  <li
                    id={`simple-item-${idx}`}
                    key={String(val)}
                    ref={(el) => (listRefs.current[idx] = el)}
                    className={`px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer ${highlighted ? 'bg-orange-50' : ''}`}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseDown={(ev) => { ev.preventDefault(); }}
                    onClick={() => { onChange(val); setOpen(false); }}
                    role="option"
                    aria-selected={highlighted}
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

async function scanForInvalidReferences() {
  console.log("🔍 Scanning addPatronDetails for invalid Firestore references...");
  const snap = await getDocs(collection(db, "addPatronDetails"));

  snap.forEach((d) => {
    const data = d.data();

    // Loop through all fields and detect nested document references
    Object.entries(data).forEach(([key, value]) => {
      // Firestore references contain a `firestore` & `_key` object internally
      if (value && typeof value === "object" && value._key) {
        const refPath = value._key?.path?.segments?.join("/") || "";

        if (refPath.includes("temp-backup")) {
          console.warn(`⚠ Invalid reference in doc ${d.id}, field "${key}":`, refPath);
        }
      }
    });
  });

  console.log("✅ Scan complete. Check console for warnings.");
}
async function cleanInvalidReferences() {
  console.log("🧹 Cleaning invalid references in addPatronDetails...");
  const snap = await getDocs(collection(db, "addPatronDetails"));

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    let needsUpdate = false;
    const cleanData = {};

    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === "object" && value._key) {
        const refPath = value._key?.path?.segments?.join("/") || "";
        if (refPath.includes("temp-backup")) {
          console.warn(`🔧 Removing invalid reference in doc ${docSnap.id}, field "${key}"`);
          needsUpdate = true;
          cleanData[key] = null; // Remove the invalid reference
        }
      }
    });

    if (needsUpdate) {
      await updateDoc(doc(db, "addPatronDetails", docSnap.id), cleanData);
      console.log(`✅ Cleaned doc ${docSnap.id}`);
    }
  }
  console.log("✅ Cleanup complete.");
}

export default function AssociateRequestFormPage() {
  const { user, userData } = useAuth();


  const [requestType, setRequestType] = useState('D2C'); // 'D2C' | 'B2B' | 'Non-D2C' | 'Bench'

  // D2C specific: Client Code list for logged in LM
  const [clientCodes, setClientCodes] = useState([]); // [{label, value}]
  const [selectedClientCode, setSelectedClientCode] = useState('');
  const [familyMembers, setFamilyMembers] = useState([]); // [{label, value}]
  const [assignedBy, setAssignedBy] = useState('');

  // B2B/Non-D2C/Bench: Patron Name input
  const [patronName, setPatronName] = useState('');

  // Common dropdowns
  const [requirementType, setRequirementType] = useState('');
  const [primaryRoles, setPrimaryRoles] = useState([]);
  const [selectedPrimaryRole, setSelectedPrimaryRole] = useState('');
  const [ethnicities, setEthnicities] = useState([]);
  const [selectedEthnicity, setSelectedEthnicity] = useState('');
  const [gender, setGender] = useState('');
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [workingHours, setWorkingHours] = useState('');

  // Address selection
  const [addressMode, setAddressMode] = useState('registered'); // 'registered' | 'other'
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [otherAddress, setOtherAddress] = useState('');

  // Text fields
  const [salaryRange, setSalaryRange] = useState('');
  const [lastComment, setLastComment] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [advancePaymentReceived, setAdvancePaymentReceived] = useState('');
  const [requestOpenDate, setRequestOpenDate] = useState('');

  // Uploads
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{name, url}]

  // Patron name suggestions
  const [allPatronNames, setAllPatronNames] = useState([]); // [{label, value}]
  const [showPatronSuggestions, setShowPatronSuggestions] = useState(false);
  // For keyboard navigation in suggestion dropdowns
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const suggestionRefs = useRef([]);


  // Role-specific fields state
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


  // Fetch client codes for current LM from patronMaster.assignedLmEmail
  useEffect(() => {
    const fetchClientCodes = async () => {
      try {
        if (!user) return;
        const email = user.email || '';
        if (!email) return;

        // Step 1 – Find the LM entry in patronMaster matching the logged-in user's email
        const qPm = query(
          collection(db, 'patronMaster'),
          where('assignedLmEmail', '==', email)
        );
        const pmSnap = await getDocs(qPm);
        if (pmSnap.empty) {
          console.warn('No patronMaster records found for LM email:', email);
          return;
        }

        // Step 2 – Collect all assignedLMName values
        const assignedNames = [];
        pmSnap.forEach((d) => {
          const data = d.data();
          if (data?.assignedLMName) assignedNames.push(data.assignedLMName);
        });

        if (assignedNames.length === 0) {
          console.warn('No assignedLMName found for this LM');
          return;
        }

        // Step 3 – For each LM name, find matching addPatronDetails docs
        const clientCodes = [];
        for (const lmName of assignedNames) {
          const qAdd = query(
            collection(db, 'addPatronDetails'),
            where('assignedLM', '==', lmName)
          );
          const addSnap = await getDocs(qAdd);
          addSnap.forEach((doc) => {
            const data = doc.data();
            if (data?.clientCode) {
              clientCodes.push({ label: data.patronBusinessID, value: data.patronBusinessID });
            }
          });
        }

        // Step 4 – Remove duplicates and sort
        const uniqueCodes = Array.from(
          new Map(clientCodes.map((c) => [c.value, c])).values()
        );
        setClientCodes(uniqueCodes.sort((a, b) => String(a.label).localeCompare(String(b.label))));
      } catch (e) {
        console.error('Failed to load client codes', e);
      }
    };

    fetchClientCodes();
  
  }, [user, userData]);
  // console.log("assignedNames",selectedClientCode)

  // When client code changes (D2C), load addPatronDetails by clientCode -> billingAddress and patronRef; then load family members from patronFamilyMembers
  // When client code changes (D2C), load all required linked data and populate "Task Assigned By"
  // When client code changes (D2C): fetch addPatronDetails by clientCode -> billingAddress, then load family members

  // Auto-load Billing Address and Family Members when Client Code changes
  useEffect(() => {
    const loadClientData = async () => {
      try {
        if (!selectedClientCode) return;
        setRegisteredAddress('');
        setFamilyMembers([]);
        setAssignedBy('');

        // Step 1 – Find addPatronDetails doc using clientCode
        const q = query(
          collection(db, 'addPatronDetails'),
          where('patronBusinessID', '==', selectedClientCode)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          console.warn('No patron found for client code', selectedClientCode);
          return;
        }

        const patronDoc = snap.docs[0];
        const patronDocId = patronDoc.id;
        const data = patronDoc.data();

        // Step 2 – Billing address
        if (data.billingAddress) setRegisteredAddress(data.billingAddress);

        // Step 3 – Load family members (Task Assigned By options)
        await loadFamilyMembersByDocId(patronDocId);
      } catch (err) {
        console.error('Error loading data for client code', err);
      }
    };

    loadClientData();
  }, [selectedClientCode]);

  useEffect(() => {
    const loadFamilyAndAddress = async () => {
      try {
        if (!selectedClientCode) {
          setRegisteredAddress('');
          setFamilyMembers([]);
          return;
        }
        setAssignedBy('');
        setFamilyMembers([]);

        // Find patron doc by clientCode
        const found = await findPatronDocByClientCode(selectedClientCode);
        if (!found) {
          console.warn('No addPatronDetails for clientCode', selectedClientCode);
          setRegisteredAddress('');
          setFamilyMembers([]);
          return;
        }

        if (found.billing) setRegisteredAddress(found.billing || '');
        else setRegisteredAddress('');

        // load family
        await loadFamilyMembersByDocId(found.docId);
      } catch (e) {
        console.error('Failed to load Task Assigned By options (ClientCode)', e);
        setFamilyMembers([]);
      }
    };
    loadFamilyAndAddress();
  }, [selectedClientCode, user]);

  // When patron name changes (B2B/Non-D2C/Bench), look up by patronName
  // When patron name changes (B2B/Non-D2C/Bench), find addPatronDetails by name then load family members
  useEffect(() => {
    const loadByPatronName = async () => {
      try {
        if (requestType === 'D2C') return;
        if (!patronName || patronName.trim() === '') {
          setRegisteredAddress('');
          setFamilyMembers([]);
          return;
        }
        setAssignedBy('');
        setFamilyMembers([]);

        const found = await findPatronDocByName(patronName.trim());
        if (!found) {
          console.warn('No addPatronDetails found for patron name', patronName);
          setRegisteredAddress('');
          setFamilyMembers([]);
          return;
        }
        if (found.billing) setRegisteredAddress(found.billing || ''); else setRegisteredAddress('');
        await loadFamilyMembersByDocId(found.docId);
      } catch (e) {
        console.error('Failed to load by patron name', e);
        setFamilyMembers([]);
      }
    };
    loadByPatronName();
  }, [patronName, requestType]);

  // useEffect(() => {
  //   scanForInvalidReferences(); // First run scan
  //   cleanInvalidReferences(); // Uncomment after verifying scan logs
  // }, []);


  // Load master data: roles, ethnicity, languages + patron names for suggestions
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [roleSnap, ethSnap, langSnap, namesSnap] = await Promise.all([
          getDocs(collection(db, 'patronPrimaryRole')),
          getDocs(collection(db, 'patronEthnicityPreference')),
          getDocs(collection(db, 'patronLanguage')),
          getDocs(collection(db, 'addPatronDetails')),
        ]);

        const roles = [];
        roleSnap.forEach((d) => {
          const v = d.data()?.primaryRole;
          if (v) roles.push({ label: v, value: v });
        });
        setPrimaryRoles(roles);

        const eths = [];
        ethSnap.forEach((d) => {
          const v = d.data()?.ethnicity;
          if (v) eths.push({ label: v, value: v });
        });
        setEthnicities(eths);

        const langs = [];
        langSnap.forEach((d) => {
          const v = d.data()?.language;
          if (v) langs.push({ label: v, value: v });
        });
        setLanguages(langs);

        const names = [];
        namesSnap.forEach((d) => {
          const v = d.data()?.patronName;
          if (v) names.push({ label: v, value: v });
        });
        const uniq = Array.from(new Map(names.map(n => [n.value.toLowerCase(), n])).values());
        setAllPatronNames(uniq);
      } catch (e) {
        console.error('Failed to load master data', e);
      }
    };
    loadMasters();
  }, []);

  const workingHourOptions = useMemo(() => (
    [
      '<6 hours',
      '6-8 hours',
      '8-10 hours',
      '12 hours',
      'Live in',
    ]
  ), []);

  // ----------------- Firestore helper utilities -----------------

  // Given addPatronDetails doc id, load family members (supports both /addPatronDetails/<id> and addPatronDetails/<id>)
  const loadFamilyMembersByDocId = async (docId) => {
    try {
      if (!docId) return;
      const patronRef = doc(db, "addPatronDetails", docId);

      const qFam = query(
        collection(db, 'patronFamilyMembers'),
        where('patronRef', '==', patronRef)
      );
      const famSnap = await getDocs(qFam);

      const famList = [];
      famSnap.forEach((doc) => {
        const d = doc.data();
        const name = d?.Name || d?.name;
        if (name) famList.push({ label: name, value: name });
      });
      console.log('Fetched family members:', famList);
      setFamilyMembers(famList);
    } catch (err) {
      console.error('Failed to load family members:', err);
    }
  };

  // Find addPatronDetails doc by clientCode
  const findPatronDocByClientCode = async (clientCode) => {
    try {
      if (!clientCode) return null;
      const q = query(collection(db, 'addPatronDetails'), where('patronBusinessID', '==', clientCode));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const doc0 = snap.docs[0];
      return { docId: doc0.id, billing: doc0.data()?.billingAddress || '' };
    } catch (err) {
      console.error('findPatronDocByClientCode error:', err);
      return null;
    }
  };

  // Find addPatronDetails doc by patron name (tries patronName then name)
  const findPatronDocByName = async (nameToFind) => {
    try {
      if (!nameToFind) return null;
      // try field 'patronName' first
      let q = query(collection(db, 'addPatronDetails'), where('patronName', '==', nameToFind));
      let snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { docId: d.id, billing: d.data()?.billingAddress || '' };
      }
      // fallback: try 'name' field
      q = query(collection(db, 'addPatronDetails'), where('name', '==', nameToFind));
      snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { docId: d.id, billing: d.data()?.billingAddress || '' };
      }
      return null;
    } catch (err) {
      console.error('findPatronDocByName error:', err);
      return null;
    }
  };
  // ----------------- end helpers -----------------

  const onUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    // Only allow one file at a time
    if (uploadedFiles.length > 0) {
      triggerSnackbar('Please remove the existing file before uploading a new one.');
      return;
    }
    try {
      setUploading(true);
      const file = files[0]; // Take only the first file
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
    try {
      // 1) Resolve patron doc by client code (D2C) or patron name (others)
      let patronDocId = '';
      let patronData = null;
      if (requestType === 'D2C' && selectedClientCode) {
        const qPat = query(collection(db, 'addPatronDetails'), where('patronBusinessID', '==', selectedClientCode));
        const snap = await getDocs(qPat);
        snap.forEach((d) => { if (!patronDocId) { patronDocId = d.id; patronData = d.data(); } });
      } else if (requestType !== 'D2C' && patronName) {
        const qPat = query(collection(db, 'addPatronDetails'), where('patronName', '==', patronName.trim()));
        const snap = await getDocs(qPat);
        snap.forEach((d) => { if (!patronDocId) { patronDocId = d.id; patronData = d.data(); } });
      }

      if (!patronDocId || !patronData) {
        triggerSnackbar('Could not resolve patron record. Please select a valid Client Code or Patron Name.');
        return;
      }

      // 2) Resolve LM name from patronMaster by email
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

      // 4) Build timestamps
      const now = new Date();
      const createdAt = Timestamp.fromDate(now);
      const taskDate = createdAt;
      const taskAssignDate = createdAt;
      const due = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
      const taskDueDate = Timestamp.fromDate(due);
      const taskRecievedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 5) Patron details
      const patronCity = patronData?.city || '';
      const patronAddress = patronData?.billingAddress || '';
      const patronID = patronData?.patronBusinessID || '';
      const patronRef = `/addPatronDetails/${patronDocId}`;
      const lmRef = patronData?.lmRef || '';
      const patronNameResolved = requestType === 'D2C' ? (patronData?.patronName || '') : patronName;



      // 6) Task payload
      const payload = {
        assignedLMName: assignedLMName || '',
        createdAt,
        createdBy: user?.email || '',
        lmNumber: lmNumber || '',
        lmRef: lmRef || '',
        location: patronCity || '',
        patronName: patronNameResolved || '',
        patronAddress: patronAddress || '',
        patronCity: patronCity || '',
        clientCode: patronID || '',
        patronID: patronID || '',
        patronRef,
        taskAssignDate,
        taskCategory: 'Trained Manpower',
        taskType: 'Associates',
        isCockpitTaskCreated: false,
        isDelayed: false,
        isOTSTask: false,
        isTaskDisabled: false,
        taskDate,
        taskDescription: scopeOfWork || '',
        primaryRole: selectedPrimaryRole || '',
        requirementType: requirementType || '',
        taskDueDate,
        taskOwner: assignedLMName || '',
        taskRecievedTime,
        taskSubCategory: 'Recruitment',
        requestType,
        requirementType,
        primaryRole: selectedPrimaryRole,
        ethnicityPreference: selectedEthnicity,
        gender,
        language: selectedLanguage,
        workingHours,
        salaryRange,
        lastComment,
        advancePaymentReceived,
        attachments: uploadedFiles,
        roleSpecificData: roleSpecificFields
      };

      // ✅ 7) Save to createTaskCollection
      // await addDoc(collection(db, 'createTaskCollection'), payload);



      // ✅ 8) Generate requestID and save to patronAddRequest
      const dynamicCode = 'ASR'; // or any prefix you use
      const qCount = await getDocs(collection(db, 'patronAddRequest'));
      const existingCount = qCount.size;

      const nowDart = new Date();
      const yy = String(nowDart.getFullYear()).slice(-2);
      const mm = String(nowDart.getMonth() + 1).padStart(2, '0');
      const dd = String(nowDart.getDate()).padStart(2, '0');
      const datePart = `${yy}${mm}${dd}`;
      const requestCountPart = (existingCount + 1).toString();

      const requestID = `${datePart}${dynamicCode}${requestCountPart}`;


      const patronload = {
        assignedLMName: assignedLMName || '',
        createdAt,
        createdBy: user?.email || '',
        clientCode: patronID || '',
        lmNumber: lmNumber || '',
        lmRef: lmRef || '',
        lmEmail: user?.email || '',
        location: patronCity || '',
        patronName: patronNameResolved || '',
        patronAddress: patronAddress || '',
        patronCity: patronCity || '',
        patronID: patronID || '',
        patronRef,
        taskAssignDate,
        status: 'Pending',
        taskCategory: 'Trained Manpower',
        taskType: 'Associates',
        isExpand: false,
        taskDate,
        taskDescription: scopeOfWork || '',
        scopeOfWork: scopeOfWork || '',
        primaryRole: selectedPrimaryRole || '',
        requirementType: requirementType || '',
        taskDueDate,
        taskOwner: assignedLMName || '',
        taskRecievedTime,
        taskSubCategory: 'Recruitment',
        requestType,
        requirementType,
        primaryRole: selectedPrimaryRole,
        ethnicityPreference: selectedEthnicity,
        gender,
        language: selectedLanguage,
        workingHours,
        salaryRange,
        lastComment,
        advancePaymentReceived,
        requestOpenDate: requestOpenDate,
        requestID: requestID || '',
        roleSpecificData: roleSpecificFields
      };

      // ✅ 9) First save to patronAddRequest
      const patronAddRequestRef = await addDoc(collection(db, 'patronAddRequest'), patronload);

      // ✅ 10) Build associateRef and save to createTaskCollection
      const associateRef = `/patronAddRequest/${patronAddRequestRef.id}`;
      const taskWithAssociateRef = {
        ...payload,
        associateRef,
        requestID // ← new field
      };

      await addDoc(collection(db, 'createTaskCollection'), taskWithAssociateRef);

      triggerSnackbar('Task successfully created and linked!');
      // Reset all form fields
      setRequestType('D2C');
      setSelectedClientCode('');
      setFamilyMembers([]);
      setAssignedBy('');
      setPatronName('');
      setRequirementType('');
      setSelectedPrimaryRole('');
      setSelectedEthnicity('');
      setGender('');
      setSelectedLanguage('');
      setWorkingHours('');
      setAddressMode('registered');
      setRegisteredAddress('');
      setOtherAddress('');
      setSalaryRange('');
      setLastComment('');
      setScopeOfWork('');
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
    }
  };

  // ✅ REPLACE the return statement starting from line ~600 with this responsive version:

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-orange-600 mb-4 sm:mb-6">
          Associate Request Form
        </h1>

        {/* Request type - Stack vertically on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4 sm:mb-6">
          <span className="text-sm sm:text-base font-medium">Request Type:</span>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {['D2C', 'B2B', 'Non-D2C', 'Bench'].map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
                <input
                  type="radio"
                  name="requestType"
                  checked={requestType === t}
                  onChange={() => setRequestType(t)}
                  className="accent-orange-600"
                />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {requestType === 'D2C' ? (
            <SearchableSelect
              label="Client Code"
              placeholder="Select Client Code"
              items={clientCodes.map((c) => ({ label: c.label, value: c.value }))}
              value={selectedClientCode}
              onChange={setSelectedClientCode}
              required
            />
          ) : (
            <div className="relative">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Patron Name
              </label>

              <input
                type="text"
                className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Enter Patron Name"
                value={patronName}
                onChange={(e) => {
                  setPatronName(e.target.value);
                  setShowPatronSuggestions(true);
                  setSuggestionIndex(-1);
                }}
                onFocus={() => setShowPatronSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPatronSuggestions(false), 200)}
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
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 sm:max-h-56 overflow-auto">
                  {allPatronNames.filter(n =>
                    n.value.toLowerCase().includes((patronName || '').toLowerCase())
                  ).slice(0, 50).map((n, idx) => (
                    <div
                      key={n.value}
                      ref={(el) => (suggestionRefs.current[idx] = el)}
                      className={`px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer ${idx === suggestionIndex ? 'bg-orange-50' : ''
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

          {/* Task Assigned By */}
          <SimpleSelect
            label="Task Assigned By"
            placeholder="Select"
            items={familyMembers}
            value={assignedBy}
            onChange={setAssignedBy}
          />

          {/* Requirement Type */}
          <div className="md:col-span-1 xl:col-span-1">
            <SimpleSelect
              label="Requirement Type"
              placeholder="Select"
              items={[
                { label: 'New', value: 'New' },
                { label: 'Replacement', value: 'Replacement' }
              ]}
              value={requirementType}
              onChange={setRequirementType}
            />
          </div>

          {/* Advance Payment Received */}
          <div className="md:col-span-1 xl:col-span-1">
            <SimpleSelect
              label="Advance Payment Received"
              placeholder="Select"
              items={[
                { label: 'Yes', value: 'Yes' },
                { label: 'No', value: 'No' },
                { label: 'NA', value: 'NA' }
              ]}
              value={advancePaymentReceived}
              onChange={setAdvancePaymentReceived}
            />
          </div>

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

          {/* ✅ ADD ROLE-SPECIFIC FIELDS COMPONENT HERE */}
          <RoleSpecificFields
            selectedPrimaryRole={selectedPrimaryRole}
            fields={roleSpecificFields}
            setFields={setRoleSpecificFields}
          />

          {/* Ethnicity Preference */}
          <div className="md:col-span-1 xl:col-span-1">
            <SimpleSelect
              label="Ethnicity Preference"
              placeholder="Select"
              items={ethnicities}
              value={selectedEthnicity}
              onChange={setSelectedEthnicity}
            />
          </div>

          {/* Gender */}
          <div className="md:col-span-1 xl:col-span-1">
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
          </div>

          {/* Language */}
          <div className="md:col-span-1 xl:col-span-1">
            <SimpleSelect
              label="Language"
              placeholder="Select"
              items={languages}
              value={selectedLanguage}
              onChange={setSelectedLanguage}
            />
          </div>

          {/* Working Hours */}
          <div className="md:col-span-1 xl:col-span-1">
            <SimpleSelect
              label="Working Hours"
              placeholder="Select"
              items={workingHourOptions.map((x) => ({ label: x, value: x }))}
              value={workingHours}
              onChange={setWorkingHours}
            />
          </div>

          {/* Salary Range */}
          <div className="md:col-span-1 xl:col-span-1">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Salary / Salary Range
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="e.g. 18,000 - 22,000"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
            />
          </div>

          {/* Last Comment */}
          <div className="md:col-span-1 xl:col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Last Comment
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Comment"
              value={lastComment}
              onChange={(e) => setLastComment(e.target.value)}
            />
          </div>

          {/* Request Open Date */}
          <div className="md:col-span-1 xl:col-span-1">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Request Open Date
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={requestOpenDate}
              onChange={(e) => setRequestOpenDate(e.target.value)}
            />
          </div>

          {/* Client's Address */}
          <div className="md:col-span-1 xl:col-span-1">
            <SimpleSelect
              label="Client's Address"
              placeholder="Select"
              items={[
                { label: "Client's Registered Address", value: 'registered' },
                { label: 'Other', value: 'other' }
              ]}
              value={addressMode}
              onChange={(v) => setAddressMode(v)}
            />
          </div>

          <div className="md:col-span-1 xl:col-span-2">
            {addressMode === 'registered' ? (
              <textarea
                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-3 py-2 sm:py-3 min-h-20 text-sm sm:text-base"
                placeholder="Address"
                value={registeredAddress}
                readOnly
              />
            ) : (
              <textarea
                className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 sm:py-3 min-h-20 text-sm sm:text-base"
                placeholder="Type address"
                value={otherAddress}
                onChange={(e) => setOtherAddress(e.target.value)}
              />
            )}
          </div>

          {/* Scope of Work */}
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Scope of Work in Detail
            </label>
            <textarea
              className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 sm:py-3 min-h-24 sm:min-h-28 text-sm sm:text-base"
              placeholder="Describe the work scope"
              value={scopeOfWork}
              onChange={(e) => setScopeOfWork(e.target.value)}
            />
          </div>

          {/* Upload documents */}
          {advancePaymentReceived === 'Yes' && (
            <div className="md:col-span-2 xl:col-span-3 flex flex-col items-center">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Upload Documents
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center bg-gray-50 w-full max-w-xl">
                <UploadCloud className="w-6 sm:w-8 h-6 sm:h-8 text-orange-600 mb-2" />
                <p className="text-xs sm:text-sm text-gray-700 mb-3 text-center px-2">
                  Drag & drop files here, or click to browse
                </p>
                <label className="inline-flex items-center gap-2 bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-md cursor-pointer hover:bg-orange-700 text-sm sm:text-base">
                  <UploadCloud className="w-4 h-4" />
                  <span>Select Files</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => onUploadFiles(Array.from(e.target.files || []))}
                  />
                </label>
                {uploading && (
                  <span className="text-xs sm:text-sm text-gray-600 mt-2">
                    Uploading...
                  </span>
                )}
              </div>

              {uploadedFiles.length > 0 && (
                <ul className="mt-3 space-y-2 w-full max-w-xl">
                  {uploadedFiles.map((f, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <a
                          className="text-orange-600 underline truncate"
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {f.name}
                        </a>
                      </div>
                      <button
                        type="button"
                        className="p-1 hover:bg-gray-100 rounded flex-shrink-0 ml-2"
                        onClick={async () => {
                          try {
                            if (f.path) await deleteObject(storageRef(storage, f.path));
                          } catch (e) { }
                          setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )};

          {/* Submit Button */}
          <div className="pt-4 md:col-span-2 xl:col-span-3 flex justify-center">
            <button
              type="button"
              onClick={onCreateTask}
              className="w-full sm:w-auto sm:min-w-[280px] bg-orange-600 text-white rounded-md px-6 py-3 text-sm sm:text-base font-medium hover:bg-orange-700 transition-colors"
            >
              Create Task
            </button>
          </div>
        </div>
      </div>
      <Snackbar />
    </div>
  )
}
