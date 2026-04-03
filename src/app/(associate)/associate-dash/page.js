'use client';
import { useEffect, useState, useMemo } from "react";
import {
    getFirestore,
    collection,
    getDocs,
} from "firebase/firestore";
import { app } from "../../firebase/config";
import Nav from "../../components/navbar";
import { useRouter } from "next/navigation";

const db = getFirestore(app);

export default function AnalyticsDashboard() {
    const router = useRouter();
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [filterLM, setFilterLM] = useState("All");
    const [filterClientCode, setFilterClientCode] = useState("All");
    const [filterCity, setFilterCity] = useState("All");
    const [filterMonth, setFilterMonth] = useState("All");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");

    // Status columns to display
    // const statusColumns = [
    //     "Pending",
    //     "LM Interview",
    //     "Profile Creation",
    //     "On-Trial",
    //     "Patron Approved",
    //     "Deployed",
    //     "Rejected Request",
    //     "No Revert",
    //     "On Hold",
    //     "Service Closed",
    //     "Candidate not reverting"
    // ];

    const statusColumns = [
        "Pending",
        "Resource Allocated",
        "Interview Scheduled",
        "Resource Approved",
        "Resource Rejected",
        "Office Trial Scheduled",
        "Office Trial Completed",
        "Office Trial Rejected",
        "Help Profile Created",
        "Trial Scheduled",
        "Patron Approved",
        "Deployed",
        "Closed",
        "On-Trial",
        "No Revert",
        "On Hold",
        "Candidate not reverting",

    ];

    // Fetch all data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, "patronAddRequest"));
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllData(data);
            } catch (err) {
                console.error("Error fetching data:", err);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // Get unique values for filters
    const uniqueLMs = useMemo(() =>
        ["All", ...new Set(allData.map(d => d.assignedLMName).filter(Boolean))],
        [allData]
    );

    const uniqueClientCodes = useMemo(() =>
        ["All", ...new Set(allData.map(d => d.clientCode).filter(Boolean))],
        [allData]
    );

    const uniqueCities = useMemo(() =>
        ["All", ...new Set(allData.map(d => d.patronCity).filter(Boolean))],
        [allData]
    );

    const months = [
        "All", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Filter data
    const filteredData = useMemo(() => {
        return allData.filter(row => {
            // LM Filter
            if (filterLM !== "All" && row.assignedLMName !== filterLM) return false;

            // Client Code Filter
            if (filterClientCode !== "All" && row.clientCode !== filterClientCode) return false;

            // City Filter
            if (filterCity !== "All" && row.patronCity !== filterCity) return false;

            // Date Filter
            if (row.createdAt) {
                const rowDate = row.createdAt.toDate ? row.createdAt.toDate() : new Date(row.createdAt);

                // Month Filter
                if (filterMonth !== "All") {
                    const monthIndex = months.indexOf(filterMonth) - 1;
                    if (rowDate.getMonth() !== monthIndex) return false;
                }

                // Date From Filter
                if (filterDateFrom) {
                    const fromDate = new Date(filterDateFrom);
                    if (rowDate < fromDate) return false;
                }

                // Date To Filter
                if (filterDateTo) {
                    const toDate = new Date(filterDateTo);
                    toDate.setHours(23, 59, 59);
                    if (rowDate > toDate) return false;
                }
            }

            return true;
        });
    }, [allData, filterLM, filterClientCode, filterCity, filterMonth, filterDateFrom, filterDateTo]);

    // Group data by primary role and status
    const analyticsData = useMemo(() => {
        const roleStatusMap = {};

        filteredData.forEach(row => {
            const role = row.primaryRole || "NA";
            const status = row.status || "NA";

            if (!roleStatusMap[role]) {
                roleStatusMap[role] = {};
                statusColumns.forEach(s => roleStatusMap[role][s] = 0);
                roleStatusMap[role].total = 0;
            }

            if (statusColumns.includes(status)) {
                roleStatusMap[role][status]++;
                roleStatusMap[role].total++;
            }
        });

        return roleStatusMap;
    }, [filteredData]);

    // Calculate column totals
    const columnTotals = useMemo(() => {
        const totals = {};
        statusColumns.forEach(status => {
            totals[status] = Object.values(analyticsData).reduce((sum, role) => sum + (role[status] || 0), 0);
        });
        totals.total = Object.values(totals).reduce((sum, val) => sum + val, 0);
        return totals;
    }, [analyticsData]);

    // Navigation function to dashboard with filters
    const navigateToDashboard = (role = null, status = null) => {
        const params = new URLSearchParams();

        if (role && role !== "Total Request") {
            params.append("role", role);
        }

        if (status) {
            params.append("status", status);
        }

        // Add current filters to maintain context
        if (filterLM !== "All") params.append("lm", filterLM);
        if (filterClientCode !== "All") params.append("clientCode", filterClientCode);
        if (filterCity !== "All") params.append("city", filterCity);
        if (filterDateFrom) params.append("dateFrom", filterDateFrom);
        if (filterDateTo) params.append("dateTo", filterDateTo);

        router.push(`/dashboard?${params.toString()}`);
    };

    // Download CSV
    const downloadCSV = () => {
        try {
            let csvContent = "Primary Role," + statusColumns.join(",") + ",Total Request\n";

            // Add data rows
            Object.entries(analyticsData).forEach(([role, counts]) => {
                const row = [
                    `"${role}"`,
                    ...statusColumns.map(status => counts[status] || 0),
                    counts.total
                ].join(",");
                csvContent += row + "\n";
            });

            // Add total row
            const totalRow = [
                '"Total Request"',
                ...statusColumns.map(status => columnTotals[status] || 0),
                columnTotals.total
            ].join(",");
            csvContent += totalRow;

            // Create download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Analytics_Dashboard_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading CSV:", error);
            alert("Error downloading CSV");
        }
    };

    const handleRefresh = () => {
        setFilterLM("All");
        setFilterClientCode("All");
        setFilterCity("All");
        setFilterMonth("All");
        setFilterDateFrom("");
        setFilterDateTo("");
    };

    return (
        <div>
            <Nav />
            <div className="p-4 sm:p-6" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                <h2 className="text-xl sm:text-2xl font-bold mb-4" >Analytics Dashboard</h2>

                {/* Filters */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                        {/* LM Email */}
                        <div>
                            <label className="block text-xs font-medium mb-1">LM Name</label>
                            <select
                                value={filterLM}
                                onChange={(e) => setFilterLM(e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                {uniqueLMs.map(lm => (
                                    <option key={lm} value={lm}>{lm}</option>
                                ))}
                            </select>
                        </div>

                        {/* Client Code */}
                        <div>
                            <label className="block text-xs font-medium mb-1">Client Code</label>
                            <select
                                value={filterClientCode}
                                onChange={(e) => setFilterClientCode(e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                {uniqueClientCodes.map(code => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-xs font-medium mb-1">City</label>
                            <select
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                {uniqueCities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-xs font-medium mb-1">From</label>
                            <input
                                type="date"
                                value={filterDateFrom}
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-xs font-medium mb-1">To</label>
                            <input
                                type="date"
                                value={filterDateTo}
                                onChange={(e) => setFilterDateTo(e.target.value)}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    {/* Refresh and Download Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                            <span>📥</span>
                            <span className="hidden sm:inline">Download CSV</span>
                        </button>
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                            <span>🔄</span>
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-64" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                        <p className="text-lg">Loading Associate dashboard...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto border rounded-lg bg-white shadow" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                        <div className="inline-block min-w-full">
                            <table className="min-w-full border-collapse text-xs sm:text-sm">
                                <thead className="bg-orange-50 sticky top-0">
                                    <tr>
                                        <th className="border px-2 sm:px-4 py-2 text-left font-semibold text-orange-800 whitespace-nowrap">
                                            Primary Role
                                        </th>
                                        {statusColumns.map(status => (
                                            <th key={status} className="border px-2 sm:px-3 py-2 text-center font-semibold text-orange-800 whitespace-nowrap">
                                                {status}
                                            </th>
                                        ))}
                                        <th className="border px-2 sm:px-4 py-2 text-center font-semibold text-orange-800 whitespace-nowrap bg-orange-100">
                                            Total Request
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(analyticsData).length === 0 ? (
                                        <tr>
                                            <td colSpan={statusColumns.length + 2} className="border px-4 py-8 text-center text-gray-500">
                                                No data available for the selected filters
                                            </td>
                                        </tr>
                                    ) : (
                                        Object.entries(analyticsData).map(([role, counts]) => (
                                            <tr key={role} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50">
                                                <td className="border px-2 sm:px-4 py-2 font-bold text-black whitespace-nowrap">
                                                    {role}
                                                </td>
                                                {statusColumns.map(status => (
                                                    <td
                                                        key={status}
                                                        className="border px-2 sm:px-3 py-2 text-center text-gray-700 cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                                        onClick={() => {
                                                            const count = counts[status] || 0;
                                                            if (count > 0) {
                                                                navigateToDashboard(role, status);
                                                            }
                                                        }}
                                                        title={`Click to view ${counts[status] || 0} task(s)`}
                                                    >
                                                        <span className={`${(counts[status] || 0) > 0 ? 'font-semibold underline decoration-dotted' : ''}`}>
                                                            {counts[status] || 0}
                                                        </span>
                                                    </td>
                                                ))}
                                                <td
                                                    className="border px-2 sm:px-4 py-2 text-center font-semibold text-gray-900 bg-orange-50 cursor-pointer hover:bg-orange-200 transition-colors"
                                                    onClick={() => {
                                                        if (counts.total > 0) {
                                                            navigateToDashboard(role, null);
                                                        }
                                                    }}
                                                    title={`Click to view all ${counts.total} task(s) for ${role}`}
                                                >
                                                    <span className="underline decoration-dotted">
                                                        {counts.total}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}

                                    {/* Total Row - Clickable */}
                                    {Object.keys(analyticsData).length > 0 && (
                                        <tr className="bg-orange-100 font-semibold">
                                            <td className="border px-2 sm:px-4 py-2 text-gray-900 whitespace-nowrap">
                                                Total Request
                                            </td>
                                            {statusColumns.map(status => (
                                                <td
                                                    key={status}
                                                    className="border px-2 sm:px-3 py-2 text-center text-gray-900 cursor-pointer hover:bg-blue-200 transition-colors"
                                                    onClick={() => {
                                                        const count = columnTotals[status] || 0;
                                                        if (count > 0) {
                                                            navigateToDashboard(null, status);
                                                        }
                                                    }}
                                                    title={`Click to view all ${columnTotals[status] || 0} task(s) with status ${status}`}
                                                >
                                                    <span className="underline decoration-dotted">
                                                        {columnTotals[status] || 0}
                                                    </span>
                                                </td>
                                            ))}
                                            <td
                                                className="border px-2 sm:px-4 py-2 text-center text-gray-900 bg-orange-200 cursor-pointer hover:bg-orange-300 transition-colors"
                                                onClick={() => {
                                                    if (columnTotals.total > 0) {
                                                        navigateToDashboard(null, null);
                                                    }
                                                }}
                                                title={`Click to view all ${columnTotals.total} task(s)`}
                                            >
                                                <span className="underline decoration-dotted">
                                                    {columnTotals.total}
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}