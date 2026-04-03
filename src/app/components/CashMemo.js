'use client';
import React, { useState, useEffect } from 'react';
import { Modal, Box } from '@mui/material';
import { X, Download, Edit2, Save } from 'lucide-react';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { triggerSnackbar } from "./snakbar";

const db = getFirestore();

export default function CashMemo({ open, onClose, taskId, taskData }) {
    const [memoData, setMemoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [editedData, setEditedData] = useState(null);
    const [natureOptions, setNatureOptions] = useState([]);

    useEffect(() => {
        if (open && taskId) {
            loadMemoData();
            fetchNatureOptions(); // ✅ ADD THIS
        }
    }, [open, taskId]);

    const loadMemoData = async () => {
        setLoading(true);
        try {
            const taskRef = doc(db, 'patronOtsAddRequest', taskId);
            const taskSnap = await getDoc(taskRef);

            if (!taskSnap.exists()) {
                console.error('Task not found');
                return;
            }

            const task = taskSnap.data();

            const candidatesSnap = await getDocs(collection(taskRef, 'candidateDetails'));
            const allCandidates = candidatesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const candidates = allCandidates.filter(c => c.isCounted === true);

            if (candidates.length === 0) {
                triggerSnackbar('No candidates marked for Cash Memo', 'error');
                setLoading(false);
                return;
            }


            const totalManHours = candidates.reduce((sum, c) => sum + (c.totalHoursServe || 0), 0);
            const totalPreTax = candidates.reduce((sum, c) => sum + (c.totalPreAmount || 0), 0);
            const totalTax = candidates.reduce((sum, c) => sum + (c.taxAmount || 0), 0);
            const totalBillable = candidates.reduce((sum, c) => sum + (c.billableAmount || 0), 0);

            const data = {
                invoiceNo: task.serviceCode || 'N/A',
                invoiceDate: new Date().toLocaleDateString('en-GB'),
                soldTo: task.patronName || 'N/A',
                natureOfRequirement: task.natureOfRequirement || 'N/A',
                remarks: task.serviceCardRemarks || '',
                candidates: candidates.map((c, idx) => ({
                    id: c.id,
                    sNo: idx + 1,
                    date: c.resourceInTimeWithId && c.resourceInTimeWithId.length > 0
                        ? new Date(c.resourceInTimeWithId[0].toDate()).toLocaleDateString('en-GB')
                        : 'N/A',
                    name: c.candidateName || '',
                    manhours: c.totalHoursServe || 0,
                    preTax: c.totalPreAmount || 0,
                    tax: c.taxAmount || 0,
                    amount: c.billableAmount || 0,
                    itemNature: c.itemNatureOfRequirement || task.natureOfRequirement || 'N/A'
                })),
                totals: {
                    manhours: totalManHours.toFixed(2),
                    preTax: totalPreTax.toFixed(2),
                    tax: totalTax.toFixed(2),
                    amount: totalBillable.toFixed(2)
                }
            };

            setMemoData(data);
            setEditedData(JSON.parse(JSON.stringify(data))); // Deep copy
        } catch (error) {
            console.error('Error loading memo data:', error);
            triggerSnackbar('Failed to load cash memo', 'error');
        }
        setLoading(false);
    };

    const fetchNatureOptions = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'patronOTS-NatureofRequirement'));
            const options = snapshot.docs.map(doc => doc.data().natureOfRequirement).filter(Boolean);
            const uniqueOptions = [...new Set(options)]; // Remove duplicates
            setNatureOptions(uniqueOptions);
        } catch (error) {
            console.error('Error fetching nature options:', error);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditedData(JSON.parse(JSON.stringify(memoData)));
        setIsEditing(false);
    };

    const handleSave = async () => {
        try {
            // Update main task
            const taskRef = doc(db, 'patronOtsAddRequest', taskId);
            await updateDoc(taskRef, {
                serviceCardRemarks: editedData.remarks
            });

            // Update each candidate
            for (const candidate of editedData.candidates) {
                const candidateRef = doc(db, 'patronOtsAddRequest', taskId, 'candidateDetails', candidate.id);
                await updateDoc(candidateRef, {
                    totalHoursServe: parseFloat(candidate.manhours),
                    totalPreAmount: parseFloat(candidate.preTax),
                    taxAmount: parseFloat(candidate.tax),
                    billableAmount: parseFloat(candidate.amount),
                    itemNatureOfRequirement: candidate.itemNature
                });
            }

            setMemoData(JSON.parse(JSON.stringify(editedData)));
            setIsEditing(false);
            triggerSnackbar('Cash memo updated successfully', 'success');
        } catch (error) {
            console.error('Error saving memo:', error);
            triggerSnackbar('Failed to save changes', 'error');
        }
    };

    const handleFieldChange = (field, value) => {
        setEditedData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCandidateChange = (index, field, value) => {
        setEditedData(prev => {
            const newCandidates = [...prev.candidates];
            // Preserve the candidate id when updating
            const candidateId = newCandidates[index].id; // Store id before update

            newCandidates[index] = {
                ...newCandidates[index],
                id: candidateId, // Ensure id is preserved
                [field]: value
            };

            // Recalculate totals
            const totalManHours = newCandidates.reduce((sum, c) => sum + parseFloat(c.manhours || 0), 0);
            const totalPreTax = newCandidates.reduce((sum, c) => sum + parseFloat(c.preTax || 0), 0);
            const totalTax = newCandidates.reduce((sum, c) => sum + parseFloat(c.tax || 0), 0);
            const totalBillable = newCandidates.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

            return {
                ...prev,
                candidates: newCandidates,
                totals: {
                    manhours: totalManHours.toFixed(2),
                    preTax: totalPreTax.toFixed(2),
                    tax: totalTax.toFixed(2),
                    amount: totalBillable.toFixed(2)
                }
            };
        });
    };

    const downloadPDF = async () => {
        try {
            setIsDownloading(true); // 🔴 hide X button

            // allow React to re-render
            await new Promise(resolve => setTimeout(resolve, 100));

            const element = document.getElementById('cash-memo-content');
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm');
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`CashMemo_${memoData?.soldTo || 'Invoice'}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            triggerSnackbar('Failed to generate PDF', 'error');
        } finally {
            setIsDownloading(false); // ✅ restore X button
        }
    };


    if (loading) {
        return (
            <Modal open={open} onClose={onClose}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'white',
                    p: 4,
                    borderRadius: 2
                }}>
                    <p>Loading Cash Memo...</p>
                </Box>
            </Modal>
        );
    }

    if (!memoData) return null;

    const displayData = isEditing ? editedData : memoData;

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '95%', sm: '90%', md: '850px' },
                maxHeight: '90vh',
                bgcolor: 'white',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                overflow: 'auto',
                fontFamily: 'NeuzeitGro, sans-serif'
            }}>
                <div id="cash-memo-content" style={{ padding: '24px', backgroundColor: 'white' }}>
                    {/* Header */}
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        backgroundColor: 'white',
                        zIndex: 10,
                        padding: '16px',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <img src="/CC360 logo.png" alt="CC360 Logo" style={{ height: '50px', width: 'auto' }} />
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>CareCrew360</h2>
                        {!isDownloading && (
                            <button
                                onClick={() => {
                                    setIsEditing(false); // ✅ Reset edit mode
                                    onClose();
                                }}
                                style={{
                                    padding: '8px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '9999px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X style={{ width: '20px', height: '20px' }} />
                            </button>
                        )}

                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '32px',
                        paddingBottom: '16px',
                        borderBottom: '2px solid #e5e7eb'
                    }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Cash Memo</h1>
                    </div>

                    {/* Invoice Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 4px 0' }}>Invoice no.</p>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={displayData.invoiceNo}
                                    onChange={(e) => handleFieldChange('invoiceNo', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontWeight: '600'
                                    }}
                                />
                            ) : (
                                <p style={{ fontWeight: '600', margin: 0 }}>{displayData.invoiceNo}</p>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 4px 0' }}>Invoice Date</p>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={displayData.invoiceDate}
                                    onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        textAlign: 'right'
                                    }}
                                />
                            ) : (
                                <p style={{ fontWeight: '600', margin: 0 }}>{displayData.invoiceDate}</p>
                            )}
                        </div>
                    </div>

                    {/* Sold To */}
                    <div style={{ marginBottom: '24px' }}>
                        <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 4px 0' }}>Sold To</p>
                        {isEditing ? (
                            <input
                                type="text"
                                value={displayData.soldTo}
                                onChange={(e) => handleFieldChange('soldTo', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontWeight: '600',
                                    fontSize: '18px'
                                }}
                            />
                        ) : (
                            <p style={{ fontWeight: '600', fontSize: '18px', margin: 0 }}>{displayData.soldTo}</p>
                        )}
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f3f4f6' }}>
                                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>S No.</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Items</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Date</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Name</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Manhours</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>Pre Amount</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>Tax</th>
                                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayData.candidates.map((item, idx) => (
                                    <tr key={item.sNo}>
                                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px' }}>{item.sNo}</td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px' }}>
                                            {isEditing ? (
                                                <select
                                                    value={item.itemNature}
                                                    onChange={(e) => handleCandidateChange(idx, 'itemNature', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '4px',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        fontSize: '14px',
                                                        fontFamily: 'NeuzeitGro, sans-serif'
                                                    }}
                                                >
                                                    {natureOptions.map((option, idx) => (
                                                        <option key={idx} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                item.itemNature
                                            )}
                                        </td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px' }}>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={item.date}
                                                    onChange={(e) => handleCandidateChange(idx, 'date', e.target.value)}
                                                    style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                />
                                            ) : item.date}
                                        </td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px' }}>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleCandidateChange(idx, 'name', e.target.value)}
                                                    style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                />
                                            ) : item.name}
                                        </td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px' }}>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.manhours}
                                                    onChange={(e) => handleCandidateChange(idx, 'manhours', e.target.value)}
                                                    style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                />
                                            ) : item.manhours}
                                        </td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px', textAlign: 'right' }}>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.preTax}
                                                    onChange={(e) => handleCandidateChange(idx, 'preTax', e.target.value)}
                                                    style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'right' }}
                                                />
                                            ) : `₹ ${item.preTax}`}
                                        </td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px', textAlign: 'right' }}>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.tax}
                                                    onChange={(e) => handleCandidateChange(idx, 'tax', e.target.value)}
                                                    style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'right' }}
                                                />
                                            ) : `₹ ${item.tax.toFixed(2)}`}
                                        </td>
                                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px', textAlign: 'right', fontWeight: '600' }}>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.amount}
                                                    onChange={(e) => handleCandidateChange(idx, 'amount', e.target.value)}
                                                    style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'right' }}
                                                />
                                            ) : `₹ ${item.amount.toFixed(2)}`}
                                        </td>
                                    </tr>
                                ))}
                                {/* Total Row */}
                                <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
                                    <td colSpan="4" style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px' }}>Total</td>
                                    <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px', textAlign: 'right' }}>{displayData.totals.manhours}</td>
                                    <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px', textAlign: 'right' }}>₹ {displayData.totals.preTax}</td>
                                    <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px', textAlign: 'right' }}>₹ {displayData.totals.tax}</td>
                                    <td style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '14px', textAlign: 'right' }}>₹ {displayData.totals.amount}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Remarks */}
                    {(displayData.remarks || isEditing) && (
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Remarks</p>
                            {isEditing ? (
                                <textarea
                                    value={displayData.remarks}
                                    onChange={(e) => handleFieldChange('remarks', e.target.value)}
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        fontFamily: 'NeuzeitGro, sans-serif'
                                    }}
                                />
                            ) : (
                                <p style={{ fontSize: '14px', color: '#4b5563', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '4px', margin: 0 }}>
                                    {displayData.remarks}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: 'white',
                    borderTop: '1px solid #e5e7eb',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px'
                }}>
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleCancelEdit}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <X style={{ width: '20px', height: '20px' }} />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <Save style={{ width: '20px', height: '20px' }} />
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleEdit}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <Edit2 style={{ width: '20px', height: '20px' }} />
                                Edit
                            </button>
                            <button
                                onClick={downloadPDF}
                                style={{
                                    backgroundColor: '#ea580c',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <Download style={{ width: '20px', height: '20px' }} />
                                Download
                            </button>
                        </>
                    )}
                </div>
            </Box>
        </Modal>
    );
}