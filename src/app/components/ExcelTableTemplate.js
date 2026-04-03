'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Search } from 'lucide-react';
import Pagination from './Pagination';

export default function ExcelTableTemplate({
    title,
    columns,
    data,
    filters = [],
    defaultRowsPerPage = 10,
    onDrawerOpen,
    drawerContent = null,
    expandedRow: controlledExpandedRow = null, // ✅ Accept external control
    onDrawerClose,
    additionalButtons = [],
    showDateFilter = false,
    dateFilterKey = 'createdAt',
    defaultOrderBy = { field: null, direction: 'asc' },
    centeredAction = null,
    enableRowClick = false,
    showCandidateCount = true
}) {


    const [searchTerm, setSearchTerm] = useState('');
    // Initialize filters from optional defaultValue props so URL-driven filters work (e.g. from associate-dash)
    const [filterValues, setFilterValues] = useState(() => {
        const initial = {};
        (filters || []).forEach((f) => {
            if (f.defaultValue !== undefined && f.defaultValue !== null && f.defaultValue !== '') {
                initial[f.key] = f.defaultValue;
            }
        });
        return initial;
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
    const [expandedRow, setExpandedRow] = useState(null);
    const [orderBy, setOrderBy] = useState(defaultOrderBy);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Generate filter options dynamically
    const filterOptions = useMemo(() => {
        const options = {};
        filters.forEach(filter => {
            let values = data.map(row => row[filter.key]).filter(Boolean);

            // Special handling for patronCity to clean addresses and remove case duplicates
            if (filter.key === 'patronCity') {
                const citySet = new Set();
                values.forEach(val => {
                    const trimmed = val.trim();
                    // If it looks like an address (has comma or very long), extract city
                    if (trimmed.includes(',') || trimmed.length > 30) {
                        const parts = trimmed.split(',');
                        const possibleCity = parts[parts.length - 1].trim();
                        if (possibleCity.length < 30) {
                            citySet.add(possibleCity.toLowerCase());
                        }
                    } else {
                        // It's a city name, normalize case
                        citySet.add(trimmed.toLowerCase());
                    }
                });

                // Convert back to proper case (first letter uppercase)
                const uniqueCities = Array.from(citySet).map(city =>
                    city.charAt(0).toUpperCase() + city.slice(1)
                );
                options[filter.key] = uniqueCities.sort((a, b) => a.localeCompare(b));
            } else {
                // For other filters, just remove exact duplicates (case-sensitive)
                const uniqueValues = [...new Set(values.map(v => v.trim()))];
                options[filter.key] = uniqueValues.sort((a, b) => a.localeCompare(b));
            }
        });
        return options;
    }, [data, filters]);

    // Apply filters, search, date range, and sorting
    const currentData = useMemo(() => {
        let filtered = [...data];

        // Search
        if (searchTerm) {
            filtered = filtered.filter(row =>
                columns.some(col => {
                    const value = row[col.key];
                    return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
                })
            );
        }

        // Column filters
        Object.entries(filterValues).forEach(([key, value]) => {
            if (value) {
                filtered = filtered.filter(row => row[key] === value);
            }
        });

        // Date range filter
        if (showDateFilter && (startDate || endDate)) {
            filtered = filtered.filter(row => {
                const rowDate = row[dateFilterKey];
                if (!rowDate) return false;

                const date = rowDate.toDate ? rowDate.toDate() : new Date(rowDate);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;

                if (start && end) {
                    return date >= start && date <= end;
                } else if (start) {
                    return date >= start;
                } else if (end) {
                    return date <= end;
                }
                return true;
            });
        }

        // Sort
        if (orderBy.field) {
            filtered.sort((a, b) => {
                const aVal = a[orderBy.field];
                const bVal = b[orderBy.field];

                if (aVal === bVal) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;

                if (orderBy.direction === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        }

        return filtered;
    }, [data, searchTerm, filterValues, orderBy, startDate, endDate, columns, showDateFilter, dateFilterKey]);

    // Pagination
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return currentData.slice(startIndex, startIndex + rowsPerPage);
    }, [currentData, currentPage, rowsPerPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterValues, startDate, endDate]);

    const handleFilterChange = (key, value) => {
        setFilterValues(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilterValues({});
        setStartDate('');
        setEndDate('');
    };

    const handleSort = (field) => {
        setOrderBy(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleRow = (rowId) => {
        if (expandedRow === rowId) {
            setExpandedRow(null);
        } else {
            setExpandedRow(rowId);
            if (onDrawerOpen) {
                const row = data.find(r => (r.id || r.firestoreId) === rowId);
                onDrawerOpen(rowId, row);
            }
        }
    };

    return (
        <div className="w-full">
            {/* Header: Title on Left, Buttons on Right */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold text-gray-800">{title}</h1>
                    {/* <p className="text-sm text-gray-600 mt-1">Total: {currentData.length}</p> */}
                </div>

                {/* Action Buttons - RIGHT SIDE */}
                {additionalButtons && additionalButtons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {additionalButtons.map((btn, idx) => {
                            const buttonColors = {
                                blue: 'bg-blue-600 hover:bg-blue-700',
                                green: 'bg-green-600 hover:bg-green-700',
                                red: 'bg-red-600 hover:bg-red-700',
                                orange: 'bg-[#EF5F24] hover:bg-[#d54d1a]',
                                purple: 'bg-purple-600 hover:bg-purple-700',
                                gray: 'bg-gray-200 hover:bg-gray-300 ',
                            };

                            const colorClass = buttonColors[btn.color] || buttonColors.blue;

                            // Exact dimensions for Register button
                            const buttonStyle = btn.primary ? {
                                width: '160px',
                                height: '32px',
                                fontSize: '12px',
                                padding: '0 8px',

                            } : {
                                height: '32px',
                                fontSize: '12px',
                                color: "black",
                                padding: '0 8px'
                            };

                            return (
                                <button
                                    key={idx}
                                    onClick={() => btn.onClick ? btn.onClick(currentData) : null}
                                    className={`${colorClass} text-white rounded-md font-medium transition-colors shadow-sm flex items-center justify-center gap-2`}
                                    style={buttonStyle}
                                >
                                    {btn.icon}
                                    <span>{btn.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Filters Section - COMPACT with GREY BACKGROUND */}
            {(filters.length > 0 || showDateFilter) && (
                <div className="bg-[#F3F3F3] px-3 py-3 rounded-lg mb-4">
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Search */}
                        <div className="relative w-64 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search anything..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                                style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                            />
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                        </div>

                        {/* Dynamic Filters - CONSISTENT WIDTH */}
                        {filters.map((filter) => (
                            <select
                                key={filter.key}
                                value={filterValues[filter.key] || ''}
                                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                className="border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                                style={{
                                    width: '180px',
                                    padding: '6px 12px',
                                    fontFamily: 'NeuzeitGro, sans-serif'
                                }}
                            >
                                <option value="">{filter.label}</option>
                                {filterOptions[filter.key]?.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        ))}

                        {/* Date Filters - SAME LINE */}
                        {showDateFilter && (
                            <>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                                    style={{
                                        width: '160px',
                                        padding: '6px 12px',
                                        fontFamily: 'NeuzeitGro, sans-serif'
                                    }}
                                    placeholder="Start Date"
                                />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                                    style={{
                                        width: '160px',
                                        padding: '6px 12px',
                                        fontFamily: 'NeuzeitGro, sans-serif'
                                    }}
                                    placeholder="End Date"
                                />
                            </>
                        )}

                        {/* Clear Filters Button */}
                        {(Object.values(filterValues).some(v => v) || searchTerm || startDate || endDate) && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm font-medium flex items-center gap-1.5"
                                style={{ fontFamily: 'NeuzeitGro, sans-serif' }}
                            >
                                <X className="w-3.5 h-3.5" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}


            {/* Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b-2 border-gray-200">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable !== false && handleSort(col.key)}
                                        className={`px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-200' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {col.label}
                                            {orderBy.field === col.key && (
                                                orderBy.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                                {drawerContent && <th className="px-4 py-3 w-12"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedData.map((row, idx) => {
                                const rowId = row.id || row.firestoreId || idx;
                                const isExpanded = expandedRow === rowId;

                                return (
                                    <React.Fragment key={rowId}>
                                        {/* Alternating row colors: white and light grey */}
                                        <tr
                                            className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${enableRowClick && drawerContent ? 'cursor-pointer' : ''}`}
                                            onClick={(e) => {
                                                // Only toggle if enableRowClick is true and click is not on a button/input
                                                if (enableRowClick && drawerContent) {
                                                    const target = e.target;
                                                    const isButton = target.closest('button') !== null;
                                                    const isInput = target.closest('input, select, textarea, a') !== null;

                                                    if (!isButton && !isInput) {
                                                        toggleRow(rowId);
                                                    }
                                                }
                                            }}
                                        >
                                            {columns.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className="px-4 py-3 text-sm text-gray-900"
                                                    style={{
                                                        minWidth: '150px',
                                                        maxWidth: '300px',
                                                        fontFamily: 'NeuzeitGro, sans-serif',
                                                        fontWeight: col.bold ? '700' : 'normal'
                                                    }}
                                                >
                                                    <div style={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        wordBreak: 'break-word',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {col.render ? col.render(row[col.key], row, rowId) : row[col.key] || '-'}
                                                    </div>
                                                </td>
                                            ))}
                                            {drawerContent && (
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => toggleRow(rowId)}
                                                        className="flex items-center justify-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        {/* ✅ Conditionally show candidate count */}
                                                        {showCandidateCount && (
                                                            <span className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'NeuzeitGro, sans-serif' }}>
                                                                {row.candidateCount !== undefined ? row.candidateCount : (row.candidateDetails?.length || 0)}
                                                            </span>
                                                        )}
                                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>

                                        {drawerContent && (
                                            <tr>
                                                <td colSpan={columns.length + 1} className="p-0">
                                                    <div
                                                        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] p-4 bg-gray-50' : 'max-h-0'
                                                            }`}
                                                    >
                                                        {/* ✅ NEW: Render centered action button if provided */}
                                                        {centeredAction && (
                                                            <div className="flex justify-center mb-4">
                                                                <button
                                                                    onClick={() => centeredAction.onClick(row, rowId)}
                                                                    style={{
                                                                        backgroundColor: centeredAction.color || '#EF5F24',
                                                                        width: centeredAction.width || '180px',
                                                                        height: centeredAction.height || '32px',
                                                                    }}
                                                                    className="text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
                                                                >
                                                                    {centeredAction.label}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {drawerContent(row, rowId)}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalRecords={currentData.length}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setCurrentPage}
                    onRowsPerPageChange={(newSize) => {
                        setRowsPerPage(newSize);
                        setCurrentPage(1);
                    }}
                />
            </div>
        </div>
    );
}