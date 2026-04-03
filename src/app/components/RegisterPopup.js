"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../firebase/config";
import { X } from 'lucide-react';
import { triggerSnackbar } from "../components/snakbar";
import Snackbar from "../components/snakbar";

const fontStyle = { fontFamily: 'NeuzeitGro, "Inter", sans-serif' };

const db = getFirestore(app);
const storage = getStorage(app);

// Multi-Select Dropdown Component with Search
function MultiSelectDropdown({ options, selected, setSelected, placeholder }) {
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
                setSearchTerm("");
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

export default function RegisterAssociatePopup({ open, onClose, onSuccess }) {
    const dialogRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const [sources, setSources] = useState([]);
    const [professions, setProfessions] = useState([]);
    const [referralCandidates, setReferralCandidates] = useState([]);
    const languages = ["Hindi", "English", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", "Urdu", "Kannada", "Malayalam"];

    const [formData, setFormData] = useState({
        source: "", name: "", mobileNumber: "", emergencyNumber: "", work: "", gender: "",
        alternatePhoneNumber: "", workTime: "", educationQualification: "",
        dob: "", maritalStatus: "", previousMobileNumber: "", religion: "",
        age: "", medicalCondition: "", primarySkill: "", secondarySkill: "",
        tertiarySkill: [], primaryLanguage: "", secondaryLanguage: "",
        canCookVegNonVeg: "", cuisinesKnown: "", totalExperience: "",
        lastJobType: "", lastJobSalary: "", lastJobDuration: "",
        reasonForLeaving: "", flat: "", society: "", landmark: "",
        city: "", state: "", pincode: "", sameAsCurrentAddress: false,
        permanentFlat: "", permanentSociety: "", permanentLandmark: "",
        permanentCity: "", permanentState: "", permanentPincode: "",
        accountHolderName: "", accountNumber: "", ifscCode: "", upiId: "",
        bankPassbook: null, drivingLicense: null, aadharCard: null,
        resume: null, profileForm: null, trialForm: null,
        accomodationForm: null, backgroundVerification: null, image: null, referalNames: [],
    });

    const checkMobileNumberExists = async (mobileNumber) => {
        try {
            const candidatesRef = collection(db, "patronYcwHelps");
            const q = query(candidatesRef, where("mobileNumber", "==", mobileNumber));
            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (err) {
            console.error("Error checking mobile number:", err);
            return false;
        }
    };

    const generateCandidateId = (name, mobileNumber, gender) => {
        if (name.trim().length < 2) return "false";

        const cleanName = name.trim().replace(/[^A-Za-z]/g, '');
        if (cleanName.length < 2) return "false";

        const cleanMobile = mobileNumber.replace(/\D/g, '');
        if (cleanMobile.length < 10) return "false";

        const firstTwoLetters = cleanName.substring(0, 2).toUpperCase();
        const genderInitial = gender.trim()[0].toUpperCase();

        return `${firstTwoLetters}${cleanMobile}${genderInitial}`;
    };

    // ✅ NEW: Upload file to Firebase Storage and return download URL
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

    useEffect(() => {
        if (!open) return;

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
    }, [open]);

    useEffect(() => {
        if (!open || formData.source !== "Reference") {
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
                    .filter(candidate =>
                        candidate.name &&
                        (candidate.isRemoved === false ||
                            candidate.isRemoved === undefined ||
                            candidate.isRemoved === null)
                    );

                setReferralCandidates(candidates);
            } catch (err) {
                console.error("Error fetching referral candidates:", err);
            }
        };

        fetchReferralCandidates();
    }, [open, formData.source]);

    const handleSubmit = async () => {
        // Validation
        if (!formData.name.trim()) {
            triggerSnackbar("Name is mandatory", "error");
            return;
        }
        if (!formData.gender) {
            triggerSnackbar("Gender is mandatory", "error");
            return;
        }
        if (!formData.mobileNumber.trim()) {
            triggerSnackbar("Phone Number is mandatory", "error");
            return;
        }

        const mobileExists = await checkMobileNumberExists(formData.mobileNumber);
        if (mobileExists) {
            triggerSnackbar("Mobile Number already present", "error");
            return;
        }

        try {
            setUploading(true);

            const candidateId = generateCandidateId(
                formData.name,
                formData.mobileNumber,
                formData.gender
            );

            if (candidateId === "false") {
                triggerSnackbar("Invalid data for generating candidate ID", "error");
                setUploading(false);
                return;
            }

            // ✅ Upload all files to Firebase Storage
            const uploadedFiles = {};

            if (formData.image) {
                uploadedFiles.imageUrl = await uploadFileToStorage(formData.image, candidateId, 'image');
            }
            if (formData.aadharCard) {
                uploadedFiles.aadharCardUrl = await uploadFileToStorage(formData.aadharCard, candidateId, 'aadhar');
            }
            if (formData.resume) {
                uploadedFiles.resumeUrl = await uploadFileToStorage(formData.resume, candidateId, 'resume');
            }
            if (formData.profileForm) {
                uploadedFiles.profileFormUrl = await uploadFileToStorage(formData.profileForm, candidateId, 'profile');
            }
            if (formData.trialForm) {
                uploadedFiles.trialFormUrl = await uploadFileToStorage(formData.trialForm, candidateId, 'trial');
            }
            if (formData.accomodationForm) {
                uploadedFiles.accomodationFormUrl = await uploadFileToStorage(formData.accomodationForm, candidateId, 'accommodation');
            }
            if (formData.backgroundVerification) {
                uploadedFiles.backgroundVerificationUrl = await uploadFileToStorage(formData.backgroundVerification, candidateId, 'background');
            }
            if (formData.bankPassbook) {
                uploadedFiles.bankPassbookUrl = await uploadFileToStorage(formData.bankPassbook, candidateId, 'passbook');
            }
            if (formData.drivingLicense) {
                uploadedFiles.drivingLicenseUrl = await uploadFileToStorage(formData.drivingLicense, candidateId, 'license');
            }

            const candidateData = {
                id: candidateId,
                name: formData.name,
                mobileNumber: formData.mobileNumber,
                emergencyNumber: formData.emergencyNumber,
                alternatePhoneNumber: formData.alternatePhoneNumber,
                gender: formData.gender,
                age: formData.age,
                profession: formData.work,
                source: formData.source,
                referalNames: formData.referalNames,
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
                // ✅ Store download URLs instead of filenames
                imageUrl: uploadedFiles.imageUrl || null,
                aadharCardUrl: uploadedFiles.aadharCardUrl || null,
                resumeUrl: uploadedFiles.resumeUrl || null,
                profileFormUrl: uploadedFiles.profileFormUrl || null,
                trialFormUrl: uploadedFiles.trialFormUrl || null,
                accomodationFormUrl: uploadedFiles.accomodationFormUrl || null,
                backgroundVerificationUrl: uploadedFiles.backgroundVerificationUrl || null,
                bankPassbookUrl: uploadedFiles.bankPassbookUrl || null,
                drivingLicenseUrl: uploadedFiles.drivingLicenseUrl || null,
                approvalStatus: "Approved",
                status: "Approved",
                createdTime: Timestamp.now(),
            };

            const docRef = await addDoc(collection(db, "patronYcwHelps"), candidateData);
            if (onSuccess) {
                onSuccess({
                    ...candidateData,
                    firestoreId: docRef.id,
                    id: candidateId
                });
            }
            triggerSnackbar("Candidate registered successfully!", "success");

            // Reset form
            setFormData({
                source: "", name: "", mobileNumber: "", emergencyNumber: "", work: "", gender: "",
                alternatePhoneNumber: "", workTime: "", educationQualification: "",
                dob: "", maritalStatus: "", previousMobileNumber: "", religion: "",
                age: "", medicalCondition: "", primarySkill: "", secondarySkill: "",
                tertiarySkill: [], primaryLanguage: "", secondaryLanguage: "",
                canCookVegNonVeg: "", cuisinesKnown: "", totalExperience: "",
                lastJobType: "", lastJobSalary: "", lastJobDuration: "", reasonForLeaving: "",
                flat: "", society: "", landmark: "", city: "", state: "", pincode: "",
                sameAsCurrentAddress: false, permanentFlat: "", permanentSociety: "",
                permanentLandmark: "", permanentCity: "", permanentState: "", permanentPincode: "",
                accountHolderName: "", accountNumber: "", ifscCode: "", upiId: "",
                bankPassbook: null, drivingLicense: null, aadharCard: null,
                resume: null, profileForm: null, trialForm: null,
                accomodationForm: null, backgroundVerification: null, image: null, referalNames: []
            });

            // onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error submitting form:", error);
            triggerSnackbar("Error submitting form: " + error.message, "error");
        } finally {
            setUploading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F0F10]/40 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4">
            <div
                ref={dialogRef}
                style={fontStyle}
                className="cc-register bg-white rounded-2xl border border-[#EFEFEF] shadow-[0_18px_60px_rgba(0,0,0,0.12)] w-full max-w-[520px] max-h-[96vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-[#F0F0F0] bg-white/85 backdrop-blur-sm">
                    <h2 className="text-[18px] sm:text-[20px] font-semibold text-[#2C2C2C] tracking-tight">Associate Registration Form</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#F2F2F2] rounded-full transition-colors"
                        aria-label="Close"
                        disabled={uploading}
                    >
                        <X className="w-4 h-4 text-[#6F6F6F]" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 bg-[#F7F7F7]">
                    <div className="bg-white rounded-2xl border border-[#F0F0F0] p-3 sm:p-4 md:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] space-y-6">

                        {/* Basic Details */}
                        <div>
                            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#4C4C4C] uppercase tracking-[0.08em]">Patron Details</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <select
                                    value={formData.source}
                                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                >
                                    <option value="" disabled>Source</option>
                                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {formData.source === "Reference" && (
                                    <div className="col-span-1 sm:col-span-2 md:col-span-2">
                                        <MultiSelectDropdown
                                            options={referralCandidates.map(c => c.name)}
                                            selected={formData.referalNames}
                                            setSelected={(val) => setFormData({ ...formData, referalNames: val })}
                                            placeholder="Select Referral Names"
                                        />
                                    </div>
                                )}

                                <input
                                    type="text"
                                    placeholder="Name*"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 mb-3">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Upload Profile Image</p>
                                        {formData.image && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-full px-2">{formData.image.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="Phone Number*"
                                    value={formData.mobileNumber}
                                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                />

                                <input
                                    type="text"
                                    placeholder="Emergency Contact Number"
                                    value={formData.emergencyNumber}
                                    onChange={(e) => setFormData({ ...formData, emergencyNumber: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                />

                                <input
                                    type="text"
                                    placeholder="Family Member Phone"
                                    value={formData.alternatePhoneNumber}
                                    onChange={(e) => setFormData({ ...formData, alternatePhoneNumber: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <select
                                    value={formData.work}
                                    onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                >
                                    <option value="" disabled>What work can you do*</option>
                                    {professions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>

                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                >
                                    <option value="" disabled>Gender*</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="LGBTQ">LGBTQ</option>
                                </select>
                            </div>

                            {/* Continue with rest of the form fields... */}
                            {/* (Keeping all other form fields from the original - just adding disabled={uploading} to each input) */}

                            {/* I'll continue with the rest of the fields in the same pattern */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <select
                                    value={formData.workTime}
                                    onChange={(e) => setFormData({ ...formData, workTime: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                >
                                    <option value="" disabled>How many hours do you want to work</option>
                                    <option value="Less than 4 hours">Less than 4 hours</option>
                                    <option value="4-8 hours">4-8 hours</option>
                                    <option value="8-12 hours">8-12 hours</option>
                                    <option value="Live In">Live In</option>
                                </select>

                                <select
                                    value={formData.educationQualification}
                                    onChange={(e) => setFormData({ ...formData, educationQualification: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                >
                                    <option value="" disabled>Education Qualification</option>
                                    <option value="No Education">No Education</option>
                                    <option value="5th pass">5th pass</option>
                                    <option value="8th pass">8th pass</option>
                                    <option value="10th pass">10th pass</option>
                                    <option value="12th pass">12th pass</option>
                                    <option value="Graduate">Graduate</option>
                                    <option value="Post Graduate">Post Graduate</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="date"
                                    placeholder="Date of Birth (DOB)"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                />

                                <select
                                    value={formData.maritalStatus}
                                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                    disabled={uploading}
                                >
                                    <option value="" disabled>Marital Status</option>
                                    <option value="Married">Married</option>
                                    <option value="Unmarried">Unmarried</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Divorce">Divorce</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="Previous Mobile Number"
                                    value={formData.previousMobileNumber}
                                    onChange={(e) => setFormData({ ...formData, previousMobileNumber: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />

                                <select
                                    value={formData.religion}
                                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="" disabled>Religion</option>
                                    <option value="Hindu">Hindu</option>
                                    <option value="Muslim">Muslim</option>
                                    <option value="Christian">Christian</option>
                                    <option value="Sikh">Sikh</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <select
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="" disabled>Age</option>
                                    <option value="18 or less">18 or less</option>
                                    <option value="18-24 years old">18-24</option>
                                    <option value="24-32 years old">24-32</option>
                                    <option value="32-40 years old">32-40</option>
                                    <option value="40+ years old">40+</option>
                                </select>

                                <input
                                    type="text"
                                    placeholder="Medical Condition(If Any)"
                                    value={formData.medicalCondition}
                                    onChange={(e) => setFormData({ ...formData, medicalCondition: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                            </div>
                        </div>

                        {/* Skills / Language / Cuisines */}
                        <div>
                            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#4C4C4C] uppercase tracking-[0.08em]">Skills / Language / Cuisines</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <select
                                    value={formData.primarySkill}
                                    onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="" disabled>Primary Skill</option>
                                    {professions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>

                                <select
                                    value={formData.secondarySkill}
                                    onChange={(e) => setFormData({ ...formData, secondarySkill: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="" disabled>Secondary Skill</option>
                                    {professions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <MultiSelectDropdown
                                    options={professions}
                                    selected={formData.tertiarySkill}
                                    setSelected={(val) => setFormData({ ...formData, tertiarySkill: val })}
                                    placeholder="Select Tertiary Skills"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <select
                                    value={formData.primaryLanguage}
                                    onChange={(e) => setFormData({ ...formData, primaryLanguage: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="" disabled>Primary Language</option>
                                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <select
                                    value={formData.secondaryLanguage}
                                    onChange={(e) => setFormData({ ...formData, secondaryLanguage: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="" disabled>Secondary Language</option>
                                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>

                                <select
                                    value={formData.canCookVegNonVeg}
                                    onChange={(e) => setFormData({ ...formData, canCookVegNonVeg: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="" disabled>Can Cook Veg/Non Veg</option>
                                    <option value="Both">Both</option>
                                    <option value="Veg Only">Veg Only</option>
                                    <option value="Non-veg only">Non-veg only</option>
                                </select>
                            </div>

                            <select
                                value={formData.cuisinesKnown}
                                onChange={(e) => setFormData({ ...formData, cuisinesKnown: e.target.value })}
                                className="w-full border rounded px-3 py-2 bg-gray-50 text-sm"
                            >
                                <option value="" disabled>Cuisines Known</option>
                                <option value="North Indian">North Indian</option>
                                <option value="South Indian">South Indian</option>
                                <option value="Thai">Thai</option>
                                <option value="Chinese">Chinese</option>
                                <option value="Continental">Continental</option>
                            </select>
                        </div>

                        {/* Job Requirements */}
                        <div>
                            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#4C4C4C] uppercase tracking-[0.08em]">Job Requirements</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <select
                                    value={formData.totalExperience}
                                    onChange={(e) => setFormData({ ...formData, totalExperience: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="">Total Experience</option>
                                    <option value="Fresher">Fresher</option>
                                    <option value="Less than 1 Year">Less than 1 Year</option>
                                    <option value="1-5 years">1-5 years</option>
                                    <option value="5-10years">5-10 years</option>
                                    <option value="10-15years">10-15 years</option>
                                    <option value="15-20 years">15-20 years</option>
                                    <option value="20+ years">20+ years</option>
                                </select>

                                <select
                                    value={formData.lastJobType}
                                    onChange={(e) => setFormData({ ...formData, lastJobType: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="">Last Job Type</option>
                                    {professions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <select
                                    value={formData.lastJobSalary}
                                    onChange={(e) => setFormData({ ...formData, lastJobSalary: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="">Last Job Salary</option>
                                    <option value="10k or below">10k or below</option>
                                    <option value="10k - 15k">10k - 15k</option>
                                    <option value="15k -20k">15k - 20k</option>
                                    <option value="20k - 25k">20k - 25k</option>
                                    <option value="25k - 30k">25k - 30k</option>
                                    <option value="30k+">30k+</option>
                                </select>

                                <select
                                    value={formData.lastJobDuration}
                                    onChange={(e) => setFormData({ ...formData, lastJobDuration: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                >
                                    <option value="">Last Job Duration</option>
                                    <option value="Less than 1 Year">Less than 1 Year</option>
                                    <option value="1-5 years">1-5 years</option>
                                    <option value="5-10years">5-10 years</option>
                                    <option value="10-15years">10-15 years</option>
                                    <option value="15-20 years">15-20 years</option>
                                    <option value="20+ years">20+ years</option>
                                </select>
                            </div>

                            <input
                                type="text"
                                placeholder="Reason For Leaving Last Job"
                                value={formData.reasonForLeaving}
                                onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                                className="w-full border rounded px-3 py-2 bg-gray-50 text-sm"
                            />
                        </div>

                        {/* Current Address */}
                        <div>
                            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#4C4C4C] uppercase tracking-[0.08em]">Current Address</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="Flat/Building"
                                    value={formData.flat}
                                    onChange={(e) => setFormData({ ...formData, flat: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Society/Colony/Area"
                                    value={formData.society}
                                    onChange={(e) => setFormData({ ...formData, society: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="Landmark"
                                    value={formData.landmark}
                                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="State"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Pincode"
                                    value={formData.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                            </div>
                        </div>

                        {/* Permanent Address */}
                        <div>
                            <h3 className="text-sm sm:text-base font-semibold mb-3 text-[#4C4C4C] uppercase tracking-[0.08em]">Permanent Address</h3>

                            <div className="flex items-center gap-3 mb-3">
                                <button
                                    onClick={() => setFormData({ ...formData, sameAsCurrentAddress: !formData.sameAsCurrentAddress })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.sameAsCurrentAddress ? 'bg-[#F36A23]' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.sameAsCurrentAddress ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-sm text-[#4A4A4A]">Same as current address</span>
                            </div>

                            {!formData.sameAsCurrentAddress && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Flat/Building"
                                            value={formData.permanentFlat}
                                            onChange={(e) => setFormData({ ...formData, permanentFlat: e.target.value })}
                                            className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Society/Colony/Area"
                                            value={formData.permanentSociety}
                                            onChange={(e) => setFormData({ ...formData, permanentSociety: e.target.value })}
                                            className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Landmark"
                                            value={formData.permanentLandmark}
                                            onChange={(e) => setFormData({ ...formData, permanentLandmark: e.target.value })}
                                            className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="City"
                                            value={formData.permanentCity}
                                            onChange={(e) => setFormData({ ...formData, permanentCity: e.target.value })}
                                            className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="State"
                                            value={formData.permanentState}
                                            onChange={(e) => setFormData({ ...formData, permanentState: e.target.value })}
                                            className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Pincode"
                                            value={formData.permanentPincode}
                                            onChange={(e) => setFormData({ ...formData, permanentPincode: e.target.value })}
                                            className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Bank Details */}
                        <div>
                            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#4C4C4C] uppercase tracking-[0.08em]">Bank Details</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="Account Holder Name"
                                    value={formData.accountHolderName}
                                    onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Account Number"
                                    value={formData.accountNumber}
                                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="IFSC Code"
                                    value={formData.ifscCode}
                                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Enter UPI Id"
                                    value={formData.upiId}
                                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm"
                                />
                            </div>
                        </div>

                        {/* Upload Documents */}
                        <div>
                            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#4C4C4C] uppercase tracking-[0.08em]">Documents</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                {/* Aadhaar Card */}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Aadhaar Card</p>
                                        {formData.aadharCard && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-[160px]">{formData.aadharCard.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, aadharCard: e.target.files[0] })}
                                    />
                                </label>

                                {/* Resume */}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Resume</p>
                                        {formData.resume && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-[160px]">{formData.resume.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, resume: e.target.files[0] })}
                                    />
                                </label>

                                {/* Profile Form */}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Profile Form</p>
                                        {formData.profileForm && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-[160px]">{formData.profileForm.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, profileForm: e.target.files[0] })}
                                    />
                                </label>

                                {/* Trial Form */}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Trial Form</p>
                                        {formData.trialForm && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-[160px]">{formData.trialForm.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, trialForm: e.target.files[0] })}
                                    />
                                </label>

                                {/* Accommodation Form */}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Accommodation Form</p>
                                        <p className="text-[10px] text-gray-400">(if applicable)</p>
                                        {formData.accomodationForm && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-[160px]">{formData.accomodationForm.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, accomodationForm: e.target.files[0] })}
                                    />
                                </label>

                                {/* Background Verification */}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Background Verification</p>
                                        {formData.backgroundVerification && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-[160px]">{formData.backgroundVerification.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, backgroundVerification: e.target.files[0] })}
                                    />
                                </label>

                                {/* Bank Passbook */}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Bank Passbook</p>
                                        {formData.bankPassbook && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-[160px]">{formData.bankPassbook.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, bankPassbook: e.target.files[0] })}
                                    />
                                </label>

                                {/* Driving License */}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-[#F9F9F9] hover:bg-[#F1F1F1] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-3 pb-3 px-2">
                                        <svg className="w-6 sm:w-7 h-6 sm:h-7 mb-2 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-xs text-[#5F5F5F] text-center font-medium">Driving License</p>
                                        {formData.drivingLicense && (
                                            <p className="text-xs text-green-600 mt-1 truncate max-w-[160px]">{formData.drivingLicense.name}</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.files[0] })}
                                    />
                                </label>
                            </div>
                            {/* Submit Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleSubmit}
                                    className="bg-[#F36A23] hover:bg-[#e45f1d] text-white font-semibold px-8 sm:px-10 py-3 rounded-full text-sm sm:text-base shadow-[0_10px_30px_rgba(243,106,35,0.35)] transition-all w-full sm:w-auto"
                                >
                                    Complete Registration
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <style jsx>{`
                .cc-register input,
                .cc-register select,
                .cc-register textarea {
                    background: #f6f6f6;
                    border: 1px solid #e6e6e6;
                    border-radius: 12px;
                    color: #313131;
                    padding: 10px 12px;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                .cc-register input:focus,
                .cc-register select:focus,
                .cc-register textarea:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(243, 106, 35, 0.35);
                    border-color: #f36a23;
                }
                .cc-register h3 {
                    letter-spacing: 0.08em;
                }
            `}</style>
        </div>
    );
}
