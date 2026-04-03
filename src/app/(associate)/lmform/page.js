'use client';

import React, { useEffect, useState } from 'react';
import Nav from '../../components/navbar';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import {
    collection,
    getDocs,
    query,
    where,
    Timestamp,
    addDoc,
    doc
} from 'firebase/firestore';
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { UploadCloud, FileText, X } from 'lucide-react';
import { triggerSnackbar } from '../../components/snakbar';
import Snackbar from '../../components/snakbar';
import DynamicForm from '../../components/formcomponent';

export default function AssociateRequestFormPage() {
    const { user } = useAuth();
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    // File upload handler
    const onUploadFiles = async (files) => {
        if (!files || files.length === 0) return;
        if (uploadedFiles.length > 0) {
            triggerSnackbar('Please remove the existing file before uploading a new one.');
            return;
        }
        try {
            setUploading(true);
            const file = files[0];
            const path = `associate-requests/${user?.uid || 'anonymous'}/${Date.now()}_${file.name}`;
            const r = storageRef(storage, path);
            await uploadBytes(r, file);
            const url = await getDownloadURL(r);
            setUploadedFiles([{ name: file.name, url, path }]);
            triggerSnackbar('File uploaded successfully!');
        } catch (e) {
            console.error('Upload failed', e);
            triggerSnackbar('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const formConfig = {
        title: 'Associate Request LM Form ',
        sections: [
            // Section 1: Request Type
            {
                title: 'Add Request',
                fields: [
                    {
                        name: 'requestType',
                        label: 'Request Type',
                        type: 'radio',
                        options: [
                            { label: 'D2C', value: 'D2C' },
                            { label: 'B2B', value: 'B2B' },
                            { label: 'Non-D2C', value: 'Non-D2C' },
                            { label: 'Bench', value: 'Bench' }
                        ],
                        inline: true,
                        defaultValue: 'D2C',
                        required: true,
                        className: 'md:col-span-2 xl:col-span-3'
                    }
                ]
            },

            // Section 2: Main Form Fields
            {
                className: 'md:grid-cols-2 xl:grid-cols-3',
                fields: [
                    // Client Code (D2C only)
                    {
                        name: 'clientCode',
                        label: 'Client Code',
                        type: 'searchable-select',
                        placeholder: 'Select Client Code',
                        fetchOptions: async (dbInstance) => {
                            const email = user?.email;
                            if (!email) return [];

                            const qPm = query(
                                collection(dbInstance, 'patronMaster'),
                                where('assignedLmEmail', '==', email)
                            );
                            const pmSnap = await getDocs(qPm);

                            const assignedNames = [];
                            pmSnap.forEach((d) => {
                                const data = d.data();
                                if (data?.assignedLMName) assignedNames.push(data.assignedLMName);
                            });

                            const clientCodes = [];
                            for (const lmName of assignedNames) {
                                const qAdd = query(
                                    collection(dbInstance, 'addPatronDetails'),
                                    where('assignedLM', '==', lmName)
                                );
                                const addSnap = await getDocs(qAdd);
                                addSnap.forEach((doc) => {
                                    const data = doc.data();
                                    if (data?.patronBusinessID) {
                                        clientCodes.push({
                                            label: data.patronBusinessID,
                                            value: data.patronBusinessID,
                                            id: doc.id
                                        });
                                    }
                                });
                            }

                            return Array.from(new Map(clientCodes.map((c) => [c.value, c])).values());
                        },
                        visible: (data) => data.requestType === 'D2C',
                        required: true
                    },

                    // Patron Name (Non-D2C)
                    {
                        name: 'patronName',
                        label: 'Patron Name',
                        type: 'searchable-select',
                        placeholder: 'Select Patron Name',
                        fetchOptions: async (dbInstance) => {
                            const snap = await getDocs(collection(dbInstance, 'addPatronDetails'));
                            const names = [];
                            snap.forEach((doc) => {
                                const data = doc.data();
                                if (data?.patronName) {
                                    names.push({ label: data.patronName, value: data.patronName });
                                }
                            });
                            return Array.from(new Map(names.map(n => [String(n.value).toLowerCase(), n])).values());
                        },
                        visible: (data) => data.requestType !== 'D2C',
                        required: true
                    },

                    // Task Assigned By
                    {
                        name: 'taskAssignedBy',
                        label: 'Task Assigned By',
                        type: 'searchable-select',
                        placeholder: 'Select',
                        fetchOptions: async (dbInstance) => {
                            const snap = await getDocs(collection(dbInstance, 'patronFamilyMembers'));
                            const list = [];
                            snap.forEach((doc) => {
                                const data = doc.data();
                                const name = data?.name || data?.Name;
                                if (name) list.push({ label: name, value: name });
                            });
                            return list;
                        },
                        required: false
                    },

                    // Requirement Type
                    {
                        name: 'requirementType',
                        label: 'Requirement Type',
                        type: 'select',
                        placeholder: 'Select',
                        options: [
                            { label: 'New', value: 'New' },
                            { label: 'Replacement', value: 'Replacement' }
                        ]
                    },

                    // Advance Payment Received
                    {
                        name: 'advancePaymentReceived',
                        label: 'Advance Payment Received',
                        type: 'select',
                        placeholder: 'Select',
                        options: [
                            { label: 'Yes', value: 'Yes' },
                            { label: 'No', value: 'No' },
                            { label: 'NA', value: 'NA' }
                        ]
                    },

                    // Primary Role
                    {
                        name: 'primaryRole',
                        label: 'Primary Role',
                        type: 'select',
                        placeholder: 'Select',
                        fetchOptions: async (dbInstance) => {
                            const snap = await getDocs(collection(dbInstance, 'patronPrimaryRole'));
                            const roles = [];
                            snap.forEach((doc) => {
                                const data = doc.data();
                                if (data?.primaryRole) {
                                    roles.push({ label: data.primaryRole, value: data.primaryRole });
                                }
                            });
                            return roles;
                        }
                    },

                    // Ethnicity Preference
                    {
                        name: 'ethnicity',
                        label: 'Ethnicity Preference',
                        type: 'select',
                        placeholder: 'Select',
                        fetchOptions: async (dbInstance) => {
                            const snap = await getDocs(collection(dbInstance, 'patronEthnicityPreference'));
                            const ethnicities = [];
                            snap.forEach((doc) => {
                                const data = doc.data();
                                if (data?.ethnicity) {
                                    ethnicities.push({ label: data.ethnicity, value: data.ethnicity });
                                }
                            });
                            return ethnicities;
                        }
                    },

                    // Gender
                    {
                        name: 'gender',
                        label: 'Gender',
                        type: 'select',
                        placeholder: 'Select',
                        options: [
                            { label: 'Male', value: 'Male' },
                            { label: 'Female', value: 'Female' },
                            { label: 'Other', value: 'Other' }
                        ]
                    },

                    // Language
                    {
                        name: 'language',
                        label: 'Language',
                        type: 'select',
                        placeholder: 'Select',
                        fetchOptions: async (dbInstance) => {
                            const snap = await getDocs(collection(dbInstance, 'patronLanguage'));
                            const languages = [];
                            snap.forEach((doc) => {
                                const data = doc.data();
                                if (data?.language) {
                                    languages.push({ label: data.language, value: data.language });
                                }
                            });
                            return languages;
                        }
                    },

                    // Working Hours
                    {
                        name: 'workingHours',
                        label: 'Working Hours',
                        type: 'select',
                        placeholder: 'Select',
                        options: [
                            { label: '<6 hours', value: '<6 hours' },
                            { label: '6-8 hours', value: '6-8 hours' },
                            { label: '8-10 hours', value: '8-10 hours' },
                            { label: '12 hours', value: '12 hours' },
                            { label: 'Live in', value: 'Live in' }
                        ]
                    },

                    // Salary Range
                    {
                        name: 'salaryRange',
                        label: 'Salary / Salary Range',
                        type: 'text',
                        placeholder: 'e.g. 18,000 - 22,000'
                    },

                    // Last Comment
                    {
                        name: 'lastComment',
                        label: 'Last Comment',
                        type: 'text',
                        placeholder: 'Comment',
                        className: 'md:col-span-2'
                    },

                    // Request Open Date
                    {
                        name: 'requestOpenDate',
                        label: 'Request Open Date',
                        type: 'date'
                    },

                    // Address Mode
                    {
                        name: 'addressMode',
                        label: "Client's Address",
                        type: 'select',
                        placeholder: 'Select',
                        options: [
                            { label: "Client's Registered Address", value: 'registered' },
                            { label: 'Other', value: 'other' }
                        ],
                        defaultValue: 'registered'
                    },

                    // Registered Address (visible when addressMode = 'registered')
                    {
                        name: 'registeredAddress',
                        label: 'Address',
                        type: 'textarea',
                        rows: 3,
                        disabled: true,
                        visible: (data) => data.addressMode === 'registered',
                        className: 'md:col-span-2'
                    },

                    // Other Address (visible when addressMode = 'other')
                    {
                        name: 'otherAddress',
                        label: 'Address',
                        type: 'textarea',
                        rows: 3,
                        placeholder: 'Type address',
                        visible: (data) => data.addressMode === 'other',
                        className: 'md:col-span-2'
                    },

                    // Scope of Work
                    {
                        name: 'scopeOfWork',
                        label: 'Scope of Work in Detail',
                        type: 'textarea',
                        rows: 4,
                        placeholder: 'Describe the work scope',
                        className: 'md:col-span-2 xl:col-span-3'
                    },

                    // ✅ Upload Documents Section (Custom Field)
                    {
                        name: 'uploadSection',
                        label: '',
                        type: 'custom',
                        visible: (data) => data.advancePaymentReceived === 'Yes',
                        className: 'md:col-span-2 xl:col-span-3',
                        render: () => (
                            <div className="flex flex-col items-center">
                                <label className="block text-sm font-medium mb-2 text-gray-700">
                                    Upload Documents
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center bg-gray-50 w-full max-w-xl">
                                    <UploadCloud className="w-6 sm:w-8 h-6 sm:h-8 text-orange-600 mb-2" />
                                    <p className="text-xs sm:text-sm text-gray-700 mb-3 text-center px-2">
                                        Drag & drop files here, or click to browse
                                    </p>
                                    <label className="inline-flex items-center gap-2 bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-md cursor-pointer hover:bg-orange-700 text-sm sm:text-base">
                                        <UploadCloud className="w-4 h-4" />
                                        <span>Select Files</span>
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => onUploadFiles(Array.from(e.target.files || []))}
                                        />
                                    </label>
                                    {uploading && (
                                        <span className="text-xs sm:text-sm text-gray-600 mt-2">
                                            Uploading...
                                        </span>
                                    )}
                                </div>

                                {uploadedFiles.length > 0 && (
                                    <ul className="mt-3 space-y-2 w-full max-w-xl">
                                        {uploadedFiles.map((f, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <a
                                                        className="text-orange-600 underline truncate"
                                                        href={f.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {f.name}
                                                    </a>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="p-1 hover:bg-gray-100 rounded flex-shrink-0 ml-2"
                                                    onClick={async () => {
                                                        try {
                                                            if (f.path) await deleteObject(storageRef(storage, f.path));
                                                        } catch (e) { }
                                                        setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
                                                    }}
                                                    aria-label="Remove file"
                                                >
                                                    <X className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )
                                }
                            </div >
                        )
                    }
                ]
            }
        ],

        onSubmit: async (formData, helpers) => {
            const { db: dbInstance, user: helperUser, triggerSnackbar: helperSnackbar, resetForm } = helpers;

            try {
                // 1) Resolve patron doc
                let patronDocId = '';
                let patronData = null;

                if (formData.requestType === 'D2C' && formData.clientCode) {
                    const qPat = query(
                        collection(dbInstance, 'addPatronDetails'),
                        where('patronBusinessID', '==', formData.clientCode)
                    );
                    const snap = await getDocs(qPat);
                    if (!snap.empty) {
                        patronDocId = snap.docs[0].id;
                        patronData = snap.docs[0].data();
                    }
                } else if (formData.requestType !== 'D2C' && formData.patronName) {
                    const qPat = query(
                        collection(dbInstance, 'addPatronDetails'),
                        where('patronName', '==', formData.patronName.trim())
                    );
                    const snap = await getDocs(qPat);
                    if (!snap.empty) {
                        patronDocId = snap.docs[0].id;
                        patronData = snap.docs[0].data();
                    }
                }

                if (!patronDocId || !patronData) {
                    helperSnackbar('Could not resolve patron record. Please select a valid Client Code or Patron Name.');
                    return;
                }

                // 2) Resolve LM details
                let assignedLMName = '';
                let lmNumber = '';

                if (helperUser?.email) {
                    const qUser = query(collection(dbInstance, 'user'), where('email', '==', helperUser.email));
                    const uSnap = await getDocs(qUser);
                    if (!uSnap.empty) {
                        const data = uSnap.docs[0].data();
                        assignedLMName = data?.display_name || '';
                        lmNumber = data?.phone_number || '';
                    }
                }

                // 3) Build timestamps
                const now = new Date();
                const createdAt = Timestamp.fromDate(now);
                const taskDate = createdAt;
                const taskAssignDate = createdAt;
                const due = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
                const taskDueDate = Timestamp.fromDate(due);
                const taskRecievedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // 4) Patron details
                const patronCity = patronData?.city || '';
                const patronAddress = patronData?.billingAddress || '';
                const patronID = patronData?.patronBusinessID || '';
                const patronRef = `/addPatronDetails/${patronDocId}`;
                const lmRef = patronData?.lmRef || '';
                const patronNameResolved = formData.requestType === 'D2C'
                    ? (patronData?.patronName || '')
                    : formData.patronName;

                // 5) Generate requestID
                const dynamicCode = 'ASR';
                const qCount = await getDocs(collection(dbInstance, 'patronAddRequest'));
                const existingCount = qCount.size;

                const yy = String(now.getFullYear()).slice(-2);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const datePart = `${yy}${mm}${dd}`;
                const requestID = `${datePart}${dynamicCode}${existingCount + 1}`;

                // 6) Build payload
                const payload = {
                    assignedLMName: assignedLMName || '',
                    createdAt,
                    createdBy: helperUser?.email || '',
                    clientCode: patronID || '',
                    lmNumber: lmNumber || '',
                    lmRef: lmRef || '',
                    lmEmail: helperUser?.email || '',
                    location: patronCity || '',
                    patronName: patronNameResolved || '',
                    patronAddress: patronAddress || '',
                    patronCity: patronCity || '',
                    patronID: patronID || '',
                    patronRef,
                    taskAssignDate,
                    status: 'Pending',
                    taskCategory: 'Trained Manpower',
                    taskType: 'Associates',
                    isExpand: false,
                    taskDate,
                    taskDescription: formData.scopeOfWork || '',
                    scopeOfWork: formData.scopeOfWork || '',
                    primaryRole: formData.primaryRole || '',
                    requirementType: formData.requirementType || '',
                    taskDueDate,
                    taskOwner: assignedLMName || '',
                    taskRecievedTime,
                    taskSubCategory: 'Recruitment',
                    requestType: formData.requestType,
                    ethnicityPreference: formData.ethnicity,
                    gender: formData.gender,
                    language: formData.language,
                    workingHours: formData.workingHours,
                    salaryRange: formData.salaryRange,
                    lastComment: formData.lastComment,
                    advancePaymentReceived: formData.advancePaymentReceived,
                    requestOpenDate: formData.requestOpenDate,
                    requestID: requestID || '',
                    attachments: uploadedFiles
                };

                // 7) Save to patronAddRequest
                const patronAddRequestRef = await addDoc(collection(dbInstance, 'patronAddRequest'), payload);

                // 8) Build associateRef and save to createTaskCollection
                const associateRef = `/patronAddRequest/${patronAddRequestRef.id}`;
                const taskPayload = {
                    ...payload,
                    associateRef,
                    isCockpitTaskCreated: false,
                    isDelayed: false,
                    isOTSTask: false,
                    isTaskDisabled: false
                };

                await addDoc(collection(dbInstance, 'createTaskCollection'), taskPayload);

                helperSnackbar('Task successfully created and linked!');
                setUploadedFiles([]);
                if (typeof resetForm === 'function') resetForm();
            } catch (err) {
                console.error('Failed to create task', err);
                triggerSnackbar('Failed to create task. Please try again.');
            }
        },
        submitButtonText: 'Create Task'
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Nav />
            <DynamicForm
                config={formConfig}
                user={user}
                triggerSnackbar={triggerSnackbar}
            />
            <Snackbar />
        </div>
    );
}