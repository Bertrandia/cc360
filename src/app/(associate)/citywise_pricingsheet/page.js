'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    Timestamp
} from "firebase/firestore";
import { app } from "../../firebase/config";
import ExcelTableTemplate from "../../components/ExcelTableTemplate";
import Snackbar, { triggerSnackbar } from "../../components/snakbar";
import Nav from "../../components/navbar";

const db = getFirestore(app);

export default function PricingSheet() {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch main data ONLY (fast initial load)
    const fetchData = async () => {
        setLoading(true);
        try {
            const collRef = collection(db, "pricingSheetCityWise");
            const snapshot = await getDocs(collRef);
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setRows(data);
        } catch (err) {
            console.error("Error fetching data:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Main table columns

    const columns = [
        { key: "city", label: "City" },
        { key: "role", label: "Role" },
        { key: "hours", label: "Hours" },
        { key: "1-2yrs", label: "1-2 years" },
        { key: "3-6yrs", label: "3-6 years" },
        { key: "7-10yrs", label: "7-10 years" },
        { key: "10+yrs", label: "10+ years" },
    ];

    const backButton = () => {
        router.back();
    };
    return (
        <div className="min-h-screen bg-gray-50">
            <Nav />
            <div className="p-3 sm:p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-lg">Loading Pricing Sheet...</p>
                    </div>
                ) : (
                    <ExcelTableTemplate
                        title="Pricing Sheet"
                        columns={columns}
                        data={rows}
                        defaultRowsPerPage={20}
                        filters={[{ key: "city", label: "City" },
                        { key: "role", label: "Role" },
                        { key: "hours", label: "Hours" }]}
                    />
                )
                }
            </div>
            <Snackbar />
        </div>
    );
}


