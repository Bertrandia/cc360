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
            const collRef = collection(db, "pricingSheet");
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
        { key: "cxType", label: "CX Type" },
        { key: "fullDayPricing", label: "Full Day" },
        { key: "fullDayPricing_24", label: "Full Day 24 hour" },
        { key: "nightSurcharge", label: "Night Surcharge" },
        { key: "perDayPricing", label: "Per Day Pricing" },
        { key: "perHourPrice", label: "Per Hour Price" },
        { key: "role", label: "Role" },
        { key: "roleCXType", label: "Role CX Type" },
        { key: "stepDownPrice", label: "Step Down Price" },
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
                        filters={[{ key: "role", label: "Role" }, { key: "cxType", label: "CX Type" }]}

                    />
                )
                }
            </div>
            <Snackbar />
        </div>
    );
}


