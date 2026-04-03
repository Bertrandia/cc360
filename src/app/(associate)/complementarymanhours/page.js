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
import { useRouter } from "next/navigation";
import ExcelTableTemplate from "../../components/ExcelTableTemplate";
import { triggerSnackbar } from "../../components/snakbar";
import Snackbar from "../../components/snakbar";
import Nav from "../../components/navbar";
import RegisterAssociatePopup from "../../components/RegisterPopup";
import { UserPlus } from "lucide-react";
import { NormalCandidateCards, StatusBadge } from "../../components/expandabledrawer";
import { useAuth } from "../../context/AuthContext";


const db = getFirestore();

export default function CandidateDashboard() {
    const { user, userData } = useAuth();
    const router = useRouter();

    // ✅ ADD THIS - Email-based access control
    useEffect(() => {
        if (!user) return;

        if (user.email !== "naman@thepinchlife.com") {
            router.push("/dashboard"); // Redirect to another page
            triggerSnackbar("Access denied. This page is restricted.", "error");
        }
    }, [user, router]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [candidateDetailsCache, setCandidateDetailsCache] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});
    const [openDrawerId, setOpenDrawerId] = useState(null);
    const [editingRowId, setEditingRowId] = useState(null);
    const [editData, setEditData] = useState({});

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCandidate, setEditingCandidate] = useState(null);
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);


    // Fetch main data ONLY (fast initial load)
    const fetchData = async () => {
        setLoading(true);
        try {
            const collRef = collection(db, "addPatronDetails");
            const snapshot = await getDocs(collRef);
            const data = snapshot.docs.map((doc, index) => ({
                ...doc.data(),

                // 🔑 FORCE UNIQUE ROW ID FOR UI ONLY
                id: `${doc.id}-${index}`,   // unique, stable per render
                firestoreId: doc.id,
            }))
                .filter(row =>
                    row.patronBusinessID !== undefined &&
                    row.patronBusinessID !== null &&
                    String(row.patronBusinessID).trim() !== ""
                );

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



    // Main table columns (displayed in the main table)
    const columns = [
        {
            key: "edit",
            label: "Edit",
            render: (_, row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleToggleEdit(row.id)}
                        className={`px-2 py-1 rounded text-sm font-medium ${editingRowId === row.id
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "text-white hover:bg-blue-400"
                            }`}
                    >
                        {editingRowId === row.id ? "💾 Save" : "✏️"}
                    </button>
                    {editingRowId === row.id && (
                        <button
                            onClick={() => handleCancelEdit()}
                            className="px-2 py-1 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                        >
                            ✕
                        </button>
                    )}
                </div>
            ),
        },
        { key: "patronName", label: "Name", bold: true },
        { key: "patronBusinessID", label: "Client Code", bold: true },
        {
            key: "dlQuarterStartDate",
            label: "Deep Cleaning Date",
            editable: true,
            type: "date",
            render: (val, row) => {
                if (editingRowId === row.id) {
                    return (
                        <input
                            type="date"
                            value={editData.dlQuarterStartDate || ""}
                            onChange={(e) => handleEditChange("dlQuarterStartDate", e.target.value)}
                            className="border border-blue-400 rounded px-2 py-1 w-full bg-blue-50 focus:ring-2 focus:ring-blue-500"
                        />
                    );
                }
                return val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "";
            }
        },
        {
            key: "patronDeepCleaningHoursLeft",
            label: "Deep Cleaning Hours",
            editable: true,
            type: "number",
            render: (val, row) => {
                if (editingRowId === row.id) {
                    return (
                        <input
                            type="number"
                            min="0"
                            value={editData.patronDeepCleaningHoursLeft || ""}
                            onChange={(e) => handleEditChange("patronDeepCleaningHoursLeft", e.target.value)}
                            className="border border-blue-400 rounded px-2 py-1 w-24 bg-blue-50 focus:ring-2 focus:ring-blue-500"
                        />
                    );
                }
                return val;
            }
        },
        {
            key: "wardrobeStartDate",
            label: "Wardrobe Date",
            editable: true,
            type: "date",
            render: (val, row) => {
                if (editingRowId === row.id) {
                    return (
                        <input
                            type="date"
                            value={editData.wardrobeStartDate || ""}
                            onChange={(e) => handleEditChange("wardrobeStartDate", e.target.value)}
                            className="border border-blue-400 rounded px-2 py-1 w-full bg-blue-50 focus:ring-2 focus:ring-blue-500"
                        />
                    );
                }
                return val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "";
            }
        },
        {
            key: "patronWardrobeHoursLeft",
            label: "Wardrobe Hours",
            editable: true,
            type: "number",
            render: (val, row) => {
                if (editingRowId === row.id) {
                    return (
                        <input
                            type="number"
                            min="0"
                            value={editData.patronWardrobeHoursLeft || ""}
                            onChange={(e) => handleEditChange("patronWardrobeHoursLeft", e.target.value)}
                            className="border border-blue-400 rounded px-2 py-1 w-24 bg-blue-50 focus:ring-2 focus:ring-blue-500"
                        />
                    );
                }
                return val;
            }
        },
        {
            key: "mstStartDate",
            label: "MST Date",
            editable: true,
            type: "date",
            render: (val, row) => {
                if (editingRowId === row.id) {
                    return (
                        <input
                            type="date"
                            value={editData.mstStartDate || ""}
                            onChange={(e) => handleEditChange("mstStartDate", e.target.value)}
                            className="border border-blue-400 rounded px-2 py-1 w-full bg-blue-50 focus:ring-2 focus:ring-blue-500"
                        />
                    );
                }
                return val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : "";
            }
        },
        {
            key: "patronMstHoursLeft",
            label: "MST Hours",
            editable: true,
            type: "number",
            render: (val, row) => {
                if (editingRowId === row.id) {
                    return (
                        <input
                            type="number"
                            min="0"
                            value={editData.patronMstHoursLeft || ""}
                            onChange={(e) => handleEditChange("patronMstHoursLeft", e.target.value)}
                            className="border border-blue-400 rounded px-2 py-1 w-24 bg-blue-50 focus:ring-2 focus:ring-blue-500"
                        />
                    );
                }
                return val;
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
            { key: "assignedLM", label: "Assigned LM" },
            { key: "city", label: "City" },
            { key: "mobile_number1", label: "Mobile Number" },
            { key: "gender", label: "Gender" },
            { key: "occupation", label: "Occupation" },
            {
                key: "dob",
                label: "Date of Birth",
                render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : ""
            },
            { key: "gender", label: "Gender" },
            {
                key: "createdAt",
                label: "Created At",
                render: (val) => val ? new Date(val.toDate ? val.toDate() : val).toLocaleDateString("en-GB") : ""
            },

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

    // ✅ ADD THESE HANDLER FUNCTIONS
    const handleToggleEdit = async (rowId) => {
        if (editingRowId === rowId) {
            // Save changes
            await handleSaveEdit(rowId);
        } else {
            // Start editing
            const row = rows.find(r => r.id === rowId);
            setEditingRowId(rowId);
            setEditData({
                dlQuarterStartDate: row.dlQuarterStartDate ?
                    new Date(row.dlQuarterStartDate.toDate ? row.dlQuarterStartDate.toDate() : row.dlQuarterStartDate)
                        .toISOString().split('T')[0] : "",
                patronDeepCleaningHoursLeft: row.patronDeepCleaningHoursLeft || "",
                wardrobeStartDate: row.wardrobeStartDate ?
                    new Date(row.wardrobeStartDate.toDate ? row.wardrobeStartDate.toDate() : row.wardrobeStartDate)
                        .toISOString().split('T')[0] : "",
                patronWardrobeHoursLeft: row.patronWardrobeHoursLeft || "",
                mstStartDate: row.mstStartDate ?
                    new Date(row.mstStartDate.toDate ? row.mstStartDate.toDate() : row.mstStartDate)
                        .toISOString().split('T')[0] : "",
                patronMstHoursLeft: row.patronMstHoursLeft || "",
            });
        }
    };

    const handleEditChange = (field, value) => {
        setEditData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCancelEdit = () => {
        setEditingRowId(null);
        setEditData({});
    };

    const handleSaveEdit = async (rowId) => {
        try {
            const row = rows.find(r => r.id === rowId);
            if (!row) return;

            const updateData = {};

            // ✅ ADD VALIDATION
            // Validate number fields
            const hourFields = [
                { key: 'patronDeepCleaningHoursLeft', label: 'Deep Cleaning Hours' },
                { key: 'patronWardrobeHoursLeft', label: 'Wardrobe Hours' },
                { key: 'patronMstHoursLeft', label: 'MST Hours' }
            ];

            for (const field of hourFields) {
                if (editData[field.key] !== "" && editData[field.key] !== undefined) {
                    const value = Number(editData[field.key]);
                    if (isNaN(value)) {
                        triggerSnackbar(`${field.label} must be a valid number`, "error");
                        return;
                    }
                    if (value < 0) {
                        triggerSnackbar(`${field.label} cannot be negative`, "error");
                        return;
                    }
                }
            }

            // Validate date fields
            const dateFields = [
                { key: 'dlQuarterStartDate', label: 'Deep Cleaning Date' },
                { key: 'wardrobeStartDate', label: 'Wardrobe Date' },
                { key: 'mstStartDate', label: 'MST Date' }
            ];

            for (const field of dateFields) {
                if (editData[field.key]) {
                    const date = new Date(editData[field.key]);
                    if (isNaN(date.getTime())) {
                        triggerSnackbar(`${field.label} must be a valid date`, "error");
                        return;
                    }
                }
            }

            // Convert dates to Firestore timestamps
            if (editData.dlQuarterStartDate) {
                updateData.dlQuarterStartDate = new Date(editData.dlQuarterStartDate);
            }
            if (editData.wardrobeStartDate) {
                updateData.wardrobeStartDate = new Date(editData.wardrobeStartDate);
            }
            if (editData.mstStartDate) {
                updateData.mstStartDate = new Date(editData.mstStartDate);
            }

            // Convert numbers
            if (editData.patronDeepCleaningHoursLeft !== "") {
                updateData.patronDeepCleaningHoursLeft = Number(editData.patronDeepCleaningHoursLeft);
            }
            if (editData.patronWardrobeHoursLeft !== "") {
                updateData.patronWardrobeHoursLeft = Number(editData.patronWardrobeHoursLeft);
            }
            if (editData.patronMstHoursLeft !== "") {
                updateData.patronMstHoursLeft = Number(editData.patronMstHoursLeft);
            }

            const docRef = doc(db, "addPatronDetails", row.firestoreId);
            await updateDoc(docRef, updateData);

            // Update local state
            setRows(prevRows =>
                prevRows.map(r =>
                    r.id === rowId
                        ? { ...r, ...updateData }
                        : r
                )
            );

            setEditingRowId(null);
            setEditData({});
            triggerSnackbar("Updated successfully!", "success");
        } catch (error) {
            console.error("Error updating:", error);
            triggerSnackbar("Error updating: " + error.message, "error");
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
                            <p className="text-lg text-gray-600">Loading Complemantry Manhours...</p>
                        </div>
                    </div>
                ) : (
                    <ExcelTableTemplate
                        title="Complementary Manhours"
                        columns={columns}
                        data={rows}
                        defaultRowsPerPage={10}
                        enableRowClick={true}
                        showCandidateCount={false}
                        filters={[
                            { key: "patronName", label: "Name" },
                            { key: 'occupation', label: 'Occupation' },
                            { key: "city", label: "City" },
                        ]}
                        showDateFilter={true}  // ✅ Enable date filter
                        dateFilterKey="createdAt"
                        onDrawerOpen={(rowId, row) => {
                            setOpenDrawerId(rowId);
                            fetchCandidateDetails(rowId, row);
                        }}
                        drawerContent={renderDrawerContent}
                        expandedRow={openDrawerId}
                        onDrawerClose={() => setOpenDrawerId(null)}
                    />
                )}
            </div>
            <Snackbar />
        </div>
    );
}
