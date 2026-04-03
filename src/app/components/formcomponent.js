
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Nav from './navbar';
import { useAuth } from '../context/AuthContext';
// import { db, storage } from '../firebase/config';
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
import { triggerSnackbar } from '../components/snakbar';
import Snackbar from '../components/snakbar';

// ============================================
// SEARCHABLE SELECT COMPONENT
// ============================================
function SearchableSelect({
    label,
    placeholder = 'Select',
    items = [],
    value,
    onChange,
    required = false,
    disabled = false
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listRefs = useRef([]);

    useEffect(() => {
        const onClickAway = (e) => {
            if (!containerRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('click', onClickAway);
        return () => document.removeEventListener('click', onClickAway);
    }, []);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return items || [];
        return (items || []).filter((it) =>
            String(it?.label ?? it).toLowerCase().includes(term)
        );
    }, [items, search]);

    useEffect(() => {
        setHighlightIndex(filtered.length ? 0 : -1);
    }, [filtered.length]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 0);
        else setSearch('');
    }, [open]);

    useEffect(() => {
        if (highlightIndex >= 0 && listRefs.current[highlightIndex]) {
            listRefs.current[highlightIndex].scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex]);

    const selectedLabel = useMemo(() => {
        if (!value) return '';
        const found = (items || []).find((it) => (it?.value ?? it) === value);
        return String(found?.label ?? found ?? value);
    }, [items, value]);

    const onKeyDown = (e) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && filtered[highlightIndex]) {
                const val = filtered[highlightIndex]?.value ?? filtered[highlightIndex];
                onChange(val);
                setOpen(false);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="w-full" ref={containerRef} onKeyDown={onKeyDown}>
            {label && (
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setOpen((v) => !v)}
                    disabled={disabled}
                    className={`w-full text-left border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-between ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                        }`}
                >
                    <span className="truncate">{selectedLabel || placeholder}</span>
                    <span className="text-gray-400">▾</span>
                </button>
                {open && !disabled && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                        <div className="p-2">
                            <input
                                ref={inputRef}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setHighlightIndex(0);
                                }}
                            />
                        </div>
                        <ul className="max-h-56 overflow-auto">
                            {filtered.length === 0 && (
                                <li className="px-3 py-2 text-sm text-gray-500">No results</li>
                            )}
                            {filtered.map((it, idx) => {
                                const val = it?.value ?? it;
                                const lab = it?.label ?? it;
                                const highlighted = idx === highlightIndex;
                                return (
                                    <li
                                        key={`${idx}-${String(val)}`}
                                        ref={(el) => (listRefs.current[idx] = el)}
                                        className={`px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer ${highlighted ? 'bg-orange-50' : ''
                                            }`}
                                        onMouseEnter={() => setHighlightIndex(idx)}
                                        onMouseDown={(ev) => ev.preventDefault()}
                                        onClick={() => {
                                            onChange(val);
                                            setOpen(false);
                                        }}
                                    >
                                        {String(lab)}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// SIMPLE SELECT (NON-SEARCHABLE)
// ============================================
function SimpleSelect({
    label,
    placeholder = 'Select',
    items = [],
    value,
    onChange,
    required = false,
    disabled = false
}) {
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef(null);
    const listRefs = useRef([]);

    useEffect(() => {
        const onClickAway = (e) => {
            if (!containerRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('click', onClickAway);
        return () => document.removeEventListener('click', onClickAway);
    }, []);

    const selectedLabel = useMemo(() => {
        if (value === null || value === undefined || value === '') return '';
        const found = (items || []).find((it) => String(it?.value ?? it) === String(value));
        return String(found?.label ?? found ?? value);
    }, [items, value]);

    useEffect(() => {
        if (open) setHighlightIndex(items && items.length ? 0 : -1);
        else setHighlightIndex(-1);
    }, [open, items]);

    const onKeyDown = (e) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(i + 1, (items || []).length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const itm = (items || [])[highlightIndex];
            if (itm) {
                onChange(itm?.value ?? itm);
                setOpen(false);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="w-full" ref={containerRef} onKeyDown={onKeyDown}>
            {label && (
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setOpen((v) => !v)}
                    disabled={disabled}
                    className={`w-full text-left border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-between ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'
                        }`}
                >
                    <span>{selectedLabel || placeholder}</span>
                    <span className="text-gray-400">▾</span>
                </button>
                {open && !disabled && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                        <ul className="max-h-56 overflow-auto">
                            {(items || []).map((it, idx) => {
                                const val = it?.value ?? it;
                                const lab = it?.label ?? it;
                                const highlighted = idx === highlightIndex;
                                return (
                                    <li
                                        key={`${idx}-${String(val)}`}
                                        ref={(el) => (listRefs.current[idx] = el)}
                                        className={`px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer ${highlighted ? 'bg-orange-50' : ''
                                            }`}
                                        onMouseEnter={() => setHighlightIndex(idx)}
                                        onMouseDown={(ev) => ev.preventDefault()}
                                        onClick={() => {
                                            onChange(val);
                                            setOpen(false);
                                        }}
                                    >
                                        {String(lab)}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// MULTI-SELECT COMPONENT
// ============================================
function MultiSelect({
    label,
    placeholder = 'Select',
    items = [],
    value = [],
    onChange,
    required = false
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const onClickAway = (e) => {
            if (!containerRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('click', onClickAway);
        return () => document.removeEventListener('click', onClickAway);
    }, []);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return items || [];
        return (items || []).filter((it) =>
            String(it?.label ?? it).toLowerCase().includes(term)
        );
    }, [items, search]);

    const selectedLabel = useMemo(() => {
        const selected = Array.isArray(value) ? value : [];
        return selected.length === 0 ? '' : `${selected.length} selected`;
    }, [value]);

    const toggleSelection = (val) => {
        const current = Array.isArray(value) ? value : [];
        if (current.includes(val)) {
            onChange(current.filter((v) => v !== val));
        } else {
            onChange([...current, val]);
        }
    };

    return (
        <div className="w-full" ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="w-full text-left border border-gray-300 bg-gray-50 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 flex items-center justify-between"
                >
                    <span className="truncate">{selectedLabel || placeholder}</span>
                    <span className="text-gray-400">▾</span>
                </button>
                {open && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                        <div className="p-2">
                            <input
                                ref={inputRef}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <ul className="max-h-56 overflow-auto">
                            {filtered.length === 0 && (
                                <li className="px-3 py-2 text-sm text-gray-500">No results</li>
                            )}
                            {filtered.map((it, idx) => {
                                const val = it?.value ?? it;
                                const lab = it?.label ?? it;
                                const selected = Array.isArray(value) && value.includes(val);
                                return (
                                    <li
                                        key={`${idx}-${String(val)}`}
                                        className="px-3 py-2 text-sm hover:bg-orange-50 cursor-pointer flex items-center gap-2"
                                        onClick={() => toggleSelection(val)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            readOnly
                                            className="pointer-events-none"
                                        />
                                        {String(lab)}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// MAIN DYNAMIC FORM COMPONENT
// ============================================
export default function DynamicForm({ config, user, triggerSnackbar }) {
    const [formData, setFormData] = useState({});
    const [fieldOptions, setFieldOptions] = useState({});
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Initialize form data with default values
    useEffect(() => {
        const initialData = {};
        config.sections?.forEach((section) => {
            section.fields?.forEach((field) => {
                if (field.defaultValue !== undefined) {
                    initialData[field.name] = field.defaultValue;
                }
            });
        });
        setFormData(initialData);
    }, [config]);

    // Fetch options for select fields - runs when formData changes
    useEffect(() => {
        const fetchAllOptions = async () => {
            // Import db dynamically if needed
            const { db } = await import('../firebase/config');

            const optionsMap = {};
            for (const section of config.sections || []) {
                for (const field of section.fields || []) {
                    if (['select', 'searchable-select', 'multi-select'].includes(field.type)) {
                        if (field.fetchOptions) {
                            try {
                                optionsMap[field.name] = await field.fetchOptions(db, user, formData);
                            } catch (e) {
                                console.error(`Failed to fetch options for ${field.name}:`, e);
                                optionsMap[field.name] = [];
                            }
                        } else if (Array.isArray(field.options)) {
                            optionsMap[field.name] = field.options;
                        } else if (typeof field.options === 'function') {
                            optionsMap[field.name] = field.options(formData);
                        }
                    }
                }
            }
            setFieldOptions(optionsMap);
        };
        fetchAllOptions();
    }, [config, user, formData.requestType, formData.clientCode, formData.patronName]);

    const setFieldValue = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const newErrors = {};
        config.sections?.forEach((section) => {
            if (section.visible && !section.visible(formData)) return;

            section.fields?.forEach((field) => {
                if (field.visible && !field.visible(formData)) return;

                const value = formData[field.name];
                if (field.required && (value === '' || value === undefined || value === null || (Array.isArray(value) && value.length === 0))) {
                    newErrors[field.name] = `${field.label} is required`;
                }
                if (field.validation) {
                    const error = field.validation(value, formData);
                    if (error) newErrors[field.name] = error;
                }
            });
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            triggerSnackbar('Please fix the errors in the form');
            return;
        }
        setLoading(true);
        try {
            // Import db and storage dynamically
            const { db, storage } = await import('../firebase/config');

            const helpers = {
                db,
                storage,
                user,
                triggerSnackbar,
                getFormData: () => formData,
                setFieldValue,
                resetForm: () => {
                    const initialData = {};
                    config.sections?.forEach((section) => {
                        section.fields?.forEach((field) => {
                            if (field.defaultValue !== undefined) {
                                initialData[field.name] = field.defaultValue;
                            }
                        });
                    });
                    setFormData(initialData);
                    setErrors({});
                }
            };
            await config.onSubmit(formData, helpers);
        } catch (err) {
            console.error('Form submission error:', err);
            triggerSnackbar('Failed to submit form');
        } finally {
            setLoading(false);
        }
    };

    const renderField = (field) => {
        const value = formData[field.name];
        const error = errors[field.name];
        const isVisible = !field.visible || field.visible(formData);

        if (!isVisible) return null;

        const commonProps = {
            label: field.label,
            placeholder: field.placeholder,
            required: field.required,
            disabled: field.disabled || loading
        };

        switch (field.type) {
            case 'text':
            case 'number':
            case 'date':
            case 'time':
            case 'email':
                return (
                    <div key={field.name} className={field.className || ''}>
                        {commonProps.label && (
                            <label className="block text-sm font-medium mb-1 text-gray-700">
                                {commonProps.label} {commonProps.required && <span className="text-red-500">*</span>}
                            </label>
                        )}
                        <input
                            type={field.type}
                            value={value || ''}
                            onChange={(e) => setFieldValue(field.name, e.target.value)}
                            placeholder={commonProps.placeholder}
                            disabled={commonProps.disabled}
                            className="w-full border border-gray-300 bg-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm sm:text-base"
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                );

            case 'textarea':
                return (
                    <div key={field.name} className={field.className || ''}>
                        {commonProps.label && (
                            <label className="block text-sm font-medium mb-1 text-gray-700">
                                {commonProps.label} {commonProps.required && <span className="text-red-500">*</span>}
                            </label>
                        )}
                        <textarea
                            value={value || ''}
                            onChange={(e) => setFieldValue(field.name, e.target.value)}
                            placeholder={commonProps.placeholder}
                            disabled={commonProps.disabled}
                            readOnly={field.readOnly}
                            rows={field.rows || 4}
                            className={`w-full border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm sm:text-base ${field.disabled || field.readOnly ? 'bg-gray-50' : 'bg-white'
                                }`}
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                );

            case 'select':
                return (
                    <div key={field.name} className={field.className || ''}>
                        <SimpleSelect
                            {...commonProps}
                            items={fieldOptions[field.name] || []}
                            value={value}
                            onChange={(val) => setFieldValue(field.name, val)}
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                );

            case 'searchable-select':
                return (
                    <div key={field.name} className={field.className || ''}>
                        <SearchableSelect
                            {...commonProps}
                            items={fieldOptions[field.name] || []}
                            value={value}
                            onChange={(val) => setFieldValue(field.name, val)}
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                );

            case 'multi-select':
                return (
                    <div key={field.name} className={field.className || ''}>
                        <MultiSelect
                            {...commonProps}
                            items={fieldOptions[field.name] || []}
                            value={value || []}
                            onChange={(val) => setFieldValue(field.name, val)}
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                );

            case 'radio':
                return (
                    <div key={field.name} className={field.className || ''}>
                        {commonProps.label && (
                            <label className="block text-sm font-medium mb-2 text-gray-700">
                                {commonProps.label} {commonProps.required && <span className="text-red-500">*</span>}
                            </label>
                        )}
                        <div className={`flex ${field.inline !== false ? 'flex-row gap-4' : 'flex-col gap-2'}`}>
                            {(field.options || []).map((opt) => (
                                <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={value === opt.value}
                                        onChange={() => setFieldValue(field.name, opt.value)}
                                        disabled={commonProps.disabled}
                                        className="accent-orange-600"
                                    />
                                    <span className="text-sm">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                );

            case 'custom':
                return (
                    <div key={field.name} className={field.className || ''}>
                        {field.render({ value, onChange: (val) => setFieldValue(field.name, val), formData, error })}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6">
            {config.title && (
                <h1 className="text-xl sm:text-2xl font-semibold text-orange-600 mb-4 sm:mb-6">
                    {config.title}
                </h1>
            )}

            {config.sections?.map((section, idx) => {
                const isSectionVisible = !section.visible || section.visible(formData);
                if (!isSectionVisible) return null;

                return (
                    <div key={idx} className="mb-6">
                        {section.title && (
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">{section.title}</h2>
                        )}
                        <div className={`grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 ${section.className || 'md:grid-cols-2 xl:grid-cols-3'}`}>
                            {section.fields?.map((field) => renderField(field))}
                        </div>
                    </div>
                );
            })}

            <div className="pt-4 flex justify-center">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full sm:w-auto sm:min-w-[280px] bg-orange-600 hover:bg-orange-700 text-white rounded-md px-6 py-3 text-sm sm:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Submitting...' : (config.submitButtonText || 'Submit')}
                </button>
            </div>
        </div>
    );
}