'use client';
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    query,
    where,
    addDoc,
    updateDoc,
    Timestamp,
    doc,
} from "firebase/firestore";
import { app } from "../../firebase/config";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ExcelTableTemplate from "../../components/ExcelTableTemplate";
import Snackbar, { triggerSnackbar } from "../../components/snakbar";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Link from "next/link";
import { Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Typography } from "@mui/material";
import Nav from "../../components/navbar";
import { Download, Calendar, X, Clock, User, Filter } from "lucide-react";
import ReadOnlyScheduleModal from "../../components/readonlycalender";
import TrialEvaluationForm from "../../components/officetrialform";
import { CandidateDetailCard, StatusBadge } from "../../components/expandabledrawer";

const db = getFirestore(app);
const storage = getStorage(app);

// Add after imports, before component definition
const getUserRefByDisplayName = async (displayName) => {
    if (!displayName) return null;
    try {
        const userCollectionRef = collection(db, "user");
        const userQuery = query(userCollectionRef, where("display_name", "==", displayName));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            // ✅ Return DocumentReference instead of string
            return doc(db, "user", userSnapshot.docs[0].id);
        }
        return null;
    } catch (error) {
        console.error("Error fetching user ref:", error);
        return null;
    }
};


function RelocateModal({ open, onClose, onConfirm, primaryRole }) {

    const [candidates, setCandidates] = useState([]);
    const [selected, setSelected] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                if (!primaryRole) return;

                // REPLACE the entire query section with:
                const snapshot = await getDocs(collection(db, "patronYcwHelps"));

                const list = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        did: doc.data().id,
                        name: doc.data().name,
                        profession: doc.data().profession,
                        primarySkill: doc.data().primarySkill,
                        secondarySkill: doc.data().secondarySkill,
                        tertiarySkill: doc.data().tertiarySkill || []
                    }))
                    .filter(candidate => {
                        // Check if primaryRole matches any of the skills
                        const roleMatch =
                            candidate.profession === primaryRole ||
                            candidate.primarySkill === primaryRole ||
                            candidate.secondarySkill === primaryRole ||
                            (Array.isArray(candidate.tertiarySkill) &&
                                candidate.tertiarySkill.includes(primaryRole));
                        return roleMatch;
                    });

                setCandidates(list);
            } catch (err) {
                console.error("Error fetching candidates:", err);
            }
        };

        if (open) {
            fetchCandidates();
            setSelected("");
            setSearchTerm("");
            setRemarks("");
            setDropdownOpen(false);
        }
    }, [open, primaryRole]);

    const filtered = candidates.filter(
        c =>
            c.did?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedCandidate = candidates.find(c => c.did === selected);

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                className="absolute top-1/2 left-1/2 bg-white rounded-lg shadow-xl"
                style={{
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "450px",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-blue-900">
                        Allocate Candidate
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full p-1 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1">
                    {/* Select Candidate */}
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                            Select Candidate <span className="text-red-500">*</span>
                        </label>

                        {/* Selected Display / Dropdown Trigger */}
                        <div
                            className="border rounded-lg bg-gray-50 px-3 py-2.5 cursor-pointer flex justify-between items-center hover:border-blue-400 transition"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            <span className={`truncate ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
                                {selected && selectedCandidate
                                    ? `${selectedCandidate.did} - ${selectedCandidate.name}`
                                    : "Select Candidate"}
                            </span>
                            <span className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </div>

                        {/* Dropdown */}
                        {dropdownOpen && (
                            <div className="mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                                {/* Search Input */}
                                <div className="p-2 border-b bg-gray-50">
                                    <input
                                        type="text"
                                        placeholder="Search by ID or Name..."
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                {/* Candidates List */}
                                <div className="max-h-40 sm:max-h-48 overflow-y-auto">
                                    {filtered.length > 0 ? (
                                        filtered.map((c) => (
                                            <div
                                                key={c.id}
                                                className={`px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-b-0 transition ${selected === c.did
                                                    ? "bg-blue-100 text-blue-900"
                                                    : "hover:bg-blue-50"
                                                    }`}
                                                onClick={() => {
                                                    setSelected(c.did);
                                                    setDropdownOpen(false);
                                                    setSearchTerm("");
                                                }}
                                            >
                                                <div className="font-medium text-sm">{c.did}</div>
                                                <div className="text-xs text-gray-600">{c.name}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-gray-500 text-sm text-center">
                                            No candidates found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Selected Candidate Preview */}
                    {selected && selectedCandidate && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs text-blue-600 font-medium mb-1">Selected:</div>
                            <div className="font-semibold text-blue-900">{selectedCandidate.name}</div>
                            <div className="text-sm text-blue-700">{selectedCandidate.did}</div>
                        </div>
                    )}

                    {/* Remarks */}
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                            Remarks
                        </label>
                        <textarea
                            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                            rows="3"
                            placeholder="Enter your remarks (optional)..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer - Fixed */}
                <div className="p-4 sm:p-5 border-t bg-gray-50 flex-shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (selected) {
                                    onConfirm(selected, remarks);
                                    onClose();
                                    setRemarks("");
                                    setSelected("");
                                }
                            }}
                            className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition text-sm ${selected
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-gray-300 cursor-not-allowed text-gray-500"
                                }`}
                            disabled={!selected}
                        >
                            Confirm Allocation
                        </button>
                    </div>
                </div>
            </Box>
        </Modal>
    );
}


// Candidate Selection Modal for Deployed Action
function CandidateSelectionModal({ open, onClose, onConfirm, patronId, candidateDetailsCache }) {
    const [selectedCandidateId, setSelectedCandidateId] = useState("");
    const [remarks, setRemarks] = useState("");

    const [paymentConfirmation, setPaymentConfirmation] = useState("");
    const [confirmContractSigning, setConfirmContractSigning] = useState("");
    const [candidateImage, setCandidateImage] = useState(null);
    const [candidatePoliceVerification, setCandidatePoliceVerification] = useState(null);
    const [candidateAadharCard, setCandidateAadharCard] = useState(null);

    // Get patron approved candidates
    const candidateDetails = candidateDetailsCache[patronId] || [];
    const patronApprovedCandidates = candidateDetails.filter(
        c => c.candidateStatus === "Patron Approved" || c.candidateStatus === "Deployed"
    );

    // Load saved data when candidate is selected or modal opens
    useEffect(() => {
        if (!open || !patronId || !candidateDetailsCache[patronId]) return;

        const candidates = candidateDetailsCache[patronId];
        const patronApproved = candidates.filter(c => c.candidateStatus === "Patron Approved");

        // If we have a selected candidate, load their saved verification data
        if (selectedCandidateId) {
            const candidate = patronApproved.find(c => c.id === selectedCandidateId);
            if (candidate) {
                // Load saved values if they exist
                setRemarks(candidate.deployedRemarks || "");
                setPaymentConfirmation(
                    candidate.paymentConfirmation === true ? "Yes" :
                        candidate.paymentConfirmation === false ? "No" : ""
                );
                setConfirmContractSigning(
                    candidate.confirmContractSigning === true ? "Yes" :
                        candidate.confirmContractSigning === false ? "No" : ""
                );
                // Don't set file states - we'll show links to existing files instead
            }
        } else if (patronApproved.length > 0) {
            // Auto-select if only one candidate or find one with saved data
            const candidateWithData = patronApproved.find(c =>
                c.paymentConfirmation !== undefined || c.confirmContractSigning !== undefined
            );
            if (candidateWithData) {
                setSelectedCandidateId(candidateWithData.id);
            }
        }
    }, [open, patronId, selectedCandidateId, candidateDetailsCache]);

    const handleConfirm = () => {
        if (!selectedCandidateId) {
            triggerSnackbar("Please select a candidate", "warning");
            return;
        }
        if (!remarks.trim()) {
            triggerSnackbar("Please enter remarks", "warning");
            return;
        }
        if (!paymentConfirmation) {
            triggerSnackbar("Please confirm payment status", "warning");
            return;
        }
        if (!confirmContractSigning) {
            triggerSnackbar("Please confirm contract signing status", "warning");
            return;
        }

        // Check if documents are required (not previously uploaded)
        const selectedCandidate = patronApprovedCandidates.find(c => c.id === selectedCandidateId);
        const needsImage = !candidateImage && !selectedCandidate?.candidateImage?.url;
        const needsPolice = !candidatePoliceVerification && !selectedCandidate?.candidatePoliceVerification?.url;
        const needsAadhar = !candidateAadharCard && !selectedCandidate?.candidateAadharCard?.url;

        if (needsImage) {
            triggerSnackbar("Please upload candidate image", "warning");
            return;
        }
        if (needsPolice) {
            triggerSnackbar("Please upload police verification document", "warning");
            return;
        }
        if (needsAadhar) {
            triggerSnackbar("Please upload Aadhar card document", "warning");
            return;
        }

        const verificationData = {
            paymentConfirmation: paymentConfirmation === "Yes",
            confirmContractSigning: confirmContractSigning === "Yes",
            candidateImage,
            candidatePoliceVerification,
            candidateAadharCard
        };

        // Call the parent handler
        onConfirm(selectedCandidateId, remarks, verificationData);

        setSelectedCandidateId("");
        setRemarks("");
        setPaymentConfirmation("");
        setConfirmContractSigning("");
        setCandidateImage(null);
        setCandidatePoliceVerification(null);
        setCandidateAadharCard(null);
        onClose();

    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                className="relative top-1/2 left-1/2 bg-white p-4 sm:p-6 rounded-lg shadow-xl"
                style={{
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "500px",
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: 'NeuzeitGro, sans-serif',
                }}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b bg-orange-50 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-orange-700">
                        Select Candidate to Deploy
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full p-1 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-4 sm:p-5">
                    {patronApprovedCandidates.length === 0 ? (
                        <div className="text-gray-500 text-center py-4">
                            No candidates are currently Patron Approved
                        </div>
                    ) : (
                        <>
                            {/* Select Candidate */}
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2 text-sm">
                                    Select Candidate <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                    {patronApprovedCandidates.map((candidate) => (
                                        <div
                                            key={candidate.id}
                                            onClick={() => setSelectedCandidateId(candidate.id)}
                                            className={`p-3 border rounded-lg cursor-pointer transition ${selectedCandidateId === candidate.id
                                                ? "border-orange-500 bg-orange-50"
                                                : "border-gray-300 hover:border-orange-300"
                                                }`}
                                        >
                                            <div className="font-semibold text-sm">{candidate.candidateName}</div>
                                            <div className="text-xs text-gray-600">ID: {candidate.candidateId}</div>
                                            <div className="text-xs text-gray-600">Contact: {candidate.candidateContact}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Deployment Remarks */}
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2 text-sm">
                                    Deployment Remarks <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                    rows="3"
                                    placeholder="Enter deployment remarks..."
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                />
                            </div>

                            {/* Payment Confirmation */}
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2 text-sm">
                                    Confirm Complete Payment <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentConfirmation"
                                            value="Yes"
                                            checked={paymentConfirmation === "Yes"}
                                            onChange={(e) => setPaymentConfirmation(e.target.value)}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentConfirmation"
                                            value="No"
                                            checked={paymentConfirmation === "No"}
                                            onChange={(e) => setPaymentConfirmation(e.target.value)}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">No</span>
                                    </label>
                                </div>
                            </div>

                            {/* Contract Signing Confirmation */}
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2 text-sm">
                                    Confirm Contract Signing <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="confirmContractSigning"
                                            value="Yes"
                                            checked={confirmContractSigning === "Yes"}
                                            onChange={(e) => setConfirmContractSigning(e.target.value)}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="confirmContractSigning"
                                            value="No"
                                            checked={confirmContractSigning === "No"}
                                            onChange={(e) => setConfirmContractSigning(e.target.value)}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">No</span>
                                    </label>
                                </div>
                            </div>

                            {/* Candidate Image Upload */}
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2 text-sm">
                                    Candidate Image <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCandidateImage(e.target.files[0])}
                                    className="w-full text-sm border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                {candidateImage && (
                                    <p className="text-xs text-green-600 mt-1">✓ {candidateImage.name}</p>
                                )}
                                {!candidateImage && selectedCandidateId && (() => {
                                    const candidate = patronApprovedCandidates.find(c => c.id === selectedCandidateId);
                                    return candidate?.candidateImage?.url ? (
                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                            <p className="text-xs text-blue-600">Previously uploaded: {candidate.candidateImage.name}</p>
                                            <a href={candidate.candidateImage.url} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-blue-500 underline">View Document</a>
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            {/* Police Verification Upload */}
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2 text-sm">
                                    Police Verification Document <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,.pdf,.doc,.docx"
                                    onChange={(e) => setCandidatePoliceVerification(e.target.files[0])}
                                    className="w-full text-sm border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                {candidatePoliceVerification && (
                                    <p className="text-xs text-green-600 mt-1">✓ {candidatePoliceVerification.name}</p>
                                )}
                                {!candidatePoliceVerification && selectedCandidateId && (() => {
                                    const candidate = patronApprovedCandidates.find(c => c.id === selectedCandidateId);
                                    return candidate?.candidatePoliceVerification?.url ? (
                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                            <p className="text-xs text-blue-600">Previously uploaded: {candidate.candidatePoliceVerification.name}</p>
                                            <a href={candidate.candidatePoliceVerification.url} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-blue-500 underline">View Document</a>
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            {/* Aadhar Card Upload */}
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2 text-sm">
                                    Aadhar Card Document <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,.pdf,.doc,.docx"
                                    onChange={(e) => setCandidateAadharCard(e.target.files[0])}
                                    className="w-full text-sm border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                {candidateAadharCard && (
                                    <p className="text-xs text-green-600 mt-1">✓ {candidateAadharCard.name}</p>
                                )}
                                {!candidateAadharCard && selectedCandidateId && (() => {
                                    const candidate = patronApprovedCandidates.find(c => c.id === selectedCandidateId);
                                    return candidate?.candidateAadharCard?.url ? (
                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                            <p className="text-xs text-blue-600">Previously uploaded: {candidate.candidateAadharCard.name}</p>
                                            <a href={candidate.candidateAadharCard.url} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-blue-500 underline">View Document</a>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {patronApprovedCandidates.length > 0 && (
                    <div className="p-4 sm:p-5 border-t bg-gray-50 flex-shrink-0">
                        <button
                            onClick={handleConfirm}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded w-full transition text-sm sm:text-base"
                        >
                            Confirm Deployment
                        </button>
                    </div>
                )}
            </Box>
        </Modal>
    );
}


function ReplaceModal({ open, onClose, onConfirm, primaryRole, selectedRow, candidateDetailsCache }) {
    const [candidates, setCandidates] = useState([]);
    const [selectedDeployedCandidate, setSelectedDeployedCandidate] = useState(""); // Which deployed candidate to replace
    const [selectedNewCandidate, setSelectedNewCandidate] = useState(""); // New replacement candidate
    const [searchTerm, setSearchTerm] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [reason, setReason] = useState("");

    const deploymentDate = selectedRow?.deployedTime?.toDate ? selectedRow.deployedTime.toDate() : null;
    const replacementCount = selectedRow?.replacementCount || 0;
    const maxReplacements = selectedRow?.maxReplacements || 3;
    const replacementsRemaining = maxReplacements - replacementCount;

    // Get deployed candidates from cache
    const candidateDetails = candidateDetailsCache[selectedRow?.id] || [];
    const deployedCandidates = candidateDetails.filter(
        c => c.candidateStatus === "Deployed"
    );

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                if (!primaryRole) return;

                const q = query(
                    collection(db, "patronYcwHelps"),
                    where("profession", "==", primaryRole)
                );

                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({
                    id: doc.id,
                    did: doc.data().id,
                    name: doc.data().name,
                    profession: doc.data().profession
                }));

                setCandidates(list);
            } catch (err) {
                console.error("Error fetching candidates:", err);
            }
        };

        if (open) {
            fetchCandidates();
            setSelectedDeployedCandidate("");
            setSelectedNewCandidate("");
            setSearchTerm("");
            setReason("");
            setDropdownOpen(false);
        }
    }, [open, primaryRole]);

    const filtered = candidates.filter(
        c =>
            c.did?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedNewCandidateObj = candidates.find(c => c.did === selectedNewCandidate);
    const selectedDeployedCandidateObj = deployedCandidates.find(c => c.candidateId === selectedDeployedCandidate);

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                className="absolute top-1/2 left-1/2 bg-white rounded-lg shadow-xl"
                style={{
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "500px",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-orange-50">
                    <div>
                        <h3 className="text-lg font-bold text-orange-700">Replace Candidate</h3>
                        <p className="text-sm text-orange-600 mt-1">
                            {replacementsRemaining} replacement{replacementsRemaining !== 1 ? 's' : ''} remaining (out of {maxReplacements})
                        </p>
                        {deploymentDate && (
                            <p className="text-xs text-gray-600 mt-1">
                                Deployed on: {deploymentDate.toLocaleDateString("en-GB")}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full p-1 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto flex-1">
                    {/* Select Deployed Candidate to Replace */}
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                            Select Deployed Candidate to Replace <span className="text-red-500">*</span>
                        </label>

                        {deployedCandidates.length === 0 ? (
                            <div className="text-gray-500 text-center py-4 border rounded-lg bg-gray-50">
                                No deployed candidates found
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {deployedCandidates.map((candidate) => (
                                    <div
                                        key={candidate.id}
                                        onClick={() => setSelectedDeployedCandidate(candidate.candidateId)}
                                        className={`p-3 border rounded-lg cursor-pointer transition ${selectedDeployedCandidate === candidate.candidateId
                                            ? "border-orange-500 bg-orange-50"
                                            : "border-gray-300 hover:border-orange-300"
                                            }`}
                                    >
                                        <div className="font-semibold text-sm">{candidate.candidateName}</div>
                                        <div className="text-xs text-gray-600">ID: {candidate.candidateId}</div>
                                        <div className="text-xs text-gray-600">Contact: {candidate.candidateContact}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Deployed: {candidate.deployedTime?.toDate ?
                                                candidate.deployedTime.toDate().toLocaleDateString("en-GB") :
                                                "N/A"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reason for Replacement */}
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                            Reason for Replacement <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                            rows="3"
                            placeholder="E.g., Performance issues, patron request, behavior concerns..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    {/* Select New Candidate */}
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2 text-sm">
                            Select New Candidate <span className="text-red-500">*</span>
                        </label>

                        <div
                            className="border rounded-lg bg-gray-50 px-3 py-2.5 cursor-pointer flex justify-between items-center hover:border-orange-400 transition"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            <span className={`truncate ${selectedNewCandidate ? 'text-gray-900' : 'text-gray-500'}`}>
                                {selectedNewCandidate && selectedNewCandidateObj
                                    ? `${selectedNewCandidateObj.did} - ${selectedNewCandidateObj.name}`
                                    : "Select Replacement Candidate"}
                            </span>
                            <span className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </div>

                        {dropdownOpen && (
                            <div className="mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                                <div className="p-2 border-b bg-gray-50">
                                    <input
                                        type="text"
                                        placeholder="Search by ID or Name..."
                                        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                <div className="max-h-48 overflow-y-auto">
                                    {filtered.length > 0 ? (
                                        filtered.map((c) => (
                                            <div
                                                key={c.id}
                                                className={`px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-b-0 transition ${selectedNewCandidate === c.did
                                                    ? "bg-orange-100 text-orange-900"
                                                    : "hover:bg-orange-50"
                                                    }`}
                                                onClick={() => {
                                                    setSelectedNewCandidate(c.did);
                                                    setDropdownOpen(false);
                                                    setSearchTerm("");
                                                }}
                                            >
                                                <div className="font-medium text-sm">{c.did}</div>
                                                <div className="text-xs text-gray-600">{c.name}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-gray-500 text-sm text-center">
                                            No candidates found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Selected Preview */}
                    {selectedNewCandidate && selectedNewCandidateObj && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="text-xs text-orange-600 font-medium mb-1">New Replacement:</div>
                            <div className="font-semibold text-orange-900">{selectedNewCandidateObj.name}</div>
                            <div className="text-sm text-orange-700">{selectedNewCandidateObj.did}</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t bg-gray-50">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (selectedDeployedCandidate && selectedNewCandidate && reason.trim()) {
                                    onConfirm(selectedDeployedCandidate, selectedNewCandidate, reason);
                                    onClose();
                                    setReason("");
                                    setSelectedDeployedCandidate("");
                                    setSelectedNewCandidate("");
                                }
                            }}
                            className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition text-sm ${selectedDeployedCandidate && selectedNewCandidate && reason.trim()
                                ? "bg-orange-600 hover:bg-orange-700 text-white"
                                : "bg-gray-300 cursor-not-allowed text-gray-500"
                                }`}
                            disabled={!selectedDeployedCandidate || !selectedNewCandidate || !reason.trim()}
                        >
                            Confirm Replacement
                        </button>
                    </div>
                </div>
            </Box>
        </Modal>
    );
}

function Dashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [candidateDetailsCache, setCandidateDetailsCache] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});
    const [openDrawerId, setOpenDrawerId] = useState(null);

    // For relocate modal
    const [relocateOpen, setRelocateOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    // For status action
    const [remarksModalOpen, setRemarksModalOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [currentRow, setCurrentRow] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(0);
    const [viewScheduleModalOpen, setViewScheduleModalOpen] = useState(false);

    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [currentUserDisplayName, setCurrentUserDisplayName] = useState("");
    const [currentUserSupplyRole, setCurrentUserSupplyRole] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [associateUsers, setAssociateUsers] = useState([]);

    const [urlFilterRole, setUrlFilterRole] = useState("");
    const [urlFilterStatus, setUrlFilterStatus] = useState("");
    const [urlFilterLM, setUrlFilterLM] = useState("");
    const [urlFilterCity, setUrlFilterCity] = useState("");
    const [urlFilterClientCode, setUrlFilterClientCode] = useState("");

    // For replace modal
    const [replaceOpen, setReplaceOpen] = useState(false);
    const [candidateSelectionModalOpen, setCandidateSelectionModalOpen] = useState(false);
    const [selectedReplaceRow, setSelectedReplaceRow] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [replaceReason, setReplaceReason] = useState("");

    const [openOfficeTrialSchedule, setOpenOfficeTrialSchedule] = useState(false);
    const [officeTrialDate, setOfficeTrialDate] = useState("");
    const [officeTrialTime, setOfficeTrialTime] = useState("");
    const [officeTrialFiles, setOfficeTrialFiles] = useState([]);
    const [officeTrialRemarks, setOfficeTrialRemarks] = useState("");

    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState("");

    const [openOfficeTrial, setOpenOfficeTrial] = useState(false);
    const [officeTrialMode, setOfficeTrialMode] = useState("Offline");
    const [officeTrialEvaluation, setOfficeTrialEvaluation] = useState({
        scores: {},
        remarks: {},
        finalVerdict: ''
    });
    const [officeTrialExecutionFiles, setOfficeTrialExecutionFiles] = useState([]);
    const [officeTrialExecutionRemarks, setOfficeTrialExecutionRemarks] = useState("");


    const normalizeRef = (ref) => {
        if (!ref) return null;
        // If it's already a DocumentReference, return it
        if (ref.path && typeof ref.path === 'string') return ref;
        // If it's a string path, convert to DocumentReference
        if (typeof ref === 'string') {
            const path = ref.startsWith('/') ? ref.slice(1) : ref;
            return doc(db, path);
        }
        return ref;
    };

    const getRefPath = (ref) => {
        if (!ref) return '';
        if (typeof ref === 'string') return ref.startsWith('/') ? ref : `/${ref}`;
        if (ref.path) return `/${ref.path}`;
        return '';
    };

    // Read URL parameters and apply filters
    useEffect(() => {
        if (searchParams) {
            const role = searchParams.get("role");
            const status = searchParams.get("status");
            const lm = searchParams.get("lm");
            const city = searchParams.get("city");
            const clientCode = searchParams.get("clientCode");

            if (role) setUrlFilterRole(role);
            if (status) setUrlFilterStatus(status);
            if (lm) setUrlFilterLM(lm);
            if (city) setUrlFilterCity(city);
            if (clientCode) setUrlFilterClientCode(clientCode);
        }
    }, [searchParams]);

    const handleOpenRelocate = (row) => {
        setSelectedRow(row);
        setRelocateOpen(true);
    };

    const handleStatusChange = async (status, row) => {
        setSelectedStatus(status);
        setCurrentRow(row);

        // For Deployed action, open candidate selection modal
        if (status === "Deployed") {
            // First, fetch candidate details if not cached
            if (!candidateDetailsCache[row.id]) {
                await fetchCandidateDetails(row.id, row);
            }
            setCandidateSelectionModalOpen(true);
        } else {
            setRemarksModalOpen(true);
        }
    };

    const handleRemarksConfirm = async (remarksOrCandidateId, remarks, verificationData = null) => {
        if (!currentRow || !selectedStatus) return;

        try {
            const currentTime = Timestamp.now();
            const patronDocRef = doc(db, "patronAddRequest", currentRow.id);
            const associateRef = `/patronAddRequest/${currentRow.id}`;


            if (selectedStatus === "Deployed") {
                const candidateId = remarksOrCandidateId;
                const deployedRemarks = remarks;
                // const verificationData = arguments[2]; // Third parameter contains verification data

                if (!verificationData) {
                    triggerSnackbar("Verification data is missing", "error");
                    return;
                }

                try {
                    const candidateRef = doc(db, "patronAddRequest", currentRow.id, "candidateDetails", candidateId);
                    const candidateSnap = await getDoc(candidateRef);

                    if (!candidateSnap.exists()) {
                        triggerSnackbar("Candidate not found", "error");
                        return;
                    }

                    const existingData = candidateSnap.data();
                    // Upload files to storage
                    const fileUploads = {};

                    if (verificationData.candidateImage) {
                        const imageRef = ref(storage, `deployments/${currentRow.id}/${candidateId}/image_${Date.now()}`);
                        await uploadBytes(imageRef, verificationData.candidateImage);
                        fileUploads.candidateImage = {
                            url: await getDownloadURL(imageRef),
                            name: verificationData.candidateImage.name,
                            type: verificationData.candidateImage.type
                        };
                    } else if (existingData.candidateImage) {
                        fileUploads.candidateImage = existingData.candidateImage;
                    }

                    if (verificationData.candidatePoliceVerification) {
                        const policeRef = ref(storage, `deployments/${currentRow.id}/${candidateId}/police_${Date.now()}`);
                        await uploadBytes(policeRef, verificationData.candidatePoliceVerification);
                        fileUploads.candidatePoliceVerification = {
                            url: await getDownloadURL(policeRef),
                            name: verificationData.candidatePoliceVerification.name,
                            type: verificationData.candidatePoliceVerification.type
                        };
                    } else if (existingData.candidatePoliceVerification) {
                        fileUploads.candidatePoliceVerification = existingData.candidatePoliceVerification;
                    }


                    if (verificationData.candidateAadharCard) {
                        const aadharRef = ref(storage, `deployments/${currentRow.id}/${candidateId}/aadhar_${Date.now()}`);
                        await uploadBytes(aadharRef, verificationData.candidateAadharCard);
                        fileUploads.candidateAadharCard = {
                            url: await getDownloadURL(aadharRef),
                            name: verificationData.candidateAadharCard.name,
                            type: verificationData.candidateAadharCard.type
                        };
                    }
                    else if (existingData.candidateAadharCard) {
                        fileUploads.candidateAadharCard = existingData.candidateAadharCard;
                    }

                    // Always deploy when all data is entered - removed payment/contract requirement
                    // DEPLOY: Update candidate status to Deployed
                    await updateDoc(candidateRef, {
                        candidateStatus: "Deployed",
                        candidateStatusTime: currentTime,
                        deployedRemarks: deployedRemarks,
                        deployedTime: currentTime,
                        paymentConfirmation: verificationData.paymentConfirmation,
                        confirmContractSigning: verificationData.confirmContractSigning,
                        ...fileUploads
                    });

                    // Update main patron document
                    await updateDoc(patronDocRef, {
                        status: "Deployed",
                        deployedTime: currentTime,
                        dropdownStatusTime: currentTime,
                        taskCompletedDate: currentTime,
                        lastStatusAction: "Deployed",
                    });

                    // Update task collection
                    const taskCollectionRef = collection(db, "createTaskCollection");
                    const associateRefString = associateRef;
                    const associateRefDoc = doc(db, 'patronAddRequest', currentRow.id);

                    const taskQueryString = query(taskCollectionRef, where("associateRef", "==", associateRefString));
                    const taskQueryRef = query(taskCollectionRef, where("associateRef", "==", associateRefDoc));

                    const [taskSnapshotString, taskSnapshotRef] = await Promise.all([
                        getDocs(taskQueryString),
                        getDocs(taskQueryRef)
                    ]);

                    const taskSnapshot = !taskSnapshotString.empty ? taskSnapshotString : taskSnapshotRef;

                    if (!taskSnapshot.empty) {
                        const taskDoc = taskSnapshot.docs[0];
                        const taskDocRef = doc(db, "createTaskCollection", taskDoc.id);

                        await updateDoc(taskDocRef, {
                            status: "Deployed",
                            taskStatusCategory: "Completed",
                            lastComment: "Candidate has been successfully deployed.",
                            taskCompletedDate: currentTime,
                            taskInProcessDate: currentTime,
                        });

                        const commentsThreadRef = collection(taskDocRef, "commentsThread");
                        const ownerRef = await getUserRefByDisplayName(currentUserDisplayName);
                        await addDoc(commentsThreadRef, {
                            comment_Text: deployedRemarks,
                            timeStamp: currentTime,
                            comment_owner_name: currentUserDisplayName || currentUserEmail || "",
                            comment_owner_img: "",
                            comment_owner_ref: ownerRef,
                            taskRef: taskDocRef,
                            commentDate: currentTime,
                            taskStatusCategory: "Completed",
                            isUpdate: true,
                        });
                    }

                    setRows(prevRows =>
                        prevRows.map(row =>
                            row.id === currentRow.id
                                ? { ...row, status: "Deployed", lastStatusAction: "Deployed" }
                                : row
                        )
                    );

                    triggerSnackbar("Candidate deployed successfully!", "success");

                    // Clear cache and refresh
                    setCandidateDetailsCache(prev => {
                        const updated = { ...prev };
                        delete updated[currentRow.id];
                        return updated;
                    });

                    if (openDrawerId === currentRow.id) {
                        await fetchCandidateDetails(currentRow.id, null, true);
                    }

                    return;

                } catch (error) {
                    console.error("Error during deployment:", error);
                    triggerSnackbar("Error uploading documents: " + error.message, "error");
                    return;
                }
            }

            // Handle other statuses (Open, On Hold, Closed, No Revert)
            const remarksText = remarksOrCandidateId; // First param is remarks for other statuses

            let updates = {
                dropdownStatusTime: currentTime,
            };

            const remarksFieldMap = {
                "Open": { remarksField: "openRemarks", timeField: "openTime" },
                "On Hold": { remarksField: "onHoldRemarks", timeField: "onHoldTime" },
                "Closed": { remarksField: "serviceClosedRemarks", timeField: "serviceClosedTime" },
                "No Revert": { remarksField: "noRevertRemarks", timeField: "noRevertTime" },
            };

            if (remarksFieldMap[selectedStatus]) {
                updates[remarksFieldMap[selectedStatus].remarksField] = remarksText;
                updates[remarksFieldMap[selectedStatus].timeField] = currentTime;
            }

            if (selectedStatus === "Open") {
                if (currentRow.onHoldStatus && currentRow.onHoldStatus !== "") {
                    updates.status = currentRow.onHoldStatus;
                }
            } else {
                const onHoldStatusEmpty = !currentRow.onHoldStatus || currentRow.onHoldStatus === "";

                if (onHoldStatusEmpty) {
                    updates.onHoldStatus = currentRow.status;
                }

                if (selectedStatus === "On Hold" || selectedStatus === "Closed") {
                    // ✅ UPDATE PATRON DATABASE FIRST
                    if (selectedStatus === "On Hold") {
                        updates.status = "On Hold";
                        updates.taskStatusCategory = "On Hold";
                        updates.lastComment = "The process has been put on hold.";
                        updates.onHoldDate = currentTime;
                        updates.taskInProcessDate = currentTime;
                    } else if (selectedStatus === "Closed") {
                        updates.status = "Closed";
                        updates.taskStatusCategory = "Cancelled";
                        updates.lastComment = "The request has been cancelled.";
                        updates.taskCancelledDate = currentTime;
                        updates.taskInProcessDate = currentTime;
                    }

                    // ✅ THEN UPDATE TASK COLLECTION
                    const taskCollectionRef = collection(db, "createTaskCollection");
                    const associateRefString = associateRef;
                    const associateRefDoc = doc(db, 'patronAddRequest', currentRow.id);

                    const taskQueryString = query(taskCollectionRef, where("associateRef", "==", associateRefString));
                    const taskQueryRef = query(taskCollectionRef, where("associateRef", "==", associateRefDoc));

                    const [taskSnapshotString, taskSnapshotRef] = await Promise.all([
                        getDocs(taskQueryString),
                        getDocs(taskQueryRef)
                    ]);

                    const taskSnapshot = !taskSnapshotString.empty ? taskSnapshotString : taskSnapshotRef;

                    if (!taskSnapshot.empty) {
                        const taskDoc = taskSnapshot.docs[0];
                        const taskDocRef = doc(db, "createTaskCollection", taskDoc.id);

                        let newTaskStatusCategory = "";
                        let commentText = "";

                        if (selectedStatus === "On Hold") {
                            newTaskStatusCategory = "On Hold";
                            commentText = "The process has been put on hold.";
                            await updateDoc(taskDocRef, {
                                status: "On Hold",
                                taskStatusCategory: newTaskStatusCategory,
                                lastComment: commentText,
                                onHoldDate: currentTime,
                                taskInProcessDate: currentTime,
                            });
                        } else if (selectedStatus === "Closed") {
                            newTaskStatusCategory = "Closed";
                            commentText = "The request has been cancelled.";
                            await updateDoc(taskDocRef, {
                                status: "Closed",
                                taskStatusCategory: newTaskStatusCategory,
                                lastComment: commentText,
                                taskCancelledDate: currentTime,
                                taskInProcessDate: currentTime,
                            });
                        }

                        // Create commentsThread entry
                        const commentsThreadRef = collection(taskDocRef, "commentsThread");
                        const ownerRef = await getUserRefByDisplayName(currentUserDisplayName);
                        await addDoc(commentsThreadRef, {
                            comment_Text: remarksText ? `${commentText} Remarks: ${remarksText}` : commentText,
                            timeStamp: currentTime,
                            comment_owner_name: currentUserDisplayName || currentUserEmail || "",
                            comment_owner_img: "",
                            comment_owner_ref: ownerRef,
                            taskRef: taskDocRef,
                            commentDate: currentTime,
                            taskStatusCategory: newTaskStatusCategory,
                            isUpdate: true,
                        });
                    }
                }
            }
            updates.lastStatusAction = selectedStatus;

            await updateDoc(patronDocRef, updates);
            triggerSnackbar(`Status updated to ${selectedStatus} successfully!`, "success");
            fetchData();
            setAutoRefresh(prev => prev + 1);

        } catch (error) {
            console.error("Error updating status:", error);
            triggerSnackbar("Error updating status: " + error.message, "error");
        }
    };

    // Office Trial Schedule Handlers
    const handleOfficeTrialScheduleOpen = (row, candidate) => {
        setSelectedRow(row);
        setSelectedCandidate(candidate);
        setOpenOfficeTrialSchedule(true);
    };

    const handleOfficeTrialScheduleClose = () => {
        setOpenOfficeTrialSchedule(false);
        setOfficeTrialDate("");
        setOfficeTrialTime("");
        setOfficeTrialFiles([]);
        setOfficeTrialRemarks("");
        setSelectedCandidate(null);
        setSelectedRow(null);
    };

    const handleOfficeTrialScheduleSubmit = async () => {
        if (!officeTrialDate || !officeTrialTime) {
            triggerSnackbar("Please select date and time for office trial", "error");
            return;
        }
        if (!selectedCandidate || !selectedRow) return;

        try {
            const currentTime = Timestamp.now();
            const officeTrialDateTime = new Date(`${officeTrialDate}T${officeTrialTime}`);

            const patronRef = doc(db, "patronAddRequest", selectedRow);
            const candidateRef = doc(db, "patronAddRequest", selectedRow, "candidateDetails", selectedCandidate.id);

            await updateDoc(candidateRef, {
                officeTrialScheduledTime: officeTrialDateTime,
                officeTrialSetTime: currentTime,
                candidateStatus: "Office Trial Scheduled",
                candidateStatusTime: currentTime,
                officeTrialScheduledBy: currentUserEmail, // ✅ Track who scheduled
            });

            await updateDoc(patronRef, {
                status: "Office Trial Scheduled",
                dropdownStatusTime: currentTime,
            });

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedRow
                        ? { ...row, status: "Office Trial Scheduled" }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedRow];
                return updated;
            });

            // ✅ Force re-fetch if drawer is open
            if (openDrawerId === selectedRow) {
                await fetchCandidateDetails(selectedRow, null, true);
            }

            triggerSnackbar("Office trial scheduled successfully!", "success");
            handleOfficeTrialScheduleClose();
        } catch (err) {
            console.error("Error scheduling office trial:", err);
            triggerSnackbar("Error scheduling office trial: " + err.message, "error");
        }
    };

    // Office Trial Execution Handlers
    const handleOfficeTrialOpen = (row, candidate) => {
        setSelectedRow(row);
        setSelectedCandidate(candidate);
        setOfficeTrialMode("Offline");
        setOfficeTrialEvaluation({ scores: {}, remarks: {}, overallRating: '', finalVerdict: '' });
        setOfficeTrialExecutionFiles([]);
        setOfficeTrialExecutionRemarks("");
        setOpenOfficeTrial(true);
    };

    const handleOfficeTrialClose = () => {
        setOpenOfficeTrial(false);
        setOfficeTrialMode("Offline");
        setOfficeTrialEvaluation({ scores: {}, remarks: {}, overallRating: '', finalVerdict: '' });
        setOfficeTrialExecutionFiles([]);
        setOfficeTrialExecutionRemarks("");
        setSelectedCandidate(null);
        setSelectedRow(null);
    };

    const handleOfficeTrialApprove = async () => {
        if (!selectedCandidate || !selectedRow) return;

        try {
            const currentTime = Timestamp.now();

            // Upload files
            const fileUrls = [];
            for (const file of officeTrialExecutionFiles) {
                const storageRef = ref(storage, `officeTrialExecution/${selectedRow}/${selectedCandidate.id}/${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                fileUrls.push({ name: file.name, url, type: file.type });
            }

            const patronRef = doc(db, "patronAddRequest", selectedRow);
            const candidateRef = doc(db, "patronAddRequest", selectedRow, "candidateDetails", selectedCandidate.id);

            await updateDoc(candidateRef, {
                officeTrialApproved: true,
                officeTrialRejected: false,
                officeTrialMode: officeTrialMode,
                officeTrialEvaluationForm: officeTrialEvaluation,
                officeTrialCompletedTime: currentTime,
                officeTrialExecutionFiles: fileUrls,
                candidateStatus: "Office Trial Completed",
                candidateStatusTime: currentTime,
                officeTrialBy: currentUserEmail, // ✅ Track who approved
            });

            await updateDoc(patronRef, {
                status: "Office Trial Completed",
                dropdownStatusTime: currentTime,
            });

            // Update task collection and create commentsThread
            const taskCollectionRef = collection(db, "createTaskCollection");
            const associateRefString = `/patronAddRequest/${selectedRow}`;
            const associateRefDoc = doc(db, 'patronAddRequest', selectedRow);

            // Query for both string and reference formats
            const taskQueryString = query(taskCollectionRef, where("associateRef", "==", associateRefString));
            const taskQueryRef = query(taskCollectionRef, where("associateRef", "==", associateRefDoc));

            const [taskSnapshotString, taskSnapshotRef] = await Promise.all([
                getDocs(taskQueryString),
                getDocs(taskQueryRef)
            ]);

            const taskSnapshot = !taskSnapshotString.empty ? taskSnapshotString : taskSnapshotRef;

            if (!taskSnapshot.empty) {
                const taskDoc = taskSnapshot.docs[0];
                const taskDocRef = doc(db, "createTaskCollection", taskDoc.id);

                await updateDoc(taskDocRef, {
                    status: "Office Trial Completed",
                    taskStatusCategory: "In Process",
                    lastComment: "Candidate office trial has been scheduled.",
                    taskInProcessDate: currentTime
                });

                const ownerRef = await getUserRefByDisplayName(selectedRow.assignedLMName || currentUserDisplayName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: "Candidate office trial is approved.",
                    timeStamp: currentTime,
                    comment_owner_name: currentUserDisplayName || currentUserEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            // Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedRow
                        ? { ...row, status: "Office Trial Completed" }
                        : row
                )
            );

            // Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedRow];
                return updated;
            });

            // Force re-fetch if drawer is open
            if (openDrawerId === selectedRow) {
                await fetchCandidateDetails(selectedRow, null, true);
            }

            triggerSnackbar("Office trial approved successfully!", "success");
            handleOfficeTrialClose();
        } catch (err) {
            console.error("Error approving office trial:", err);
            triggerSnackbar("Error approving office trial: " + err.message, "error");
        }
    };

    const handleOfficeTrialReject = async () => {
        if (!selectedCandidate || !selectedRow) return;

        try {
            const currentTime = Timestamp.now();
            // Upload files
            const fileUrls = [];
            for (const file of officeTrialExecutionFiles) {
                const storageRef = ref(storage, `officeTrialExecution/${selectedRow}/${selectedCandidate.id}/${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                fileUrls.push({ name: file.name, url, type: file.type });
            }

            const patronRef = doc(db, "patronAddRequest", selectedRow);
            const candidateRef = doc(db, "patronAddRequest", selectedRow, "candidateDetails", selectedCandidate);

            await updateDoc(candidateRef, {
                officeTrialApproved: false,
                officeTrialRejected: true,
                officeTrialMode: officeTrialMode,
                officeTrialEvaluationForm: officeTrialEvaluation,
                officeTrialRejectedTime: currentTime,
                officeTrialExecutionFiles: fileUrls,
                candidateStatus: "Office Trial Rejected",
                candidateStatusTime: currentTime,
                officeTrialBy: currentUserEmail, // ✅ Track who rejected
            });

            await updateDoc(patronRef, {
                status: "Office Trial Rejected",
                dropdownStatusTime: currentTime,
            });

            // Update task collection and create commentsThread
            const taskCollectionRef = collection(db, "createTaskCollection");
            const associateRefString = `/patronAddRequest/${selectedRow}`;
            const associateRefDoc = doc(db, 'patronAddRequest', selectedRow);

            // Query for both string and reference formats
            const taskQueryString = query(taskCollectionRef, where("associateRef", "==", associateRefString));
            const taskQueryRef = query(taskCollectionRef, where("associateRef", "==", associateRefDoc));

            const [taskSnapshotString, taskSnapshotRef] = await Promise.all([
                getDocs(taskQueryString),
                getDocs(taskQueryRef)
            ]);

            const taskSnapshot = !taskSnapshotString.empty ? taskSnapshotString : taskSnapshotRef;

            if (!taskSnapshot.empty) {
                const taskDoc = taskSnapshot.docs[0];
                const taskDocRef = doc(db, "createTaskCollection", taskDoc.id);

                await updateDoc(taskDocRef, {
                    status: "Office Trial Rejected",
                    taskStatusCategory: "In Process",
                    lastComment: "Candidate office trial has been scheduled.",
                    taskInProcessDate: currentTime
                });

                const ownerRef = await getUserRefByDisplayName(selectedRow.assignedLMName || currentUserDisplayName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: "Candidate office trial is rejected.",
                    timeStamp: currentTime,
                    comment_owner_name: currentUserDisplayName || currentUserEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            // Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === selectedRow
                        ? { ...row, status: "Office Trial Rejected" }
                        : row
                )
            );

            // Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[selectedRow];
                return updated;
            });

            // Force re-fetch if drawer is open
            if (openDrawerId === selectedRow) {
                await fetchCandidateDetails(selectedRow, null, true);
            }

            triggerSnackbar("Office trial rejected!", "error");
            handleOfficeTrialClose();
        } catch (err) {
            console.error("Error rejecting office trial:", err);
            triggerSnackbar("Error rejecting office trial: " + err.message, "error");
        }
    };

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

    const fetchAssociateUsers = async () => {
        try {
            const userCollectionRef = collection(db, "user");
            const associateQuery = query(userCollectionRef, where("supplyRole", "==", "Associate"));
            const associateSnapshot = await getDocs(associateQuery);

            const associates = associateSnapshot.docs.map(doc => ({
                id: doc.id,
                displayName: doc.data().display_name || "",
                email: doc.data().email || ""
            }));

            setAssociateUsers(associates);
        } catch (error) {
            console.error("Error fetching associate users:", error);
        }
    };

    const handleAssignedSupplyChange = async (currentRow, newDisplayName) => {
        if (!newDisplayName) return;

        try {
            // Find the selected associate's email from associateUsers array
            const selectedAssociate = associateUsers.find(user => user.displayName === newDisplayName);

            if (!selectedAssociate) {
                triggerSnackbar("Selected associate not found", "error");
                return;
            }

            const assignedSupplyEmail = selectedAssociate.email;

            // Get the currently logged-in user's display_name for assignedBy
            const assignedBy = currentUserDisplayName;

            const patronDocRef = doc(db, "patronAddRequest", currentRow.id);
            await updateDoc(patronDocRef, {
                assignedSupplyName: newDisplayName,
                assignedSupplyEmail: assignedSupplyEmail,
                assignedBy: assignedBy,
                assignedSupplyTime: Timestamp.now(),
            });

            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === currentRow.id
                        ? {
                            ...row,
                            assignedSupplyName: newDisplayName,
                            assignedSupplyEmail: assignedSupplyEmail,
                            assignedBy: assignedBy,
                            assignedSupplyTime: Timestamp.now()
                        }
                        : row
                )
            );

            triggerSnackbar(`Task assigned to ${newDisplayName} successfully!`, "success");
        } catch (error) {
            console.error("Error updating assigned supply:", error);
            triggerSnackbar("Error assigning task: " + error.message, "error");
        }
    };

    const handleConfirmRelocate = async (candidateId, remarks) => {
        if (!selectedRow || !candidateId) {
            triggerSnackbar("Invalid selection", "error");
            return;
        }

        try {
            const patronDocId = selectedRow.id;
            const patronDocuRef = doc(db, "patronAddRequest", patronDocId);
            const patronDocSnap = await getDoc(patronDocuRef);

            if (!patronDocSnap.exists()) {
                triggerSnackbar("No matching patron found for this request", "error");
                return;
            }

            const patronData = patronDocSnap.data();

            // ✅ Corrected — use subcollection under this doc
            const candidateDetailsRef = collection(patronDocuRef, "candidateDetails");

            const candidateQuery = query(candidateDetailsRef, where("candidateId", "==", candidateId));
            const candidateSnapshot = await getDocs(candidateQuery);

            if (!candidateSnapshot.empty) {
                triggerSnackbar("Candidate is already allocated", "warning");
                return;
            }

            const helpsQuery = query(collection(db, "patronYcwHelps"), where("id", "==", candidateId));
            const helpsSnapshot = await getDocs(helpsQuery);

            if (helpsSnapshot.empty) {
                triggerSnackbar("Candidate not found in patronYcwHelps", "error");
                return;
            }

            const candidateData = helpsSnapshot.docs[0].data();
            const associateRef = `/patronAddRequest/${patronDocId}`;
            const currentTime = Timestamp.now();
            const associateRefDoc = doc(db, 'patronAddRequest', patronDocId);

            // ✅ Prepare new candidate data
            const newCandidate = {
                candidateName: String(candidateData.name || ""),
                candidateId: String(candidateData.id || candidateId),
                candidateSource: String(candidateData.source || ""),
                candidateContact: String(candidateData.mobileNumber || ""),
                resourceAllocatedTime: currentTime,
                dropdownStatusTime: currentTime,
                associateRef: associateRefDoc,
                candidateStatus: "Resource Allocated",
                candidateStatusTime: currentTime,
                resourceAllocatedRemarks: remarks || "",
            };

            // ✅ Update task collection
            const createTaskCollectionRef = collection(db, "createTaskCollection");
            const associateRefString = associateRef;

            const taskQueryString = query(createTaskCollectionRef, where("associateRef", "==", associateRefString));
            const taskQueryRef = query(createTaskCollectionRef, where("associateRef", "==", associateRefDoc));

            const [taskSnapshotString, taskSnapshotRef] = await Promise.all([
                getDocs(taskQueryString),
                getDocs(taskQueryRef)
            ]);

            const taskSnapshot = !taskSnapshotString.empty ? taskSnapshotString : taskSnapshotRef;


            if (!taskSnapshot.empty) {
                const taskDoc = taskSnapshot.docs[0];
                const taskDocRef = taskDoc.ref;
                const taskData = taskDoc.data();

                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                const ownerRef = await getUserRefByDisplayName(selectedRow.assignedLMName || currentUserDisplayName);
                const commentData = {
                    comment_Text: remarks,
                    timeStamp: currentTime,
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    comment_owner_name: selectedRow.assignedLMName || "",
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,

                };
                await addDoc(commentsThreadRef, commentData);

                if (taskData.isUpdate !== true) {
                    await updateDoc(taskDocRef, {
                        isUpdate: true,
                        lastComment: 'Resource Allocated',
                        taskInProcessDate: currentTime,
                        taskStatusCategory: 'In Process'
                    });
                }
            }

            // ✅ Add candidate to subcollection
            await addDoc(candidateDetailsRef, newCandidate);

            // ✅ Update patron doc status
            const updatedFields = { taskStatusTime: currentTime };
            if (patronData.status !== "Allocated") {
                updatedFields.status = "Resource Allocated";
            }
            await updateDoc(patronDocuRef, updatedFields);

            triggerSnackbar("Candidate relocated and updates saved successfully!", "success");

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === patronDocId
                        ? { ...row, status: "Resource Allocated", candidateCount: (row.candidateCount || 0) + 1 }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[patronDocId];
                return updated;
            });

            // ✅ Force re-fetch if drawer is open
            if (openDrawerId === patronDocId) {
                await fetchCandidateDetails(patronDocId, null, true);
            }

        } catch (error) {
            console.error("Error relocating candidate:", error);
            triggerSnackbar("Error relocating candidate: " + error.message, "error");
        }
    };

    const handleOpenReplace = async (row) => {
        // Fetch candidate details if not cached
        if (!candidateDetailsCache[row.id]) {
            await fetchCandidateDetails(row.id, row);
        }
        setSelectedReplaceRow(row);
        setReplaceOpen(true);
    };

    const handleReplaceExpired = (row) => {
        triggerSnackbar(
            `This deployment is older than 6 months.` +
            `Original Deployment: ${row.deployedTime?.toDate ? row.deployedTime.toDate().toLocaleDateString("en-GB") : "N/A"}\n` +
            `Please create a new patron request with 100% monthly fee (50% advance).`
        );
    };

    const handleConfirmReplace = async (deployedCandidateId, newCandidateId, remarks) => {
        if (!selectedReplaceRow || !deployedCandidateId || !newCandidateId) {
            triggerSnackbar("Invalid selection", "error");
            return;
        }

        try {
            const patronDocId = selectedReplaceRow.id;
            const patronDocRef = doc(db, "patronAddRequest", patronDocId);
            const patronDocSnap = await getDoc(patronDocRef);

            if (!patronDocSnap.exists()) {
                triggerSnackbar("Patron request not found", "error");
                return;
            }

            const patronData = patronDocSnap.data();
            const replacementCount = patronData.replacementCount || 0;
            const currentTime = Timestamp.now();
            const associateRef = `/patronAddRequest/${patronDocId}`;
            const associateRefDoc = doc(db, 'patronAddRequest', patronDocId);

            // Get the deployed candidate document
            const candidateDetailsRef = collection(patronDocRef, "candidateDetails");
            const deployedCandidateRef = doc(db, "patronAddRequest", patronDocId, "candidateDetails",
                candidateDetailsCache[patronDocId].find(c => c.candidateId === deployedCandidateId)?.id
            );
            const deployedCandidateSnap = await getDoc(deployedCandidateRef);

            if (!deployedCandidateSnap.exists()) {
                triggerSnackbar("Deployed candidate not found", "error");
                return;
            }

            const oldCandidateData = deployedCandidateSnap.data();

            // Check if new candidate already exists
            const candidateQuery = query(candidateDetailsRef, where("candidateId", "==", newCandidateId));
            const candidateSnapshot = await getDocs(candidateQuery);

            if (!candidateSnapshot.empty) {
                triggerSnackbar("This candidate is already allocated to this request", "warning");
                return;
            }

            // Fetch new candidate from patronYcwHelps
            const helpsQuery = query(collection(db, "patronYcwHelps"), where("id", "==", newCandidateId));
            const helpsSnapshot = await getDocs(helpsQuery);

            if (helpsSnapshot.empty) {
                triggerSnackbar("Candidate not found", "error");
                return;
            }

            const newCandidateData = helpsSnapshot.docs[0].data();

            // Update old candidate with replacement info
            await updateDoc(deployedCandidateRef, {
                candidateStatus: "Replaced",
                candidateStatusTime: currentTime,
                replacedTime: currentTime,
                replacementReason: remarks,
                replacedBy: currentUserDisplayName
            });

            // Add new candidate
            const newCandidate = {
                candidateName: String(newCandidateData.name || ""),
                candidateId: String(newCandidateData.id || newCandidateId),
                candidateSource: String(newCandidateData.source || ""),
                candidateContact: String(newCandidateData.mobileNumber || ""),
                resourceAllocatedTime: currentTime,
                dropdownStatusTime: currentTime,
                associateRef: associateRefDoc,
                candidateStatus: "Resource Allocated",
                candidateStatusTime: currentTime,
                resourceAllocatedRemarks: `Replacement for ${oldCandidateData.candidateName} (Reason: ${remarks})`,
                isReplacement: true,
                replacementFor: oldCandidateData.candidateId
            };

            await addDoc(candidateDetailsRef, newCandidate);

            // Update patron document
            const replacementHistory = patronData.replacementHistory || [];
            replacementHistory.push({
                replacedAt: currentTime,
                oldCandidateId: oldCandidateData.candidateId,
                oldCandidateName: oldCandidateData.candidateName,
                newCandidateId: newCandidateId,
                newCandidateName: newCandidateData.name,
                reason: remarks,
                requestedBy: currentUserDisplayName
            });

            await updateDoc(patronDocRef, {
                status: "Resource Allocated",
                replacementCount: replacementCount + 1,
                replacementHistory,
                lastReplacementAt: currentTime,
                dropdownStatusTime: currentTime
            });

            triggerSnackbar("Candidate replaced successfully!", "success");

            // ✅ Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === patronDocId
                        ? { ...row, status: "Resource Allocated", replacementCount: replacementCount + 1, lastReplacementAt: currentTime }
                        : row
                )
            );

            // ✅ Clear cache for ONLY this patron
            setCandidateDetailsCache(prev => {
                const updated = { ...prev };
                delete updated[patronDocId];
                return updated;
            });

            // ✅ Force re-fetch if drawer is open
            if (openDrawerId === patronDocId) {
                await fetchCandidateDetails(patronDocId, null, true);
            }

        } catch (error) {
            console.error("Error replacing candidate:", error);
            triggerSnackbar("Error replacing candidate: " + error.message, "error");
        }
    };

    // Add after handleConfirmReplace function (around line 650)
    const handleActivateTask = async (patronId) => {
        if (!patronId) return;

        try {
            const currentTime = Timestamp.now();
            const patronRef = doc(db, "patronAddRequest", patronId);

            // Calculate taskDueDate (45 days from now)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 45);
            const taskDueDate = Timestamp.fromDate(dueDate);

            // Update patronAddRequest
            await updateDoc(patronRef, {
                status: "Active",
                isCompleteDetails: true,
                taskDueDate: taskDueDate,
                activatedAt: currentTime,
                activatedBy: currentUserDisplayName || currentUserEmail,
                dropdownStatusTime: currentTime
            });

            // Update createTaskCollection
            const taskCollectionRef = collection(db, "createTaskCollection");
            const associateRefString = `/patronAddRequest/${patronId}`;
            const associateRefDoc = doc(db, 'patronAddRequest', patronId);

            const taskQueryString = query(taskCollectionRef, where("associateRef", "==", associateRefString));
            const taskQueryRef = query(taskCollectionRef, where("associateRef", "==", associateRefDoc));

            const [taskSnapshotString, taskSnapshotRef] = await Promise.all([
                getDocs(taskQueryString),
                getDocs(taskQueryRef)
            ]);

            const taskSnapshot = !taskSnapshotString.empty ? taskSnapshotString : taskSnapshotRef;

            if (!taskSnapshot.empty) {
                const taskDoc = taskSnapshot.docs[0];
                const taskDocRef = doc(db, "createTaskCollection", taskDoc.id);

                await updateDoc(taskDocRef, {
                    status: "Active",
                    isCompleteDetails: true,
                    taskDueDate: taskDueDate,
                    activatedAt: currentTime,
                    activatedBy: currentUserDisplayName || currentUserEmail,
                    taskStatusCategory: "In Process",
                    lastComment: "Task activated by Supply team",
                    taskInProcessDate: currentTime
                });

                const ownerRef = await getUserRefByDisplayName(currentUserDisplayName);
                const commentsThreadRef = collection(taskDocRef, "commentsThread");
                await addDoc(commentsThreadRef, {
                    comment_Text: "Task has been activated and is now in process.",
                    timeStamp: currentTime,
                    comment_owner_name: currentUserDisplayName || currentUserEmail || "",
                    comment_owner_img: "",
                    comment_owner_ref: ownerRef,
                    taskRef: taskDocRef,
                    commentDate: currentTime,
                    taskStatusCategory: "In Process",
                    isUpdate: true,
                });
            }

            // Update only the specific row
            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === patronId
                        ? { ...row, status: "Active", taskDueDate: taskDueDate }
                        : row
                )
            );

            triggerSnackbar("Task activated successfully!", "success");

        } catch (error) {
            console.error("Error activating task:", error);
            triggerSnackbar("Error activating task: " + error.message, "error");
        }
    };


    // ✅ NEW: Update single row without full reload
    const updateSingleRow = async (patronId, updates = {}) => {
        try {
            // Fetch updated patron data
            const patronRef = doc(db, "patronAddRequest", patronId);
            const patronSnap = await getDoc(patronRef);

            if (!patronSnap.exists()) return;

            const rowData = { id: patronSnap.id, ...patronSnap.data(), ...updates };

            // Fetch candidate count and details
            const candidateDetailsRef = collection(db, "patronAddRequest", patronId, "candidateDetails");
            const candidateSnapshot = await getDocs(candidateDetailsRef);

            const candidateDetailsList = candidateSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            rowData.candidateCount = candidateSnapshot.size;

            // Normalize resourceAllocatedTime values
            const resourceTimes = candidateSnapshot.docs
                .map(d => d.data().resourceAllocatedTime)
                .filter(Boolean)
                .map(ts => (ts?.toDate ? ts.toDate() : new Date(ts)));

            const now = new Date();
            const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            const isHighlight = resourceTimes.some(time => {
                if (!(time instanceof Date) || isNaN(time)) return false;
                return time >= twelveHoursAgo;
            });

            const updatedData = {
                ...rowData,
                resourceAllocatedTimes: resourceTimes,
                highlight: isHighlight,
            };

            // Update rows array without full reload
            setRows(prevRows =>
                prevRows.map(row => row.id === patronId ? updatedData : row)
            );

            // Refresh candidate details cache for this patron
            setCandidateDetailsCache(prev => ({
                ...prev,
                [patronId]: candidateDetailsList
            }));

            return updatedData;
        } catch (err) {
            console.error("Error updating single row:", err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const collRef = collection(db, "patronAddRequest");
            let querySnapshot;

            // ✅ Filter for completed details OR undefined (old tasks)
            if (isAdmin) {
                // Admin sees all tasks
                querySnapshot = await getDocs(collRef);
            } else {
                // Associate sees only their assigned tasks
                const userQuery = query(
                    collRef,
                    where("assignedSupplyName", "==", currentUserDisplayName)
                );
                querySnapshot = await getDocs(userQuery);
            }

            // ✅ Temporary cache to collect candidate details
            const tempCandidateCache = {};

            const rowsData = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
                const rowData = { id: docSnap.id, ...docSnap.data() };

                // ✅ FILTER: Skip tasks where isCompleteDetails is explicitly false
                if (rowData.isCompleteDetails === false) {
                    return null; // Don't show tasks that haven't been completed by LM yet
                }
                // Show tasks where isCompleteDetails is true OR undefined (old tasks)

                // Fetch all candidateDetails under this patron
                const candidateDetailsRef = collection(db, "patronAddRequest", docSnap.id, "candidateDetails");
                const candidateSnapshot = await getDocs(candidateDetailsRef);

                // ✅ Store candidate details in temp cache
                const candidateDetailsList = candidateSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                tempCandidateCache[docSnap.id] = candidateDetailsList;

                // ✅ Calculate candidate count
                rowData.candidateCount = candidateSnapshot.size;

                // Normalize all resourceAllocatedTime values to JS Date (if present)
                const resourceTimes = candidateSnapshot.docs
                    .map(d => d.data().resourceAllocatedTime)
                    .filter(Boolean)
                    .map(ts => (ts?.toDate ? ts.toDate() : new Date(ts)));

                // Example condition: highlight if ANY resourceAllocatedTime is >= 12 hours ago
                const now = new Date();
                const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
                const isHighlight = resourceTimes.some(time => {
                    if (!(time instanceof Date) || isNaN(time)) return false;
                    return time >= twelveHoursAgo;
                });

                return {
                    ...rowData,
                    resourceAllocatedTimes: resourceTimes,
                    highlight: isHighlight,
                };
            }));

            // ✅ Filter out null entries (tasks with isCompleteDetails === false)
            const filteredRows = rowsData.filter(row => row !== null);

            setRows(filteredRows);
            // ✅ Update the candidate details cache with all fetched data
            setCandidateDetailsCache(tempCandidateCache);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setLoading(false);
    };

    const fetchCandidateDetails = async (rowId, row, forceRefresh = false) => {
        // ✅ Skip cache check if forceRefresh is true
        if (!forceRefresh && candidateDetailsCache[rowId]) return;

        setLoadingDetails(prev => ({ ...prev, [rowId]: true }));

        try {
            const candidateDetailsRef = collection(db, "patronAddRequest", rowId, "candidateDetails");
            const snapshot = await getDocs(candidateDetailsRef);
            const details = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setCandidateDetailsCache(prev => ({
                ...prev,
                [rowId]: details
            }));
        } catch (err) {
            console.error(`Error fetching candidate details for ${rowId}:`, err);
            setCandidateDetailsCache(prev => ({
                ...prev,
                [rowId]: []
            }));
        }

        setLoadingDetails(prev => ({ ...prev, [rowId]: false }));
    };

    const handleCellEdit = async (rowId, field, newValue) => {
        if (!newValue || newValue === rows.find(r => r.id === rowId)?.[field]) {
            setEditingCell(null);
            return;
        }

        try {
            const docRef = doc(db, "patronAddRequest", rowId);
            await updateDoc(docRef, { [field]: newValue });

            setRows(prevRows =>
                prevRows.map(row =>
                    row.id === rowId ? { ...row, [field]: newValue } : row
                )
            );

            triggerSnackbar(`${field} updated successfully!`, "success");
            setEditingCell(null);
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            triggerSnackbar(`Error updating ${field}`, "error");
        }
    };

    function ExpandableText({ text, maxLength = 100 }) {
        const [expanded, setExpanded] = useState(false);
        const displayText = expanded ? text : text.substring(0, maxLength) + (text.length > maxLength ? "..." : "");

        return (
            <div
                className="cursor-pointer text-gray-900 hover:text-blue-700 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {displayText}
            </div>
        );
    }

    useEffect(() => {
        const initializeDashboard = async () => {
            setLoading(true);
            await fetchCurrentUserDetails();
            await fetchAssociateUsers();
            setLoading(false);
        };
        initializeDashboard();
    }, []);

    useEffect(() => {
        if (currentUserDisplayName || isAdmin) {
            fetchData();
        }
    }, [currentUserDisplayName, isAdmin]);

    const columns = [
        { key: "patronName", label: "Patron Name", bold: true },
        { key: "primaryRole", label: "Primary Role", bold: true },

        { key: "createdAt", label: "Date", render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "" },
        { key: "clientCode", label: "Client Code" },
        {
            key: "patronCity",
            label: "City",
            render: (val, row) => {
                const cellKey = `${row.id}-patronCity`;
                const isEditing = editingCell === cellKey;

                return isEditing ? (
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellEdit(row.id, "patronCity", editValue)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCellEdit(row.id, "patronCity", editValue);
                            if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="border border-blue-500 rounded px-2 py-1 w-full text-sm"
                    />
                ) : (
                    <div
                        onClick={() => {
                            setEditingCell(cellKey);
                            setEditValue(val || "");
                        }}
                        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                    >
                        {val || "-"}
                    </div>
                );
            }
        },
        { key: "assignedLMName", label: "LM Name" },
        { key: "requestID", label: "Request ID" },
        { key: "taskDueDate", label: "Task Date", render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "" },
        {
            key: "salaryRange",
            label: "Salary",
            render: (val, row) => {
                const cellKey = `${row.id}-salaryRange`;
                const isEditing = editingCell === cellKey;

                return isEditing ? (
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellEdit(row.id, "salaryRange", editValue)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCellEdit(row.id, "salaryRange", editValue);
                            if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="border border-blue-500 rounded px-2 py-1 w-full text-sm"
                    />
                ) : (
                    <div
                        onClick={() => {
                            setEditingCell(cellKey);
                            setEditValue(val || "");
                        }}
                        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                    >
                        {val || "-"}
                    </div>
                );
            }
        },
        {
            key: "activateTask",
            label: "Activate Task",
            render: (_, row) => {
                const isPending = row.status === "Pending";
                const isCompleted = row.isCompleteDetails === true;

                if (isPending && isCompleted) {
                    return (
                        <button
                            onClick={() => handleActivateTask(row.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition"
                        >
                            Activate
                        </button>
                    );
                }
                // else if (isCompleted) {
                //     return (
                //         <span className=" bg-green-100 text-green-700 border-green-200 px-3 py-1 text-sm">Activated</span>
                //     );
                // }

                if (isPending && isCompleted) {
                    return (
                        <button
                            onClick={() => handleActivateTask(row.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition"
                        >
                            Activate
                        </button>
                    );
                }

                if (isPending && !isCompleted) {
                    return (
                        <span className="text-gray-500 px-3 py-1 text-sm rounded font-medium">
                            Pending
                        </span>
                    );
                }

                return (
                    <span className="bg-green-100 text-green-500 text-[12px] px-3 py-1 text-sm rounded font-medium">
                        Activated
                    </span>
                );
            },
        },
        { key: "status", label: "Status", render: (val) => <StatusBadge status={val || 'N/A'} /> },
        {
            key: "statusAction",
            label: "Status Action",
            render: (_, row, val) => {
                const options = ["Open", "On Hold", "Closed", "No Revert"];

                const candidateDetails = candidateDetailsCache[row.id] || [];
                const hasDeployedCandidate = candidateDetails.some(
                    candidate => candidate.candidateStatus === "Patron Approved"
                );

                if (row.status === "Patron Approved" ||
                    row.onHoldStatus === 'Patron Approved' ||
                    row.status === "Deployed" ||
                    row.onHoldStatus === 'Deployed' ||
                    hasDeployedCandidate) {
                    options.push("Deployed");
                }

                // Determine the current status action to display
                const currentStatusAction = row.lastStatusAction || "Select Action";

                return (
                    <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                        value={currentStatusAction}
                        onChange={(e) => {
                            if (e.target.value && e.target.value !== "Select Action") {
                                handleStatusChange(e.target.value, row);
                            }
                        }}
                    >
                        <option value="Select Action">Select Action</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            },
        },

        ...(isAdmin ? [{
            key: "assignedSupply",
            label: "Assigned Supply",
            render: (val, row) => {
                // ✅ Get the assignedSupplyName from the row data
                const assignedSupplyName = row.assignedSupplyName || "";

                return (
                    <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                        value={assignedSupplyName} // ✅ Use assignedSupplyName instead of val
                        onChange={(e) => handleAssignedSupplyChange(row, e.target.value)}
                    >
                        <option value="">Select Associate</option>
                        {associateUsers.map(associate => (
                            <option key={associate.id} value={associate.displayName}>
                                {associate.displayName}
                            </option>
                        ))}
                    </select>
                );
            },
        }] : []),
        {
            key: "relocate",
            label: "Allocate",
            render: (_, row) => {
                const isDisabled = row.status === "Deployed" || row.status === "Pending";

                return (
                    <button
                        onClick={() => !isDisabled && handleOpenRelocate(row)}
                        disabled={isDisabled}
                        className={`text-sm px-3 py-1 rounded transition ${isDisabled
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-400 text-white hover:bg-blue-700"
                            }`}
                    >
                        Allocate
                    </button>
                );
            },
        },
        {
            key: "replace",
            label: "Replace",
            render: (_, row) => {

                const candidateDetails = candidateDetailsCache[row.id] || [];
                const hasDeployedCandidate = candidateDetails.some(
                    c => c.candidateStatus === "Deployed"
                );
                // Only show if status is Deployed
                if (row.status !== "Deployed" && !hasDeployedCandidate) {
                    return (
                        <button
                            disabled
                            className="bg-gray-300 text-gray-500 px-3 py-1 rounded cursor-not-allowed text-sm"
                        >
                            Replace
                        </button>
                    );
                }

                // Check if within 6-month window and replacements available
                const deploymentDate = row.deployedTime?.toDate ? row.deployedTime.toDate() : null;
                const now = new Date();
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                const withinSixMonths = deploymentDate && deploymentDate >= sixMonthsAgo;
                const replacementCount = row.replacementCount || 0;
                const maxReplacements = row.maxReplacements || 3;
                const replacementsRemaining = maxReplacements - replacementCount;

                // Determine button state
                const canReplace = withinSixMonths && replacementsRemaining > 0;
                const isExpired = deploymentDate && !withinSixMonths;
                const replacementsExhausted = withinSixMonths && replacementsRemaining <= 0; // ✅ NEW

                // ✅ NEW: Handler for when replacements are exhausted
                const handleReplacementsExhausted = () => {
                    triggerSnackbar(
                        `All ${maxReplacements} replacements have been completed for this deployment.\n\n` +
                        `Replacements Used: ${replacementCount}/${maxReplacements}\n\n` +
                        `No more replacements are available `
                    );
                };

                return (
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => {
                                if (canReplace) {
                                    handleOpenReplace(row);
                                } else if (replacementsExhausted) {
                                    handleReplacementsExhausted(); // ✅ NEW
                                } else {
                                    handleReplaceExpired(row);
                                }
                            }}
                            className={`px-3 py-1 rounded text-sm font-medium ${canReplace
                                ? "bg-orange-600 text-white hover:bg-orange-700"
                                : replacementsExhausted // ✅ NEW
                                    ? "bg-red-600 text-white hover:bg-red-700"
                                    : "bg-yellow-600 text-white hover:bg-yellow-700"
                                }`}
                        >
                            {canReplace
                                ? `Replace`
                                : replacementsExhausted // ✅ NEW
                                    ? "Replacements Done"
                                    : "New Request"
                            }
                        </button>
                    </div>
                );
            },
        },
    ];

    const candidateBasicColumns = [
        { key: "candidateName", label: "Candidate Name" },
        { key: "candidateId", label: "Candidate ID" },
        { key: "candidateContact", label: "Contact" },
        
        {
            key: "candidateStatus",
            label: "Candidate Status",
            render: (val) => <StatusBadge status={val} />
        },
        { key: "candidateSource", label: "Source" },
        {
            key: "interviewScheduleTime",
            label: "LM Interview Time",
            render: (_, candidate) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Interview Schedule" || candidateStatus === "Interview Scheduled") {
                    const raw = candidate.interviewScheduleTime;
                    if (!raw) return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>N/A</span>;

                    const dateObj = raw.toDate ? raw.toDate() : new Date(raw);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString("en-US", { month: "long" });
                    const hours = dateObj.getHours();
                    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
                    const formatted = `${day} ${month}, ${hours}:${minutes}`;

                    return <span className="text-blue-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>{formatted}</span>;
                }

                if (candidateStatus === "Allocated" || candidateStatus === "Resource Allocated" || candidateStatus === "Replaced") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Not Yet</span>;
                }

                return <span className="text-green-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Interview Done</span>;
            }
        },
        {
            key: "scheduleOfficeTrialButton",
            label: "Office Trial Schedule",
            render: (_, candidate, row) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Office Trial Completed" ||
                    candidateStatus === "Office Trial Rejected" ||
                    candidateStatus === "Help Profile Created" ||
                    candidateStatus === "Trial Scheduled" ||
                    candidateStatus === "Patron Approved" ||
                    candidateStatus === "Patron Rejected") {
                    return (
                        <button
                            disabled
                            className="px-2 py-1 rounded text-[10px] font-semibold cursor-not-allowed"
                            style={{
                                backgroundColor: "#e3f2fd",
                                color: "#1565c0",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                border: 'none'
                            }}
                        >
                            Scheduled
                        </button>
                    );
                }

                if (candidateStatus === "Resource Rejected") {
                    return (
                        <button
                            disabled
                            className="px-2 py-1 rounded text-[10px] font-semibold cursor-not-allowed"
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                border: 'none'
                            }}
                        >
                            Rejected
                        </button>
                    );
                }

                if (candidateStatus === "Office Trial Scheduled") {
                    return (
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleOfficeTrialScheduleOpen(row, candidate)}
                            style={{
                                backgroundColor: "#1976d2",
                                color: "#fff",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                minWidth: 'auto',
                                textTransform: 'none'
                            }}
                        >
                            Edit Timing
                        </Button>
                    );
                }

                if (candidateStatus !== "Resource Approved") {
                    return (
                        <button
                            disabled
                            className="px-2 py-1 rounded text-[10px] cursor-not-allowed"
                            style={{
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                border: 'none'
                            }}
                        >
                            Schedule
                        </button>
                    );
                }



                return (
                    <button
                        onClick={() => handleOfficeTrialScheduleOpen(row, candidate)}
                        className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                        style={{
                            backgroundColor: "#f57c00",
                            color: "#fff",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            border: 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#e64a19"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "#f57c00"}
                    >
                        Schedule
                    </button>
                );
            },
        },
        {
            key: "officeTrialScheduleTime",
            label: "Office Trial Time",
            render: (_, candidate) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Office Trial Scheduled") {
                    const raw = candidate.officeTrialScheduledTime;
                    if (!raw) return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>N/A</span>;

                    const dateObj = raw.toDate ? raw.toDate() : new Date(raw);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString("en-US", { month: "long" });
                    const hours = dateObj.getHours();
                    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
                    const formatted = `${day} ${month}, ${hours}:${minutes}`;

                    return <span className="text-blue-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>{formatted}</span>;
                }

                if (candidateStatus === "Allocated" ||
                    candidateStatus === "Resource Allocated" ||
                    candidateStatus === "Resource Rejected" ||
                    candidateStatus === "Interview Scheduled" ||
                    candidateStatus === "Replaced" ||
                    candidateStatus === "Resource Approved") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Not Yet</span>;
                }

                return <span className="text-green-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Office Trial Done</span>;
            }
        },
        {
            key: "officeTrialButton",
            label: "Office Trial Remarks",
            render: (_, candidate, row) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Office Trial Completed" ||
                    candidateStatus === "Help Profile Created" ||
                    candidateStatus === "Trial Scheduled" ||
                    candidateStatus === "Patron Approved" ||
                    candidateStatus === "Deployed") {
                    return (
                        <button
                            disabled
                            className="px-2 py-1 rounded text-[10px] font-semibold cursor-not-allowed"
                            style={{
                                backgroundColor: "#e8f5e9",
                                color: "#2e7d32",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                border: 'none'
                            }}
                        >
                            Completed
                        </button>
                    );
                }

                if (candidateStatus === "Office Trial Rejected" ||
                    candidateStatus === "Patron Rejected") {
                    return (
                        <button
                            disabled
                            className="px-2 py-1 rounded text-[10px] font-semibold cursor-not-allowed"
                            style={{
                                backgroundColor: "#ffebee",
                                color: "#c62828",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                border: 'none'
                            }}
                        >
                            Rejected
                        </button>
                    );
                }

                if (candidateStatus !== "Office Trial Scheduled") {
                    return (
                        <button
                            disabled
                            className="px-2 py-1 rounded text-[10px] cursor-not-allowed"
                            style={{
                                backgroundColor: "#f5f5f5",
                                color: "#9e9e9e",
                                fontFamily: 'NeuzeitGro, sans-serif',
                                border: 'none'
                            }}
                        >
                            Office Trial
                        </button>
                    );
                }

                return (
                    <button
                        onClick={() => handleOfficeTrialOpen(row, candidate)}
                        className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                        style={{
                            backgroundColor: "#d84315",
                            color: "#fff",
                            fontFamily: 'NeuzeitGro, sans-serif',
                            border: 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#bf360c"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "#d84315"}
                    >
                        Office Trial
                    </button>
                );
            },
        },
        {
            key: "trialScheduleTime",
            label: "Patron Trial Time",
            render: (_, candidate) => {
                const candidateStatus = candidate.candidateStatus;

                if (candidateStatus === "Trial Scheduled") {
                    const raw = candidate.trialScheduleTime;
                    if (!raw) return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>N/A</span>;

                    const dateObj = raw.toDate ? raw.toDate() : new Date(raw);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleString("en-US", { month: "long" });
                    const hours = dateObj.getHours();
                    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
                    const formatted = `${day} ${month}, ${hours}:${minutes}`;

                    return <span className="text-blue-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>{formatted}</span>;
                }

                if (candidateStatus === "Allocated" ||
                    candidateStatus === "Resource Allocated" ||
                    candidateStatus === "Resource Rejected" ||
                    candidateStatus === "Replaced" ||
                    candidateStatus === "Interview Scheduled" ||
                    candidateStatus === "Resource Approved" ||
                    candidateStatus === "Office Trial Scheduled" ||
                    candidateStatus === "Office Trial Completed" ||
                    candidateStatus === "Office Trial Rejected" ||
                    candidateStatus === "Help Profile Created") {
                    return <span className="text-gray-500 text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Not Yet</span>;
                }

                return <span className="text-green-600 font-semibold text-[10px]" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>Trial Done</span>;
            }
        },
    ];


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

                <div className="text-gray-500 p-4 text-start bg-white rounded border">

                    {/* New Code line */}

                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">

                        {/* Header */}
                        <div className="mb-5 border-b pb-3">
                            <h2 className="text-sm font-semibold text-gray-800">
                                Task Details
                            </h2>
                        </div>

                        {/* Grid Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">

                            {/* Task ID */}
                            <div className="bg-gray-50 p-2 rounded-lg">
                                <p className="text-xs text-gray-500">Task ID</p>
                                <p className="text-xs font-small text-gray-800 mt-1">
                                    {row?.taskID || "N/A"}
                                </p>
                            </div>

                            {/* Ethnicity */}
                            <div className="bg-gray-50 p-2 rounded-lg">
                                <p className="text-xs text-gray-500">Ethnicity Preference</p>
                                <p className="text-xs font-medium text-gray-800 mt-1">
                                    {row?.ethnicityPreference || "N/A"}
                                </p>
                            </div>

                            {/* Gender */}
                            <div className="bg-gray-50 p-2 rounded-lg">
                                <p className="text-xs text-gray-500">Gender</p>
                                <p className="text-xs font-medium text-gray-800 mt-1">
                                    {row?.gender || "N/A"}
                                </p>
                            </div>

                            {/* Language */}
                            <div className="bg-gray-50 p-2 rounded-lg">
                                <p className="text-xs text-gray-500">Language</p>
                                <p className="text-xs font-medium text-gray-800 mt-1">
                                    {row?.language || "N/A"}
                                </p>
                            </div>

                        </div>

                        {/* Description Section (Highlight) */}
                        <div className="mt-5">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                                Task Description / Scope of Work
                            </p>

                            <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                                {row?.scopeOfWork || row?.taskDescription || "No description available"}
                            </div>
                        </div>

                    </div>

                    {/* new code line end */}

                    <div className="text-gray-800 p-4 text-center bg-white rounded border">
                        No candidate details found for this request
                    </div>
                </div>
            );
        }

        // Define which fields to display in the card
        const displayFields = [
            { key: 'candidateId', label: 'Candidate ID' },
            { key: 'candidateContact', label: 'Contact No.' },
            // { key: 'resourceAllocatedTime', label: 'Resource Allocated Time'  },
            {
    key: 'resourceAllocatedTime',
    label: 'Resource Allocated Time',
    render: (_, candidate) => {
        let raw = candidate.resourceAllocatedTime;

        if (!raw) {
            return (
                <span
                    className="text-gray-500 text-[10px]"
                    style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                >
                    N/A
                </span>
            );
        }

        try {
            // ✅ Handle array
            if (Array.isArray(raw)) {
                raw = raw[0];
            }

            let dateObj;

            // ✅ Firestore timestamp (seconds)
            if (raw?.seconds) {
                dateObj = new Date(raw.seconds * 1000);
            }
            // ✅ Firebase timestamp
            else if (raw?.toDate) {
                dateObj = raw.toDate();
            }
            // ✅ fallback
            else {
                dateObj = new Date(raw);
            }

            if (!dateObj || isNaN(dateObj)) {
                return (
                    <span className="text-gray-500 text-[10px]">
                        Invalid Date
                    </span>
                );
            }

            // ✅ Format: 07 Apr 2026, 10:30 AM
            const formatted = dateObj.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            return (
                <span
                    className="text-blue-600 font-semibold text-[10px]"
                    style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                >
                    {formatted}
                </span>
            );
        } catch (error) {
            console.error("Date render error:", error);
            return (
                <span className="text-red-500 text-[10px]">
                    Error
                </span>
            );
        }
    }
},
            {
                key: 'candidateStatus',
                label: 'Current Stage',
                render: (val) => <StatusBadge status={val || 'N/A'} />
            },
            { key: 'candidateSource', label: 'Source' },
            { key: 'currentLocation', label: 'Current Location', render: (val, candidate) => val || row.patronCity || 'N/A' },
            { key: 'employmentStatus', label: 'Employment Status', render: (val) => val || 'Unemployed' },
            { key: 'lmResourceRemarks', label: 'LM Remarks', render: (val) => val || 'Pending' },
            { key: 'trainingRemarks', label: 'Training Remarks', render: (val) => val || 'Pending' },
            { key: 'patronResourceRemarks', label: 'Patron Remarks', render: (val) => val || 'Pending' },
            { key: 'helpAboutSection', label: 'About' },

        ];

        // Define which action buttons to show
        // Action buttons with proper labels
        const actionButtons = candidateBasicColumns
            .filter(col =>
                col.key.includes('Button') || col.key.includes('Schedule') ||
                col.key === 'viewProfile' || col.key === 'fillForm' || col.key === 'contract'
            )
            .map(col => {
                // Extract clean label from column key
                let label = col.label || col.key;

                // Remove redundant words for cleaner display
                label = label.replace(/Button$/, '').replace(/Schedule\s+/i, '');

                return {
                    key: col.key,
                    label: label,
                    render: (val, candidate) => col.render(val, candidate, selectedRow || row.id)
                };
            });

        return (
            <div className="bg-gray-50 p-4 sm:p-6">
                {console.log("hello", row)}
                {/* New Code line */}

                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">

                    {/* Header */}
                    <div className="mb-5 border-b pb-3">
                        <h2 className="text-sm font-semibold text-gray-800">
                            Task Details
                        </h2>
                    </div>

                    {/* Grid Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                        {/* Task ID */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500">Task ID</p>
                            <p className="text-xs font-medium text-gray-800 mt-1">
                                {row?.taskID || "N/A"}
                            </p>
                        </div>

                        {/* Ethnicity */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500">Ethnicity Preference</p>
                            <p className="text-xs font-medium text-gray-800 mt-1">
                                {row?.ethnicityPreference || "N/A"}
                            </p>
                        </div>

                        {/* Gender */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500">Gender</p>
                            <p className="text-xs font-medium text-gray-800 mt-1">
                                {row?.gender || "N/A"}
                            </p>
                        </div>

                        {/* Language */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500">Language</p>
                            <p className="text-xs font-medium text-gray-800 mt-1">
                                {row?.language || "N/A"}
                            </p>
                        </div>

                    </div>

                    {/* Description Section (Highlight) */}
                    <div className="mt-6">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                            Task Description / Scope of Work
                        </p>

                        <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                            {row?.scopeOfWork || row?.taskDescription || "No description available"}
                        </div>
                    </div>

                </div>
                {/* new code line end */}



                {candidateDetails.map((candidate, candIdx) => (
                    <CandidateDetailCard
                        key={candidate.id || candIdx}
                        candidate={candidate}
                        patronData={row}
                        index={candIdx}
                        displayFields={displayFields}
                        actionButtons={actionButtons}
                        primaryRole={row?.primaryRole}
                    />
                ))}
            </div>
        );
    };
    const downloadCSV = async (dataToDownload) => {
        try {
            // Fetch all candidate details for all rows before generating CSV
            const rowsWithCandidates = await Promise.all(
                dataToDownload.map(async (record) => {
                    if (!candidateDetailsCache[record.id]) {
                        await fetchCandidateDetails(record.id, record);
                    }
                    return record;
                })
            );

            let csvContent = "Request Id,Created At,Client Code,Patron Name,Assigned LM,Location,Primary Role,Salary Range,Gender,Ethnicity Preference,Language,Task Status,Status Time,Total Candidates,Candidate Id,Resource Allocated Time,Candidate Source,Candidate Name,Candidate Contact,Candidate Status,Candidate Status Time,Is LM Approved,LM Remarks,LM Time,Profile Created,Profile Creation Time,Is Patron Approved,Patron Remarks,Patron Time,Supply Remarks Date,Supply Remarks,Deployed Remarks,Patron Address,Task Description\n";

            const formatCSVField = (field) => {
                if (field === null || field === undefined || field === '') return '""';
                let stringField = String(field);
                if (field?.toDate) {
                    const date = field.toDate();
                    stringField = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                } else if (field instanceof Date) {
                    stringField = `${field.getDate().toString().padStart(2, '0')}/${(field.getMonth() + 1).toString().padStart(2, '0')}/${field.getFullYear()}`;
                }
                return `"${stringField.replace(/"/g, '""')}"`;
            };

            const formatCSVFieldWithTime = (field) => {
                if (!field) return '""';
                try {
                    const date = field?.toDate ? field.toDate() : field;
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return `"${day}/${month}/${year} ${hours}:${minutes}"`;
                } catch (e) {
                    return '""';
                }
            };

            for (const record of dataToDownload) {
                const candidateDetails = candidateDetailsCache[record.id] || [];

                if (candidateDetails.length === 0) {
                    csvContent += formatCSVField(record.requestID) + "," +
                        formatCSVFieldWithTime(record.createdAt) + "," +
                        formatCSVField(record.clientCode) + "," +
                        formatCSVField(record.patronName) + "," +
                        formatCSVField(record.assignedLMName) + "," +
                        formatCSVField(record.location) + "," +
                        formatCSVField(record.primaryRole) + "," +
                        formatCSVField(record.salaryRange) + "," +
                        formatCSVField(record.gender) + "," +
                        formatCSVField(record.ethnicityPreference) + "," +
                        formatCSVField(record.language) + "," +
                        formatCSVField(record.status) + "," +
                        formatCSVFieldWithTime(record.dropdownStatusTime) + "," +
                        formatCSVField(record.candidateIdList?.length || 0) + "," +
                        '""' + "," + '""' + "," + '""' + "," + '""' + "," + '""' + "," +
                        '""' + "," + '""' + "," + '""' + "," + '""' + "," + '""' + "," +
                        '""' + "," + '""' + "," + '""' + "," + '""' + "," + '""' + "," +
                        formatCSVFieldWithTime(record.supplyRemarksDate) + "," +
                        formatCSVField(record.supplyRemarks) + "," +
                        formatCSVField(record.deployedRemarks) + "," +
                        formatCSVField(record.patronAddress) + "," +
                        formatCSVField(record.scopeOfWork) + "\n";
                } else {
                    for (const candidate of candidateDetails) {
                        csvContent += formatCSVField(record.requestID) + "," +
                            formatCSVFieldWithTime(record.createdAt) + "," +
                            formatCSVField(record.clientCode) + "," +
                            formatCSVField(record.patronName) + "," +
                            formatCSVField(record.assignedLMName) + "," +
                            formatCSVField(record.location) + "," +
                            formatCSVField(record.primaryRole) + "," +
                            formatCSVField(record.salaryRange) + "," +
                            formatCSVField(record.gender) + "," +
                            formatCSVField(record.ethnicityPreference) + "," +
                            formatCSVField(record.language) + "," +
                            formatCSVField(record.status) + "," +
                            formatCSVFieldWithTime(record.dropdownStatusTime) + "," +
                            formatCSVField(record.candidateIdList?.length || 0) + "," +
                            formatCSVField(candidate.candidateId) + "," +
                            formatCSVFieldWithTime(candidate.resourceAllocatedTime) + "," +
                            formatCSVField(candidate.candidateSource) + "," +
                            formatCSVField(candidate.candidateName) + "," +
                            formatCSVField(candidate.candidateContact) + "," +
                            formatCSVField(candidate.candidateStatus) + "," +
                            formatCSVFieldWithTime(candidate.candidateStatusTime) + "," +
                            formatCSVField(candidate.isLmApproved) + "," +
                            formatCSVField(candidate.lmResourceRemarks) + "," +
                            formatCSVFieldWithTime(candidate.lmApprovedTime) + "," +
                            formatCSVField(candidate.profileCreated) + "," +
                            formatCSVFieldWithTime(candidate.profileCreationTime) + "," +
                            formatCSVField(candidate.isPatronApproved) + "," +
                            formatCSVField(candidate.patronResourceRemarks) + "," +
                            formatCSVFieldWithTime(candidate.patronApprovedTime) + "," +
                            formatCSVFieldWithTime(record.supplyRemarksDate) + "," +
                            formatCSVField(record.supplyRemarks) + "," +
                            formatCSVField(record.deployedRemarks) + "," +
                            formatCSVField(record.patronAddress) + "," +
                            formatCSVField(record.scopeOfWork) + "\n";
                    }
                }
            }

            const now = new Date();
            const fileName = `SupplyTask_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours()}${now.getMinutes()}.csv`;

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();

            triggerSnackbar("CSV downloaded successfully!", "success");
        } catch (error) {
            console.error("Error downloading CSV:", error);
            triggerSnackbar("Error downloading CSV: " + error.message, "error");
        }
    };
    const handleOpenPricingSheet = () => {
        router.push('/pricingsheet');
    };



    return (
        <div>
            <Nav />
            <div className="p-3 sm:p-6">
                {/* Toggle between Associate and OTS */}
                <div className="flex gap-2 mb-4">
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-[#E8E8E8] bg-[#F36A23] text-white"
                    >
                        Associate
                    </Link>
                    <Link
                        href="/otsdash"
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-[#E8E8E8] bg-white text-[#F36A23]"
                    >
                        OTS
                    </Link>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-lg">Loading Dashboard...</p>
                    </div>
                ) : (

                    <ExcelTableTemplate
                        title="Demand Dashboard"
                        columns={columns}
                        data={rows}
                        defaultRowsPerPage={10}
                        enableRowClick={true}
                        showCandidateCount={true}
                        filters={[
                            { key: "assignedLMName", label: "LM-Name", defaultValue: urlFilterLM },
                            { key: "patronName", label: "Patron" },
                            { key: "patronCity", label: "City", defaultValue: urlFilterCity },
                            { key: "status", label: "Status", defaultValue: urlFilterStatus },
                            { key: "primaryRole", label: "Role", defaultValue: urlFilterRole }
                        ]}
                        onDrawerOpen={(rowId, row) => {
                            setOpenDrawerId(rowId); // ✅ Track which drawer is open
                            fetchCandidateDetails(rowId, row, false); // Normal fetch (use cache)
                        }}
                        expandedRow={openDrawerId} // ✅ Pass controlled state
                        onDrawerClose={() => setOpenDrawerId(null)} // ✅ Handle close
                        drawerContent={renderDrawerContent}
                        defaultOrderBy={{ field: "createdAt", direction: "desc" }}
                        // getRowClassName={getRowHighlightClass}  // ✅ ADD THIS
                        actionButton={{
                            label: "Download CSV",
                            onClick: downloadCSV,
                            icon: <Download className="w-5 h-5" />
                        }}
                        additionalButtons={[
                            {
                                label: "Pricing Sheet",
                                onClick: handleOpenPricingSheet,
                                icon: <User className="w-5 h-5 text-black" />,
                                color: "gray",

                            }
                        ]}
                    />
                )}
            </div>
            <RelocateModal
                open={relocateOpen}
                onClose={() => setRelocateOpen(false)}
                onConfirm={handleConfirmRelocate}
                primaryRole={selectedRow?.primaryRole}
            />
            {/* Old Remarks Modal for non-Deployed statuses */}
            <Modal open={remarksModalOpen} onClose={() => setRemarksModalOpen(false)}>
                <Box
                    className="relative top-1/2 left-1/2 bg-white p-4 sm:p-6 rounded-lg shadow-xl"
                    style={{
                        transform: "translate(-50%, -50%)",
                        width: "90%",
                        maxWidth: "400px",
                        fontFamily: 'NeuzeitGro, sans-serif'
                    }}
                >
                    <button
                        onClick={() => setRemarksModalOpen(false)}
                        className="absolute top-2 right-2 text-white bg-orange-600 hover:bg-orange-700 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold"
                    >
                        ✕
                    </button>

                    <h3 className="text-base sm:text-lg font-semibold mb-3 text-orange-600">
                        {selectedStatus} remarks
                    </h3>

                    <div className="mb-4">
                        <textarea
                            id="status-remarks-input"
                            className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                            rows="4"
                            placeholder="Enter your remarks..."
                        />
                    </div>

                    <button
                        onClick={() => {
                            const remarks = document.getElementById('status-remarks-input').value;
                            if (remarks.trim()) {
                                handleRemarksConfirm(remarks);
                                setRemarksModalOpen(false);
                            } else {
                                alert("Please enter remarks");
                            }
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded w-full transition text-sm sm:text-base"
                    >
                        [{selectedStatus}] - Confirm
                    </button>
                </Box>
            </Modal>

            {/* Candidate Selection Modal for Deployed */}
            <CandidateSelectionModal
                open={candidateSelectionModalOpen}
                onClose={() => setCandidateSelectionModalOpen(false)}
                onConfirm={handleRemarksConfirm}
                patronId={currentRow?.id}
                candidateDetailsCache={candidateDetailsCache}
            />
            <ReadOnlyScheduleModal
                open={viewScheduleModalOpen}
                onClose={() => setViewScheduleModalOpen(false)}
            />
            <ReplaceModal
                open={replaceOpen}
                onClose={() => setReplaceOpen(false)}
                onConfirm={handleConfirmReplace}
                primaryRole={selectedReplaceRow?.primaryRole}
                selectedRow={selectedReplaceRow}
                candidateDetailsCache={candidateDetailsCache}
            />

            {/* Office Trial Schedule Modal */}
            <Modal open={openOfficeTrialSchedule} onClose={handleOfficeTrialScheduleClose}>
                <Box
                    className="absolute top-1/2 left-1/2 bg-white rounded-lg shadow-xl"
                    style={{
                        transform: "translate(-50%, -50%)",
                        width: "90%",
                        maxWidth: "450px",
                    }}
                >
                    <div className="p-5 border-b flex justify-between items-center">
                        <h3 className="text-lg font-bold text-orange-700">Schedule Office Trial</h3>
                        <button
                            onClick={handleOfficeTrialScheduleClose}
                            className="text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full p-1 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-5">
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2 text-sm">
                                Select Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                value={officeTrialDate}
                                onChange={(e) => setOfficeTrialDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2 text-sm">
                                Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                value={officeTrialTime}
                                onChange={(e) => setOfficeTrialTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-5 border-t bg-gray-50 flex gap-3">
                        <button
                            onClick={handleOfficeTrialScheduleClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleOfficeTrialScheduleSubmit}
                            className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition"
                        >
                            Schedule
                        </button>
                    </div>
                </Box>
            </Modal>

            {/* Office Trial Execution Dialog */}
            <Dialog
                open={openOfficeTrial}
                onClose={handleOfficeTrialClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    style: {
                        maxHeight: '90vh',
                        borderRadius: '12px'
                    }
                }}
            >
                <DialogTitle sx={{ backgroundColor: '#fff', borderBottom: '1px solid #eee', pb: 1 }}>
                    <Typography sx={{ color: '#ff5722', fontWeight: 'bold' }}>
                        Office Trial - {officeTrialMode} Mode
                    </Typography>
                </DialogTitle>

                <DialogContent style={{ paddingTop: "24px", backgroundColor: '#f9f9f9' }}>

                    {/* Mode Toggle Buttons */}
                    <div style={{
                        display: "flex",
                        justifyContent: 'flex-start',
                        gap: "12px",
                        marginBottom: "24px"
                    }}>
                        <Button
                            variant={officeTrialMode === "Offline" ? "contained" : "outlined"}
                            onClick={() => setOfficeTrialMode("Offline")}
                            sx={{
                                backgroundColor: officeTrialMode === "Offline" ? "#ff5722" : "#fff",
                                color: officeTrialMode === "Offline" ? "#fff" : "#ff5722",
                                borderColor: "#ff5722",
                                fontWeight: "bold",
                                borderRadius: '20px',
                                px: 3,
                                '&:hover': {
                                    backgroundColor: officeTrialMode === "Offline" ? "#e64a19" : "#fff3e0",
                                    borderColor: "#ff5722"
                                }
                            }}
                        >
                            OFFLINE MODE
                        </Button>
                        <Button
                            variant={officeTrialMode === "Online" ? "contained" : "outlined"}
                            onClick={() => setOfficeTrialMode("Online")}
                            sx={{
                                backgroundColor: officeTrialMode === "Online" ? "#ff5722" : "#fff",
                                color: officeTrialMode === "Online" ? "#fff" : "#ff5722",
                                borderColor: "#ff5722",
                                fontWeight: "bold",
                                borderRadius: '20px',
                                px: 3,
                                '&:hover': {
                                    backgroundColor: officeTrialMode === "Online" ? "#e64a19" : "#fff3e0",
                                    borderColor: "#ff5722"
                                }
                            }}
                        >
                            ONLINE MODE
                        </Button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {/* Trial Evaluation Form */}
                        {selectedCandidate && (
                            <TrialEvaluationForm
                                role={rows.find(r => r.id === selectedRow)?.primaryRole || "Housekeeper"}
                                formData={officeTrialEvaluation}
                                setFormData={setOfficeTrialEvaluation}
                                showGrillingQuestions={officeTrialMode === "Online"}
                                candidateName={selectedCandidate?.candidateName}
                                evaluatorName={currentUserDisplayName}
                            />
                        )}

                        {/* File Upload Area */}
                        <div style={{
                            padding: "16px",
                            border: "2px dashed #ffb74d",
                            borderRadius: "8px",
                            backgroundColor: "#fff8e1",
                            textAlign: 'center'
                        }}>
                            <label htmlFor="upload-trial-files" style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#e65100", cursor: 'pointer' }}>
                                📤 Upload Trial Evidence (Images, Videos, Documents)
                            </label>
                            <input
                                id="upload-trial-files"
                                type="file"
                                multiple
                                accept="image/*,video/*,.pdf,.doc,.docx"
                                onChange={(e) => setOfficeTrialExecutionFiles(Array.from(e.target.files))}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    marginTop: '10px',
                                    padding: "8px",
                                    color: '#555'
                                }}
                            />
                            {officeTrialExecutionFiles.length > 0 && (
                                <div style={{ marginTop: "12px", fontSize: "13px", color: "#4caf50", fontWeight: 'bold' }}>
                                    ✅ {officeTrialExecutionFiles.length} file(s) selected
                                </div>
                            )}
                        </div>


                    </div>
                </DialogContent>

                <DialogActions style={{ justifyContent: "center", padding: "20px", gap: "16px", backgroundColor: '#fff', borderTop: '1px solid #eee' }}>
                    <Button
                        onClick={handleOfficeTrialClose}
                        variant="outlined"
                        sx={{ color: "#757575", borderColor: "#bdbdbd", width: "120px" }}
                    >
                        CANCEL
                    </Button>
                    <Button
                        onClick={handleOfficeTrialApprove}
                        variant="contained"
                        sx={{ backgroundColor: "#4caf50", color: "#fff", width: "140px", '&:hover': { backgroundColor: "#388e3c" } }}
                    >
                        APPROVE
                    </Button>
                    <Button
                        onClick={handleOfficeTrialReject}
                        variant="contained"
                        sx={{ backgroundColor: "#f44336", color: "#fff", width: "140px", '&:hover': { backgroundColor: "#d32f2f" } }}
                    >
                        REJECT
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar />
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading tasks...</div>}>
            <Dashboard />
        </Suspense>
    );
}