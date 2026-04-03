'use client';
import { useState, useEffect } from "react";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp
} from "firebase/firestore";
import { app } from "../firebase/config";
import { triggerSnackbar } from "../components/snakbar";
import Nav from "../components/navbar";
import Snackbar from "../components/snakbar";

const db = getFirestore(app);

// ✅ Mobile-Responsive Multi-Select Dropdown
export function MultiSelectDropdown({ options, selected, setSelected }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (option) => {
        if (selected.includes(option)) {
            setSelected(selected.filter((item) => item !== option));
        } else {
            setSelected([...selected, option]);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (open && !e.target.closest('.multi-select-container')) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return (
        <div className="relative w-full multi-select-container">
            {/* Dropdown header */}
            <div
                onClick={() => setOpen(!open)}
                className="border rounded px-3 py-2 bg-gray-50 flex justify-between items-center cursor-pointer text-sm sm:text-base"
            >
                <span className="text-gray-700 truncate">
                    {selected.length > 0 ? `${selected.length} selected` : "Select Tertiary Skills"}
                </span>
                <span className="text-gray-500 flex-shrink-0 ml-2">▼</span>
            </div>

            {/* Dropdown menu */}
            {open && (
                <div className="absolute z-20 w-full bg-white border rounded-lg mt-1 shadow-md max-h-48 sm:max-h-56 overflow-y-auto">
                    {options.map((option) => (
                        <label
                            key={option}
                            className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm sm:text-base"
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(option)}
                                onChange={() => handleSelect(option)}
                                className="mr-2 accent-blue-600 flex-shrink-0"
                            />
                            <span className="break-words">{option}</span>
                        </label>
                    ))}
                </div>
            )}

            {/* Selected items display */}
            {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selected.map((item) => (
                        <span key={item} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs sm:text-sm flex items-center gap-1">
                            <span className="truncate max-w-[120px] sm:max-w-none">{item}</span>
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

export default function CandidateRegistrationForm() {
    // Search state
    const [searchMode, setSearchMode] = useState("Mobile Number");
    const [searchTerm, setSearchTerm] = useState("");
    const [searchSuggestions, setSearchSuggestions] = useState([]);

    // Dropdown data
    const [sources, setSources] = useState([]);
    const [professions, setProfessions] = useState([]);

    // Form data
    const [formData, setFormData] = useState({
        source: "", name: "", mobileNumber: "", work: "", gender: "",
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
        bankPassbook: null, drivingLicense: null
    });

    const [skillsList, setSkillsList] = useState([]);

    // Fetch dropdown data
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

    // Search candidates
    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            triggerSnackbar("Please enter a search term", "error");
            return;
        }

        try {
            const candidatesRef = collection(db, "patronYcwHelps");
            let q;

            if (searchMode === "Mobile Number") {
                q = query(candidatesRef, where("mobileNumber", "==", searchTerm));
            } else if (searchMode === "Name") {
                q = query(candidatesRef, where("name", "==", searchTerm));
            } else if (searchMode === "Profession") {
                q = query(candidatesRef, where("profession", "==", searchTerm));
            }

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                triggerSnackbar("Candidate Exist", "success");
                const suggestions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSearchSuggestions(suggestions);
            } else {
                triggerSnackbar("Candidate not found", "info");
                setSearchSuggestions([]);
            }
        } catch (err) {
            console.error("Error searching:", err);
            triggerSnackbar("Error searching candidates", "error");
        }
    };

    // Generate Candidate ID
    const generateCandidateId = (name, mobileNumber, gender) => {
        if (name.trim().length < 2) return "false";

        const cleanName = name.trim().replace(/[^A-Za-z]/g, '');
        if (cleanName.length < 2) return "false";

        const cleanMobile = mobileNumber.replace(/\D/g, '');
        if (cleanMobile.length < 10) return "false";

        const firstTwoLetters = cleanName.substring(0, 2).toUpperCase();
        const mobile = cleanMobile;

        if (gender.trim() === "") return "false";
        const genderInitial = gender.trim()[0].toUpperCase();

        const id = `${firstTwoLetters}${mobile}${genderInitial}`;

        if (id.includes(" ")) return "false";

        return id;
    };

    // ✅ Check if mobile number already exists in database
    const checkMobileNumberExists = async (mobileNumber) => {
        try {
            const candidatesRef = collection(db, "patronYcwHelps");
            const q = query(candidatesRef, where("mobileNumber", "==", mobileNumber));
            const snapshot = await getDocs(q);

            return !snapshot.empty; // Returns true if mobile number exists
        } catch (err) {
            console.error("Error checking mobile number:", err);
            return false;
        }
    };

    // ✅ Handle form submission with duplicate check
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

        // ✅ NEW: Check if mobile number already exists
        const mobileExists = await checkMobileNumberExists(formData.mobileNumber);
        if (mobileExists) {
            triggerSnackbar("Mobile Number already present", "error");
            return;
        }

        try {
            // Generate candidate ID
            const candidateId = generateCandidateId(
                formData.name,
                formData.mobileNumber,
                formData.gender
            );

            if (candidateId === "false") {
                triggerSnackbar("Invalid data for generating candidate ID", "error");
                return;
            }

            // Prepare data for Firestore
            const candidateData = {
                id: candidateId,
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
                approvalStatus: "Approved",
                status: "Approved",
                createdTime: Timestamp.now(),
                idProof: formData.drivingLicense?.name || "",
                campus: formData.otp || ""
            };

            // Save to Firestore
            await addDoc(collection(db, "patronYcwHelps"), candidateData);

            triggerSnackbar("Candidate registered successfully!", "success");

            // Reset form
            setFormData({
                source: "", name: "", mobileNumber: "", work: "", gender: "",
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
                bankPassbook: null, drivingLicense: null
            });

        } catch (error) {
            console.error("Error submitting form:", error);
            triggerSnackbar("Error submitting form: " + error.message, "error");
        }
    };

    const languages = ["Hindi", "English", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", "Urdu", "Kannada", "Malayalam"];

    return (
        <div className="min-h-screen bg-gray-50">
            <Nav />

            <div className="p-3 sm:p-4 md:p-6">
                <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-4 sm:p-6">


                    {/* Basic Details */}
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Basic Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <select
                            value={formData.source}
                            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Source</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <input
                            type="text"
                            placeholder="Name*"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />

                        <input
                            type="text"
                            placeholder="Phone Number*"
                            value={formData.mobileNumber}
                            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <select
                            value={formData.work}
                            onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>What work can you do*</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Gender*</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="LGBTQ">LGBTQ</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Family Member Phone"
                            value={formData.alternatePhoneNumber}
                            onChange={(e) => setFormData({ ...formData, alternatePhoneNumber: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <select
                            value={formData.workTime}
                            onChange={(e) => setFormData({ ...formData, workTime: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
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
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
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

                        <input
                            type="date"
                            value={formData.dob}
                            placeholder="Date Of Birth"
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <select
                            value={formData.maritalStatus}
                            onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Marital Status</option>
                            <option value="Married">Married</option>
                            <option value="Unmarried">Unmarried</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Divorce">Divorce</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Previous Mobile Number"
                            value={formData.previousMobileNumber}
                            onChange={(e) => setFormData({ ...formData, previousMobileNumber: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />

                        <select
                            value={formData.religion}
                            onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Religion</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Muslim">Muslim</option>
                            <option value="Christian">Christian</option>
                            <option value="Sikh">Sikh</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <select
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
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
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                    </div>

                    {/* Skills/Language/Cuisines */}
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Skills / Language / Cuisines</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <select
                            value={formData.primarySkill}
                            onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Primary Skill</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <select
                            value={formData.secondarySkill}
                            onChange={(e) => setFormData({ ...formData, secondarySkill: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Secondary Skill</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <MultiSelectDropdown
                            options={professions}
                            selected={formData.tertiarySkill}
                            setSelected={(val) => setFormData({ ...formData, tertiarySkill: val })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <select
                            value={formData.primaryLanguage}
                            onChange={(e) => setFormData({ ...formData, primaryLanguage: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Primary Language</option>
                            {languages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>

                        <select
                            value={formData.secondaryLanguage}
                            onChange={(e) => setFormData({ ...formData, secondaryLanguage: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Secondary Language</option>
                            {languages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>

                        <select
                            value={formData.canCookVegNonVeg}
                            onChange={(e) => setFormData({ ...formData, canCookVegNonVeg: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="" disabled>Can Cook Veg/Non Veg</option>
                            <option value="Both">Both</option>
                            <option value="Veg Only">Veg Only</option>
                            <option value="Non-veg only">Non-veg only</option>
                        </select>
                    </div>

                    <div className="mb-6 sm:mb-8">
                        <select
                            value={formData.cuisinesKnown}
                            onChange={(e) => setFormData({ ...formData, cuisinesKnown: e.target.value })}
                            className="w-full border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
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
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Job Requirements</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <select
                            value={formData.totalExperience}
                            onChange={(e) => setFormData({ ...formData, totalExperience: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
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
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="">Last Job Type</option>
                            {professions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <select
                            value={formData.lastJobSalary}
                            onChange={(e) => setFormData({ ...formData, lastJobSalary: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="">Last Job Salary</option>
                            <option value="10k or below">10k or below</option>
                            <option value="10k - 15k">10k - 15k</option>
                            <option value="15k -20k">15k - 20k</option>
                            <option value="20k - 25k">20k - 25k</option>
                            <option value="25k - 30k">25k - 30k</option>
                            <option value="30k+">30k+</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <select
                            value={formData.lastJobDuration}
                            onChange={(e) => setFormData({ ...formData, lastJobDuration: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        >
                            <option value="">Last Job Duration</option>
                            <option value="Less than 1 Year">Less than 1 Year</option>
                            <option value="1-5 years">1-5 years</option>
                            <option value="5-10years">5-10 years</option>
                            <option value="10-15years">10-15 years</option>
                            <option value="15-20 years">15-20 years</option>
                            <option value="20+ years">20+ years</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Reason For Leaving Last Job"
                            value={formData.reasonForLeaving}
                            onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                    </div>

                    {/* Current Address */}
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Current Address</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <input
                            type="text"
                            placeholder="Flat/Building"
                            value={formData.flat}
                            onChange={(e) => setFormData({ ...formData, flat: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                        <input
                            type="text"
                            placeholder="Society/Colony/Area"
                            value={formData.society}
                            onChange={(e) => setFormData({ ...formData, society: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                        <input
                            type="text"
                            placeholder="Landmark"
                            value={formData.landmark}
                            onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <input
                            type="text"
                            placeholder="City"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                        <input
                            type="text"
                            placeholder="State"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                        <input
                            type="text"
                            placeholder="Pincode"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                    </div>

                    {/* Permanent Address */}
                    <h3 className="text-lg sm:text-xl font-semibold mb-4">Permanent Address</h3>

                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <button
                            onClick={() => setFormData({ ...formData, sameAsCurrentAddress: !formData.sameAsCurrentAddress })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.sameAsCurrentAddress ? 'bg-orange-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.sameAsCurrentAddress ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-sm sm:text-base">Same as current address</span>
                    </div>

                    {!formData.sameAsCurrentAddress && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <input
                                    type="text"
                                    placeholder="Flat/Building"
                                    value={formData.permanentFlat}
                                    onChange={(e) => setFormData({ ...formData, permanentFlat: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                                />
                                <input
                                    type="text"
                                    placeholder="Society/Colony/Area"
                                    value={formData.permanentSociety}
                                    onChange={(e) => setFormData({ ...formData, permanentSociety: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                                />
                                <input
                                    type="text"
                                    placeholder="Landmark"
                                    value={formData.permanentLandmark}
                                    onChange={(e) => setFormData({ ...formData, permanentLandmark: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={formData.permanentCity}
                                    onChange={(e) => setFormData({ ...formData, permanentCity: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                                />
                                <input
                                    type="text"
                                    placeholder="State"
                                    value={formData.permanentState}
                                    onChange={(e) => setFormData({ ...formData, permanentState: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                                />
                                <input
                                    type="text"
                                    placeholder="Pincode"
                                    value={formData.permanentPincode}
                                    onChange={(e) => setFormData({ ...formData, permanentPincode: e.target.value })}
                                    className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                                />
                            </div>
                        </>
                    )}

                    {/* Bank Details */}
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Bank Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <input
                            type="text"
                            placeholder="Account Holder Name"
                            value={formData.accountHolderName}
                            onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                        <input
                            type="text"
                            placeholder="Account Number"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                        <input
                            type="text"
                            placeholder="IFSC Code"
                            value={formData.ifscCode}
                            onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                            className="border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />

                        <input
                            type="text"
                            placeholder="Enter Upi Id"
                            value={formData.upiId}
                            onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                            className="w-full border rounded px-3 py-2 bg-gray-50 text-sm sm:text-base"
                        />
                    </div>

                    {/* <div className="mb-6 sm:mb-8">
                        
                    </div> */}

                    {/* Upload Documents */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8 justify-center">
                        <label className="flex flex-col items-center justify-center w-full sm:w-48 h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 px-2">
                                <svg className="w-6 sm:w-8 h-6 sm:h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-xs text-gray-500 text-center">You can upload your bank passbook here!</p>
                                {formData.bankPassbook && (
                                    <p className="text-xs text-green-600 mt-1 truncate max-w-[180px]">{formData.bankPassbook.name}</p>
                                )}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => setFormData({ ...formData, bankPassbook: e.target.files[0] })}
                            />
                        </label>

                        <label className="flex flex-col items-center justify-center w-full sm:w-48 h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 px-2">
                                <svg className="w-6 sm:w-8 h-6 sm:h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-xs text-gray-500 text-center">You can upload your driving license here!</p>
                                {formData.drivingLicense && (
                                    <p className="text-xs text-green-600 mt-1 truncate max-w-[180px]">{formData.drivingLicense.name}</p>
                                )}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.files[0] })}
                            />
                        </label>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleSubmit}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 sm:px-12 py-3 rounded-lg text-base sm:text-lg shadow-lg transition-all w-full sm:w-auto"
                        >
                            Submit Application
                        </button>
                    </div>
                </div>

                <Snackbar />
            </div>
        </div>
    );
}