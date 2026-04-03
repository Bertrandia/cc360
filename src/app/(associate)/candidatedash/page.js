'use client';
import { useEffect, useState, useRef } from "react";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc
} from "firebase/firestore";
import { app } from "../../firebase/config";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ExcelTableTemplate from "../../components/ExcelTableTemplate";
import { triggerSnackbar } from "../../components/snakbar";
import Snackbar from "../../components/snakbar";
import Nav from "../../components/navbar";
import RegisterAssociatePopup from "../../components/RegisterPopup";
import { UserPlus } from "lucide-react";
import { NormalCandidateCards, StatusBadge } from "../../components/expandabledrawer";


function MultiSelectDropdown({ options, selected, setSelected, placeholder = "Select Options" }) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);

    const handleSelect = (option) => {
        if (selected.includes(option)) {
            setSelected(selected.filter((item) => item !== option));
        } else {
            setSelected([...selected, option]);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setSearchTerm(""); // Clear search when closing
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => setOpen(!open)}
                className="border rounded px-3 py-2 bg-gray-50 flex justify-between items-center cursor-pointer text-sm"
            >
                <span className="text-gray-700 truncate">
                    {selected.length > 0 ? `${selected.length} selected` : placeholder}
                </span>
                <span className="text-gray-500 flex-shrink-0 ml-2">▼</span>
            </div>

            {open && (
                <div className="absolute z-20 w-full bg-white border rounded-lg mt-1 shadow-md max-h-64 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b sticky top-0 bg-white">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <label
                                    key={`${option}-${index}`}
                                    className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(option)}
                                        onChange={() => handleSelect(option)}
                                        className="mr-2 accent-blue-600 flex-shrink-0"
                                    />
                                    <span className="break-words">{option}</span>
                                </label>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selected.map((item, index) => (
                        <span key={`selected-${item}-${index}`} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                            <span className="truncate max-w-[120px]">{item}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelected(selected.filter(i => i !== item));
                                }}
                                className="text-blue-600 hover:text-blue-800 font-bold flex-shrink-0"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

const db = getFirestore();
const storage = getStorage(app);  // Add this line

const uploadFileToStorage = async (file, candidateId, fileType) => {
    if (!file) return null;

    try {
        const timestamp = Date.now();
        const fileName = `${candidateId}_${fileType}_${timestamp}_${file.name}`;
        const storageRef = ref(storage, `candidates/${candidateId}/${fileName}`);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    } catch (error) {
        console.error(`Error uploading ${fileType}:`, error);
        throw error;
    }
};

export default function CandidateDashboard() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [candidateDetailsCache, setCandidateDetailsCache] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});
    const [openDrawerId, setOpenDrawerId] = useState(null);

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCandidate, setEditingCandidate] = useState(null);
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);


    // Fetch main data ONLY (fast initial load)
    const fetchData = async () => {
        setLoading(true);
        try {
            const collRef = collection(db, "patronYcwHelps");
            const snapshot = await getDocs(collRef);
            const data = snapshot.docs.map((doc, index) => ({
                ...doc.data(),

                // 🔑 FORCE UNIQUE ROW ID FOR UI ONLY
                id: `${doc.id}-${index}`,   // unique, stable per render
                firestoreId: doc.id,
            }));

            setRows(data);
        } catch (err) {
            console.error("Error fetching data:", err);
        }
        setLoading(false);
    };

    // Since all data is in the same collection, we just cache the row data
    const fetchCandidateDetails = async (rowId, row) => {
        if (candidateDetailsCache[rowId]) {
            return;
        }

        setLoadingDetails(prev => ({ ...prev, [rowId]: true }));

        setCandidateDetailsCache(prev => ({
            ...prev,
            [rowId]: [row]
        }));

        setLoadingDetails(prev => ({ ...prev, [rowId]: false }));
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle edit click
    const handleEditClick = (candidate) => {
        setEditingCandidate(candidate);
        setEditModalOpen(true);
    };

    const handleToggleRemoved = async (candidate) => {
        try {
            const currentValue = candidate.isRemoved === true;
            const newValue = !currentValue;

            const candidateRef = doc(db, "patronYcwHelps", candidate.firestoreId);
            await updateDoc(candidateRef, {
                isRemoved: newValue
            });

            // Update local state
            setRows(prevRows =>
                prevRows.map(row =>
                    row.firestoreId === candidate.firestoreId
                        ? { ...row, isRemoved: newValue }
                        : row
                )
            );

            // Update cache if drawer is open
            if (openDrawerId === candidate.id) {
                setCandidateDetailsCache(prev => ({
                    ...prev,
                    [candidate.id]: [{
                        ...candidate,
                        isRemoved: newValue
                    }]
                }));
            }

            triggerSnackbar(
                `Candidate ${newValue ? 'removed' : 'activated'} successfully!`,
                'warning'
            );
        } catch (error) {
            console.error("Error toggling isRemoved:", error);
            triggerSnackbar("Error updating candidate status: " + error.message, 'error');
        }
    };

    // Main table columns (displayed in the main table)
    const columns = [
        {
            key: "edit",
            label: "Edit",
            render: (_, row) => (
                <button
                    onClick={() => handleEditClick(row)}
                    className=" hover:bg-blue-500 text-white px-1 py-1 rounded  flex items-center "
                >
                    ✏️
                </button>
            ),
        },
        { key: "name", label: "Name", bold: true },
        { key: "profession", label: "Profession", bold: true },
        {
            key: "createdTime",
            label: "Date",
            render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : ""
        },
        { key: "city", label: "City" },
        { key: "mobileNumber", label: "Mobile" },
        {
            key: "isRemoved",
            label: "Candidate Active Status",
            render: (val, row) => {
                const isRemoved = val === true;
                const isNotSet = val === undefined || val === null;

                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRemoved(row);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${isRemoved
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : isNotSet
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                    >
                        {isRemoved ? '🚫 Not Active' : isNotSet ? 'Not Set' : '✅ Active'}
                    </button>
                );
            }
        },
    ];


    // Render function for the drawer content
    const renderDrawerContent = (row, rowId) => {
        const candidateDetails = candidateDetailsCache[rowId] || [];
        const isLoading = loadingDetails[rowId];

        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <div className="text-gray-600">Loading candidate details...</div>
                </div>
            );
        }

        if (candidateDetails.length === 0) {
            return (
                <div className="text-gray-500 p-4 text-center bg-white rounded border">
                    No candidate details found for this request
                </div>
            );
        }

        // Define columns for candidateDetails drawer (additional details)
        const displayFields = [
            { key: "gender", label: "Gender" },
            { key: "age", label: "Age" },
            { key: "educationQualification", label: "Education" },
            { key: "mobileNumber", label: "Mobile Number" },
            { key: "primaryLanguage", label: "Language" },
            { key: "otp", label: "OTP" },
            // { key: "id", label: "ID" },
            { key: "religion", label: "Religion" },
            { key: "source", label: "Source" },
            { key: "status", label: "Status", render: (val) => <StatusBadge status={val || 'N/A'} /> },
        ];

        return (
            <div className="bg-gray-50 p-4 sm:p-6">
                {candidateDetails.map((candidate, candIdx) => (
                    <NormalCandidateCards
                        key={candidate.id || candIdx}
                        candidate={candidate}
                        patronData={row}
                        index={candIdx}
                        displayFields={displayFields}
                    />
                ))}
            </div>
        );
    };

    // Download CSV function
    const downloadCSV = (filteredData) => {
        try {
            // Define which fields to include in CSV - CUSTOMIZE THIS ARRAY
            const csvFields = [
                { key: 'id', label: 'ID' },
                { key: 'name', label: 'Name' },
                { key: 'createdTime', label: 'Date', isDate: true },
                //             For date fields, add isDate: true:
                // javascript{ key: 'dob', label: 'Date of Birth', isDate: true }
                { key: 'profession', label: 'Profession' },
                { key: 'city', label: 'City' },
                { key: 'gender', label: 'Gender' },
                { key: 'age', label: 'Age' },
                { key: 'educationQualification', label: 'Education' },
                { key: 'mobileNumber', label: 'Mobile Number' },
                { key: 'primaryLanguage', label: 'Language' },
                { key: 'religion', label: 'Religion' },
                { key: 'source', label: 'Source' },
                { key: 'status', label: 'Status' },
            ];

            // Create CSV header
            const headers = csvFields.map(field => `"${field.label}"`).join(',');
            let csvContent = headers + '\n';

            // Add data rows (this will use filtered data from ExcelTableTemplate)
            filteredData.forEach(row => {
                const rowData = csvFields.map(field => {
                    let value = row[field.key] || '';

                    // Handle date fields
                    if (field.isDate && value) {
                        if (value.toDate) {
                            value = value.toDate().toLocaleDateString('en-GB');
                        } else if (value instanceof Date) {
                            value = value.toLocaleDateString('en-GB');
                        }
                    }

                    // Escape quotes and wrap in quotes
                    return `"${String(value).replace(/"/g, '""')}"`;
                });

                csvContent += rowData.join(',') + '\n';
            });

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Candidates_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading CSV:', error);
            triggerSnackbar('Error downloading CSV: ' + error.message, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Nav />
            <div className="p-3 sm:p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-lg text-gray-600">Loading Candidate dashboard...</p>
                        </div>
                    </div>
                ) : (
                    <ExcelTableTemplate
                        title="Candidate Dashboard"
                        columns={columns}
                        data={rows}
                        defaultRowsPerPage={10}
                        enableRowClick={true}
                        showCandidateCount={false}
                        filters={[
                            { key: "name", label: "Name" },
                            { key: "profession", label: "Profession" },
                            { key: "city", label: "City" },
                        ]}
                        showDateFilter={true}  // ✅ Enable date filter
                        dateFilterKey="createdTime"
                        onDrawerOpen={(rowId, row) => {
                            setOpenDrawerId(rowId);
                            fetchCandidateDetails(rowId, row);
                        }}
                        drawerContent={renderDrawerContent}
                        expandedRow={openDrawerId}
                        onDrawerClose={() => setOpenDrawerId(null)}
                        additionalButtons={[
                            {
                                label: "Register Associate",
                                onClick: () => setShowRegisterDialog(true),
                                icon: <UserPlus className="w-4 h-4" />,
                                color: "orange",
                                size: "sm",
                                primary: true
                            },
                            {
                                label: "Download CSV",
                                onClick: (filteredData) => downloadCSV(filteredData),
                                icon: <span>📥</span>,
                                color: "green",
                                size: "sm",
                                primary: true
                            }
                        ]}
                    />
                )}
            </div>

            {/* Edit Modal */}
            {editModalOpen && editingCandidate && (
                <EditCandidateModal
                    candidate={editingCandidate}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditingCandidate(null);
                    }}
                    onUpdate={async () => {
                        setEditModalOpen(false);
                        setEditingCandidate(null);
                        await fetchData();
                    }}
                    setRows={setRows}
                    setCandidateDetailsCache={setCandidateDetailsCache}
                />
            )}
            {/* Register Associate Dialog */}
            <RegisterAssociatePopup
                open={showRegisterDialog}
                onClose={() => setShowRegisterDialog(false)}
                onSuccess={async (newCandidateData) => {
                    if (!newCandidateData || !newCandidateData.firestoreId) {
                        console.error("Invalid candidate data received");
                        return;
                    }

                    // ✅ Create properly formatted candidate object
                    const newCandidate = {
                        ...newCandidateData,
                        id: `${newCandidateData.firestoreId}-0`, // Use Firestore ID
                        firestoreId: newCandidateData.firestoreId
                    };

                    // Add to beginning of rows
                    setRows(prevRows => [newCandidate, ...prevRows]);

                    triggerSnackbar("Candidate registered successfully!", "success");
                    setShowRegisterDialog(false);
                }}
            />

            <Snackbar />
        </div>
    );
}

