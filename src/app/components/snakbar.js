"use client";
import { useState, useCallback } from "react";

let showSnackbarExternal; // global trigger

export default function Snackbar() {
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "info" });

    const showSnackbar = useCallback((message, type = "info") => {
        setSnackbar({ open: true, message, type });
        setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
    }, []);

    // assign global function
    showSnackbarExternal = showSnackbar;

    if (!snackbar.open) return null;

    return (

        <div
            className={`
    fixed bottom-6 left-1/2 transform -translate-x-1/2 
    px-3 py-2 rounded-lg shadow-lg text-white font-medium animate-fadeIn
    ${snackbar.type === "success" ? "bg-green-600" : ""}
    ${snackbar.type === "error" ? "bg-red-600" : ""}
    ${snackbar.type === "warning" ? "bg-orange-400" : ""}
    ${snackbar.type === "info" ? "bg-blue-500" : ""}
  `}
        >
            {snackbar.message}
        </div>

    );
}

// 🔹 Exported helper function → can be called from any page
export function triggerSnackbar(message, type = "info") {
    if (showSnackbarExternal) {
        showSnackbarExternal(message, type);
    } else {
        console.warn("Snackbar not mounted yet");
    }
}