const refreshDrawerAfterEdit = async (candidateId) => {
    if (openDrawerId) {
        // Find the updated row
        const updatedRow = rows.find(r => r.id === openDrawerId);
        if (updatedRow) {
            // Refresh the drawer content
            setCandidateDetailsCache(prev => ({
                ...prev,
                [openDrawerId]: [updatedRow]
            }));
        }
    }
};

// Edit Candidate Modal Component
function EditCandidateModal({ candidate, onClose, onUpdate, setRows, setCandidateDetailsCache }) {
    const [sources, setSources] = useState([]);
    const [professions, setProfessions] = useState([]);
    const [openDrawerId, setOpenDrawerId] = useState(null);
    const [referralCandidates, setReferralCandidates] = useState([]);
    const [uploading, setUploading] = useState(false);
    const normalizeSelectValue = (value) => {
        if (Array.isArray(value)) {
            return value[0] || "";
        }
        return value ?? "";
    };
    const [formData, setFormData] = useState({
        source: candidate.source || "",
        name: candidate.name || "",
        mobileNumber: candidate.mobileNumber || "",
        work: candidate.profession || "",
        gender: candidate.gender || "",
        alternatePhoneNumber: candidate.alternatePhoneNumber || "",
        workTime: candidate.workTime || "",
        educationQualification: candidate.educationQualification || "",
        dob: candidate.dob || "",
        maritalStatus: candidate.maritalStatus || "",
        previousMobileNumber: candidate.previousMobileNumber || "",
        religion: candidate.religion || "",
        age: candidate.age || "",
        medicalCondition: candidate.medicalCondition || "",
        primarySkill: candidate.primarySkill || "",
        secondarySkill: candidate.secondarySkill || "",
        tertiarySkill: normalizeSelectValue(candidate.tertiarySkill),
        primaryLanguage: candidate.primaryLanguage || "",
        secondaryLanguage: candidate.secondaryLanguage || "",
        canCookVegNonVeg: candidate.canCookVegNonVeg || "",
        cuisinesKnown: candidate.cuisinesKnown || "",
        totalExperience: candidate.totalExperience || "",
        lastJobType: candidate.lastJobType || "",
        lastJobSalary: candidate.lastJobSalary || "",
        lastJobDuration: candidate.lastJobDuration || "",
        reasonForLeaving: candidate.reasonForLeaving || "",
        flat: candidate.flat || "",
        society: candidate.society || "",
        landmark: candidate.landmark || "",
        city: candidate.city || "",
        state: candidate.state || "",
        pincode: candidate.pincode || "",
        sameAsCurrentAddress: false,
        permanentFlat: candidate.permanentFlat || "",
        permanentSociety: candidate.permanentSociety || "",
        permanentLandmark: candidate.permanentLandmark || "",
        permanentCity: candidate.permanentCity || "",
        permanentState: candidate.permanentState || "",
        permanentPincode: candidate.permanentPincode || "",
        accountHolderName: candidate.accountHolderName || "",
        accountNumber: candidate.accountNumber || "",
        ifscCode: candidate.ifscCode || "",
        upiId: candidate.upiId || "",
        upiId: candidate.upiId || "",
        bankPassbook: null,
        drivingLicense: null,
        referalNames: Array.isArray(candidate.referalNames) ? candidate.referalNames : [],
        emergencyNumber: candidate.emergencyNumber || "",
        aadharCard: null,
        resume: null,
        profileForm: null,
        trialForm: null,
        accomodationForm: null,
        backgroundVerification: null,
        image: null,
    });

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const sourcesSnapshot = await getDocs(collection(db, "sourcingChannel"));
                const sourcesData = sourcesSnapshot.docs.map(doc => doc.data().channelName);
                setSources(sourcesData);

                const professionsSnapshot = await getDocs(collection(db, "patronYcwHelpsProfession"));
                const professionsData = professionsSnapshot.docs.map(doc => doc.data().professionName);
                setProfessions(professionsData);
            } catch (err) {
                console.error("Error fetching dropdown data:", err);
            }
        };
        fetchDropdownData();
    }, []);

    // Fetch referral candidates when source is "Reference"
    useEffect(() => {
        if (formData.source !== "Reference") {
            setReferralCandidates([]);
            return;
        }

        const fetchReferralCandidates = async () => {
            try {
                const candidatesRef = collection(db, "patronYcwHelps");
                const snapshot = await getDocs(candidatesRef);

                const candidates = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        name: doc.data().name,
                        isRemoved: doc.data().isRemoved
                    }))
                    .filter(cand =>
                        cand.name &&
                        (cand.isRemoved === false ||
                            cand.isRemoved === undefined ||
                            cand.isRemoved === null)
                    );

                setReferralCandidates(candidates);
            } catch (err) {
                console.error("Error fetching referral candidates:", err);
            }
        };

        fetchReferralCandidates();
    }, [formData.source]);

    const handleUpdate = async () => {
        // Validation for Name
        if (!formData.name.trim()) {
            triggerSnackbar("Name is mandatory", "error");
            return;
        }

        // Check for space in first two letters of name
        const cleanName = formData.name.trim().replace(/[^A-Za-z\s]/g, '');
        if (cleanName.length >= 2) {
            const firstTwoChars = cleanName.substring(0, 2);
            if (firstTwoChars.includes(' ')) {
                triggerSnackbar("Name cannot have space in the first two letters", "error");
                return;
            }
        }

        // Validation for Gender
        if (!formData.gender) {
            triggerSnackbar("Gender is mandatory", "error");
            return;
        }

        // Validation for Mobile Number
        if (!formData.mobileNumber.trim()) {
            triggerSnackbar("Phone Number is mandatory", "error");
            return;
        }

        const cleanMobile = formData.mobileNumber.replace(/\D/g, '');
        if (cleanMobile.length < 10) {
            triggerSnackbar("Mobile Number must be at least 10 digits", "error");
            return;
        }

        if (formData.mobileNumber.includes(' ')) {
            triggerSnackbar("Mobile Number cannot contain spaces", "error");
            return;
        }

        try {
            setUploading(true);
            const generateCandidateId = (name, mobileNumber, gender) => {
                const cleanName = name.trim().replace(/[^A-Za-z]/g, '');
                if (cleanName.length < 2) return "false";

                const cleanMobile = mobileNumber.replace(/\D/g, '');
                if (cleanMobile.length < 10) return "false";

                const firstTwoLetters = cleanName.substring(0, 2).toUpperCase();
                const genderInitial = gender.trim()[0].toUpperCase();
                return `${firstTwoLetters}${cleanMobile}${genderInitial}`;
            };

            const newCandidateId = generateCandidateId(
                formData.name,
                formData.mobileNumber,
                formData.gender
            );

            if (newCandidateId === "false") {
                triggerSnackbar("Invalid data for generating candidate ID", "error");
                return;
            }

            // ✅ UPLOAD NEW FILES TO FIREBASE STORAGE
            const uploadedFiles = {};

            if (formData.image) {
                uploadedFiles.imageUrl = await uploadFileToStorage(formData.image, newCandidateId, 'image');
            }
            if (formData.aadharCard) {
                uploadedFiles.aadharCardUrl = await uploadFileToStorage(formData.aadharCard, newCandidateId, 'aadhar');
            }
            if (formData.resume) {
                uploadedFiles.resumeUrl = await uploadFileToStorage(formData.resume, newCandidateId, 'resume');
            }
            if (formData.profileForm) {
                uploadedFiles.profileFormUrl = await uploadFileToStorage(formData.profileForm, newCandidateId, 'profile');
            }
            if (formData.trialForm) {
                uploadedFiles.trialFormUrl = await uploadFileToStorage(formData.trialForm, newCandidateId, 'trial');
            }
            if (formData.accomodationForm) {
                uploadedFiles.accomodationFormUrl = await uploadFileToStorage(formData.accomodationForm, newCandidateId, 'accommodation');
            }
            if (formData.backgroundVerification) {
                uploadedFiles.backgroundVerificationUrl = await uploadFileToStorage(formData.backgroundVerification, newCandidateId, 'background');
            }
            if (formData.bankPassbook) {
                uploadedFiles.bankPassbookUrl = await uploadFileToStorage(formData.bankPassbook, newCandidateId, 'passbook');
            }
            if (formData.drivingLicense) {
                uploadedFiles.drivingLicenseUrl = await uploadFileToStorage(formData.drivingLicense, newCandidateId, 'license');
            }

            const candidateRef = doc(db, "patronYcwHelps", candidate.firestoreId);
            await updateDoc(candidateRef, {
                id: newCandidateId,
                candidateId: newCandidateId,
                name: formData.name,
                mobileNumber: formData.mobileNumber,
                alternatePhoneNumber: formData.alternatePhoneNumber,
                gender: formData.gender,
                age: formData.age,
                profession: formData.work,
                source: formData.source,
                workTime: formData.workTime,
                educationQualification: formData.educationQualification,
                maritalStatus: formData.maritalStatus,
                religion: formData.religion,
                medicalCondition: formData.medicalCondition,
                primarySkill: formData.primarySkill,
                secondarySkill: formData.secondarySkill,
                tertiarySkill: formData.tertiarySkill,
                primaryLanguage: formData.primaryLanguage,
                secondaryLanguage: formData.secondaryLanguage,
                totalExperience: formData.totalExperience,
                lastJobType: formData.lastJobType,
                lastJobSalary: formData.lastJobSalary,
                lastJobDuration: formData.lastJobDuration,
                reasonForLeaving: formData.reasonForLeaving,
                flat: formData.flat,
                society: formData.society,
                landmark: formData.landmark,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                permanentFlat: formData.sameAsCurrentAddress ? formData.flat : formData.permanentFlat,
                permanentSociety: formData.sameAsCurrentAddress ? formData.society : formData.permanentSociety,
                permanentLandmark: formData.sameAsCurrentAddress ? formData.landmark : formData.permanentLandmark,
                permanentCity: formData.sameAsCurrentAddress ? formData.city : formData.permanentCity,
                permanentState: formData.sameAsCurrentAddress ? formData.state : formData.permanentState,
                permanentPincode: formData.sameAsCurrentAddress ? formData.pincode : formData.permanentPincode,
                accountHolderName: formData.accountHolderName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode,
                upiId: formData.upiId,
                emergencyNumber: formData.emergencyNumber,
                referalNames: formData.referalNames,
                // ✅ SAVE URLS INSTEAD OF FILENAMES
                imageUrl: uploadedFiles.imageUrl || candidate.imageUrl || null,
                aadharCardUrl: uploadedFiles.aadharCardUrl || candidate.aadharCardUrl || null,
                resumeUrl: uploadedFiles.resumeUrl || candidate.resumeUrl || null,
                profileFormUrl: uploadedFiles.profileFormUrl || candidate.profileFormUrl || null,
                trialFormUrl: uploadedFiles.trialFormUrl || candidate.trialFormUrl || null,
                accomodationFormUrl: uploadedFiles.accomodationFormUrl || candidate.accomodationFormUrl || null,
                backgroundVerificationUrl: uploadedFiles.backgroundVerificationUrl || candidate.backgroundVerificationUrl || null,
                bankPassbookUrl: uploadedFiles.bankPassbookUrl || candidate.bankPassbookUrl || null,
                drivingLicenseUrl: uploadedFiles.drivingLicenseUrl || candidate.drivingLicenseUrl || null,
            });

            const oldRowId = candidate.id;

            const updatedRowData = {
                ...candidate,
                ...formData,
                id: `${candidate.firestoreId}-${candidate.id.split('-')[1]}`,
                candidateId: newCandidateId,
                profession: formData.work,
                // ✅ UPDATE LOCAL STATE WITH URLS
                imageUrl: uploadedFiles.imageUrl || candidate.imageUrl || null,
                aadharCardUrl: uploadedFiles.aadharCardUrl || candidate.aadharCardUrl || null,
                resumeUrl: uploadedFiles.resumeUrl || candidate.resumeUrl || null,
                profileFormUrl: uploadedFiles.profileFormUrl || candidate.profileFormUrl || null,
                trialFormUrl: uploadedFiles.trialFormUrl || candidate.trialFormUrl || null,
                accomodationFormUrl: uploadedFiles.accomodationFormUrl || candidate.accomodationFormUrl || null,
                backgroundVerificationUrl: uploadedFiles.backgroundVerificationUrl || candidate.backgroundVerificationUrl || null,
                bankPassbookUrl: uploadedFiles.bankPassbookUrl || candidate.bankPassbookUrl || null,
                drivingLicenseUrl: uploadedFiles.drivingLicenseUrl || candidate.drivingLicenseUrl || null,
            };

            setRows(prevRows =>
                prevRows.map(row =>
                    row.firestoreId === candidate.firestoreId
                        ? updatedRowData
                        : row
                )
            );

            setCandidateDetailsCache(prev => ({
                ...prev,
                [oldRowId]: [updatedRowData]
            }));

            triggerSnackbar("Candidate updated successfully!", "success");
            setTimeout(() => {
                onClose();
            }, 400);
        } catch (error) {
            console.error("Error updating candidate:", error);
            triggerSnackbar("Error updating candidate: " + error.message, "error");
        } finally {
            setUploading(false); // Add this
        }
    };

    const languages = ["Hindi", "English", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", "Urdu", "Kannada", "Malayalam"];

    const getInputClass = (value) => {
        const baseClass = "border rounded px-3 py-2";

        // handle null / undefined
        if (value === null || value === undefined) {
            return `${baseClass} bg-gray-50`;
        }

        // if value is a string
        if (typeof value === "string") {
            return value.trim() !== ""
                ? `${baseClass} bg-blue-50 border-blue-400 border-2`
                : `${baseClass} bg-gray-50`;
        }

        // if value is number / boolean / date / timestamp
        if (typeof value === "number" || typeof value === "boolean" || value instanceof Date) {
            return `${baseClass} bg-blue-50 border-blue-400 border-2`;
        }

        // Firestore Timestamp support
        if (value?.toDate) {
            return `${baseClass} bg-blue-50 border-blue-400 border-2`;
        }

        return `${baseClass} bg-gray-50`;
    };

    // const handleViewDocument = (documentUrl, documentName) => {
    //     if (!documentUrl) return;

    //     // If it's a URL, open it
    //     if (documentUrl.startsWith('http')) {
    //         window.open(documentUrl, '_blank');
    //         return;
    //     }

    //     // Otherwise, show the filename
    //     triggerSnackbar(`Document: ${documentName}`, 'info');
    // };

    const handleViewDocument = (documentUrl, documentName) => {
        if (!documentUrl) {
            triggerSnackbar("No document uploaded", "warning");
            return;
        }

        // If it's a URL, open it
        if (documentUrl.startsWith('http')) {
            window.open(documentUrl, '_blank');
            return;
        }

        // Otherwise, show the filename (for backward compatibility)
        triggerSnackbar(`Document: ${documentName}`, 'info');
    };


    return (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-2xl font-bold text-gray-900">Edit Candidate&apos;s Details</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {/* Basic Details */}
                    <h3 className="text-xl font-semibold mb-6 ">Basic Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className={getInputClass(formData.source)}>
                            <option value="" disabled>Source</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="text" placeholder="Name*" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={getInputClass(formData.name)} />
                        <input type="text" placeholder="Phone Number*" value={formData.mobileNumber} onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })} className={getInputClass(formData.mobileNumber)} />
                    </div>

                    {formData.source === "Reference" && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Referral Names</label>
                            <MultiSelectDropdown
                                options={referralCandidates.map(c => c.name)}
                                selected={formData.referalNames}
                                setSelected={(val) => setFormData({ ...formData, referalNames: val })}
                                placeholder="Select Referral Names"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <select value={formData.work} onChange={(e) => setFormData({ ...formData, work: e.target.value })} className={getInputClass(formData.work)}>
                            <option value="" disabled>What work can you do*</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className={getInputClass(formData.gender)}>
                            <option value="" disabled>Gender*</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="LGBTQ">LGBTQ</option>
                        </select>
                        <input type="text" placeholder="Family Member Phone" value={formData.alternatePhoneNumber} onChange={(e) => setFormData({ ...formData, alternatePhoneNumber: e.target.value })} className={getInputClass(formData.alternatePhoneNumber)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <select value={formData.workTime} onChange={(e) => setFormData({ ...formData, workTime: e.target.value })} className={getInputClass(formData.workTime)}>
                            <option value="" disabled>Working Hours</option>
                            <option value="Less than 4 hours">Less than 4 hours</option>
                            <option value="4-8 hours">4-8 hours</option>
                            <option value="8-12 hours">8-12 hours</option>
                            <option value="Live In">Live In</option>
                        </select>
                        <select value={formData.educationQualification} onChange={(e) => setFormData({ ...formData, educationQualification: e.target.value })} className={getInputClass(formData.educationQualification)}>
                            <option value="" disabled>Education Qualification</option>
                            <option value="No Education">No Education</option>
                            <option value="5th pass">5th pass</option>
                            <option value="8th pass">8th pass</option>
                            <option value="10th pass">10th pass</option>
                            <option value="12th pass">12th pass</option>
                            <option value="Graduate">Graduate</option>
                            <option value="Post Graduate">Post Graduate</option>
                        </select>
                        <input type="date" placeholder="Date of Birth (DOB)" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className={getInputClass(formData.dob)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <select value={formData.maritalStatus} onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })} className={getInputClass(formData.maritalStatus)}>
                            <option value="" disabled>Marital Status</option>
                            <option value="Married">Married</option>
                            <option value="Unmarried">Unmarried</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Divorce">Divorce</option>
                        </select>
                        <input type="text" placeholder="Previous Mobile Number" value={formData.previousMobileNumber} onChange={(e) => setFormData({ ...formData, previousMobileNumber: e.target.value })} className={getInputClass(formData.previousMobileNumber)} />
                        <select value={formData.religion} onChange={(e) => setFormData({ ...formData, religion: e.target.value })} className={getInputClass(formData.religion)}>
                            <option value="" disabled>Religion</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Muslim">Muslim</option>
                            <option value="Christian">Christian</option>
                            <option value="Sikh">Sikh</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <select value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className={getInputClass(formData.age)}>
                            <option value="" disabled>Age</option>
                            <option value="18 or less">18 or less</option>
                            <option value="18-24 years old">18-24</option>
                            <option value="24-32 years old">24-32</option>
                            <option value="32-40 years old">32-40</option>
                            <option value="40+ years old">40+</option>
                        </select>
                        <input type="text" placeholder="Medical Condition(If Any)" value={formData.medicalCondition} onChange={(e) => setFormData({ ...formData, medicalCondition: e.target.value })} className={getInputClass(formData.medicalCondition)} />
                    </div>

                    {/* Skills Section */}
                    <h3 className="text-xl font-semibold mb-6">Skills / Language</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <select value={formData.primarySkill} onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })} className={getInputClass(formData.primarySkill)}>
                            <option value="" disabled>Primary Skill</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select value={formData.secondarySkill} onChange={(e) => setFormData({ ...formData, secondarySkill: e.target.value })} className={getInputClass(formData.secondarySkill)}>
                            <option value="" disabled>Secondary Skill</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select value={formData.tertiarySkill} onChange={(e) => setFormData({ ...formData, tertiarySkill: e.target.value })} className={getInputClass(formData.tertiarySkill)}>
                            <option value="" disabled>Tertiary Skill</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <select value={formData.primaryLanguage} onChange={(e) => setFormData({ ...formData, primaryLanguage: e.target.value })} className={getInputClass(formData.primaryLanguage)}>
                            <option value="" disabled>Primary Language</option>
                            {languages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <select value={formData.secondaryLanguage} onChange={(e) => setFormData({ ...formData, secondaryLanguage: e.target.value })} className={getInputClass(formData.secondaryLanguage)}>
                            <option value="" disabled>Secondary Language</option>
                            {languages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>

                    {/* Current Address */}
                    <h3 className="text-xl font-semibold mb-6">Current Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <input type="text" placeholder="Flat/Building" value={formData.flat} onChange={(e) => setFormData({ ...formData, flat: e.target.value })} className={getInputClass(formData.flat)} />
                        <input type="text" placeholder="Society/Colony/Area" value={formData.society} onChange={(e) => setFormData({ ...formData, society: e.target.value })} className={getInputClass(formData.society)} />
                        <input type="text" placeholder="Landmark" value={formData.landmark} onChange={(e) => setFormData({ ...formData, landmark: e.target.value })} className={getInputClass(formData.landmark)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <input type="text" placeholder="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className={getInputClass(formData.city)} />
                        <input type="text" placeholder="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className={getInputClass(formData.state)} />
                        <input type="text" placeholder="Pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className={getInputClass(formData.pincode)} />
                    </div>

                    {/* Permanent Address */}
                    <h3 className="text-xl font-semibold mb-4">Permanent Address</h3>
                    <div className="flex items-center gap-3 mb-6">
                        <button
                            onClick={() => setFormData({ ...formData, sameAsCurrentAddress: !formData.sameAsCurrentAddress })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.sameAsCurrentAddress ? 'bg-orange-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.sameAsCurrentAddress ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span>Same as current address</span>
                    </div>

                    {!formData.sameAsCurrentAddress && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <input type="text" placeholder="Flat/Building" value={formData.permanentFlat} onChange={(e) => setFormData({ ...formData, permanentFlat: e.target.value })} className={getInputClass(formData.permanentFlat)} />
                                <input type="text" placeholder="Society/Colony/Area" value={formData.permanentSociety} onChange={(e) => setFormData({ ...formData, permanentSociety: e.target.value })} className={getInputClass(formData.permanentSociety)} />
                                <input type="text" placeholder="Landmark" value={formData.permanentLandmark} onChange={(e) => setFormData({ ...formData, permanentLandmark: e.target.value })} className={getInputClass(formData.permanentLandmark)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <input type="text" placeholder="City" value={formData.permanentCity} onChange={(e) => setFormData({ ...formData, permanentCity: e.target.value })} className={getInputClass(formData.permanentCity)} />
                                <input type="text" placeholder="State" value={formData.permanentState} onChange={(e) => setFormData({ ...formData, permanentState: e.target.value })} className={getInputClass(formData.permanentState)} />
                                <input type="text" placeholder="Pincode" value={formData.permanentPincode} onChange={(e) => setFormData({ ...formData, permanentPincode: e.target.value })} className={getInputClass(formData.permanentPincode)} />
                            </div>
                        </>
                    )}

                    {/* Job Requirements */}
                    <h3 className="text-xl font-semibold mb-6">Job Requirements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <select value={formData.totalExperience} onChange={(e) => setFormData({ ...formData, totalExperience: e.target.value })} className={getInputClass(formData.totalExperience)}>
                            <option value="" disabled>Total Experience</option>
                            <option value="Fresher">Fresher</option>
                            <option value="Less than 1 Year">Less than 1 Year</option>
                            <option value="1-5 years">1-5 years</option>
                            <option value="5-10 years">5-10 years</option>
                            <option value="10-15 years">10-15 years</option>
                            <option value="15-20 years">15-20 years</option>
                            <option value="20+ years">20+ years</option>
                        </select>
                        <select value={formData.lastJobType} onChange={(e) => setFormData({ ...formData, lastJobType: e.target.value })} className={getInputClass(formData.lastJobType)}>
                            <option value="" disabled>Last Job Type</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select value={formData.lastJobSalary} onChange={(e) => setFormData({ ...formData, lastJobSalary: e.target.value })} className={getInputClass(formData.lastJobSalary)}>
                            <option value="" disabled>Last Job Salary</option>
                            <option value="10k or below">10k or below</option>
                            <option value="10k - 15k">10k - 15k</option>
                            <option value="15k - 20k">15k - 20k</option>
                            <option value="20k - 25k">20k - 25k</option>
                            <option value="25k - 30k">25k - 30k</option>
                            <option value="30k+">30k+</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <select value={formData.lastJobDuration} onChange={(e) => setFormData({ ...formData, lastJobDuration: e.target.value })} className={getInputClass(formData.lastJobDuration)}>
                            <option value="" disabled>Last Job Duration</option>
                            <option value="Less than 1 Year">Less than 1 Year</option>
                            <option value="1-5 years">1-5 years</option>
                            <option value="5-10 years">5-10 years</option>
                            <option value="10-15 years">10-15 years</option>
                            <option value="15-20 years">15-20 years</option>
                            <option value="20+ years">20+ years</option>
                        </select>
                        <input type="text" placeholder="Reason For Leaving Last Job" value={formData.reasonForLeaving} onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })} className={getInputClass(formData.reasonForLeaving)} />
                    </div>


                    {/* Bank Details */}
                    <h3 className="text-xl font-semibold mb-6">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <input type="text" placeholder="Account Holder Name" value={formData.accountHolderName} onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })} className={getInputClass(formData.accountHolderName)} />
                        <input type="text" placeholder="Account Number" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} className={getInputClass(formData.accountNumber)} />
                        <input type="text" placeholder="IFSC Code" value={formData.ifscCode} onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })} className={getInputClass(formData.ifscCode)} />
                    </div>

                    <div className="mb-8">
                        <input type="text" placeholder="Enter Upi Id" value={formData.upiId} onChange={(e) => setFormData({ ...formData, upiId: e.target.value })} className="w-full border rounded px-3 py-2 bg-gray-50" />
                    </div>

                    {/* Upload Documents */}
                    <h3 className="text-xl font-semibold mb-6">Upload Documents</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Profile Image */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Profile Image</p>
                            {(formData.image || candidate.imageUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.imageUrl, 'Profile Image')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.image?.name || 'View Image'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Image</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })} />
                                </label>
                            )}
                        </div>

                        {/* Aadhaar Card */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Aadhaar Card</p>
                            {(formData.aadharCard || candidate.aadharCardUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.aadharCardUrl, 'Aadhaar Card')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.aadharCard?.name || 'View Aadhar Card'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, aadharCard: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Document</span>
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, aadharCard: e.target.files[0] })} />
                                </label>
                            )}
                        </div>

                        {/* Resume */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Resume</p>
                            {(formData.resume || candidate.resumeUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.resumeUrl, 'Resume')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.resume?.name || 'View Resume'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => setFormData({ ...formData, resume: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Document</span>
                                    <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => setFormData({ ...formData, resume: e.target.files[0] })} />
                                </label>
                            )}
                        </div>

                        {/* Profile Form */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Profile Form</p>
                            {(formData.profileForm || candidate.profileFormUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.profileFormUrl, 'Profile Form')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.profileForm?.name || 'View Profile Form'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, profileForm: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Document</span>
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, profileForm: e.target.files[0] })} />
                                </label>
                            )}
                        </div>

                        {/* Trial Form */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Trial Form</p>
                            {(formData.trialForm || candidate.trialFormUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.trialFormUrl, 'Trial Form')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.trialForm?.name || 'View Trial Form'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, trialForm: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Document</span>
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, trialForm: e.target.files[0] })} />
                                </label>
                            )}
                        </div>

                        {/* Accommodation Form */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Accommodation Form</p>
                            {(formData.accomodationForm || candidate.accomodationFormUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.accomodationFormUrl, 'Accommodation Form')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.accomodationForm?.name || 'View Accomodation Form'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, accomodationForm: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Document</span>
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, accomodationForm: e.target.files[0] })} />
                                </label>
                            )}
                        </div>

                        {/* Background Verification */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Background Verification</p>
                            {(formData.backgroundVerification || candidate.backgroundVerificationUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.backgroundVerificationUrl, 'Background Verification')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.backgroundVerification?.name || 'View Background Verification'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, backgroundVerification: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Document</span>
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, backgroundVerification: e.target.files[0] })} />
                                </label>
                            )}
                        </div>

                        {/* Bank Passbook */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Bank Passbook</p>
                            {(formData.bankPassbook || candidate.bankPassbookUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.bankPassbookUrl, 'Bank Passbook')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.bankPassbook?.name || 'View Bank Passbook'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, bankPassbook: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Document</span>
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, bankPassbook: e.target.files[0] })} />
                                </label>
                            )}
                        </div>

                        {/* Driving License */}
                        <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium mb-2 text-center">Driving License</p>
                            {(formData.drivingLicense || candidate.drivingLicenseUrl) ? (
                                <div className="space-y-2">
                                    <div
                                        onClick={() => handleViewDocument(candidate.drivingLicenseUrl, 'Driving License')}
                                        className="text-xs text-green-600 truncate cursor-pointer hover:underline text-center"
                                    >
                                        📄 {formData.drivingLicense?.name || 'View Driving License'}
                                    </div>
                                    <label className="block">
                                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 text-xs">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload File
                                        </div>
                                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.files[0] })} />
                                    </label>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer">
                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Upload Document</span>
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.files[0] })} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Update Button */}
                    <div className="flex justify-center gap-4 border-t pt-6">
                        <button
                            onClick={onClose}
                            disabled={uploading}
                            className="bg-gray-400 hover:bg-gray-500 text-white font-semibold px-8 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={uploading}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? "Uploading..." : "Update Confirm"}
                        </button>
                    </div>
                </div>
            </div>

            <Snackbar />
        </div>
    );
}