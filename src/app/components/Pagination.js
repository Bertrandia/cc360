"use client";
import React from "react";

const Pagination = ({
    currentPage,
    totalRecords,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
}) => {
    const totalPages = Math.ceil(totalRecords / rowsPerPage);

    const goToPage = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            onPageChange(pageNumber);
        }
    };

    const goToPreviousPage = () => {
        goToPage(currentPage - 1);
    };

    const goToNextPage = () => {
        goToPage(currentPage + 1);
    };

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pageNumbers.push(i);
                pageNumbers.push("...");
                pageNumbers.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(1);
                pageNumbers.push("...");
                for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
            } else {
                pageNumbers.push(1);
                pageNumbers.push("...");
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
                pageNumbers.push("...");
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    return (
        totalPages > 1 && (
            <div
                className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 px-3 sm:px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                style={{
                    whiteSpace: "nowrap",
                    position: "sticky",
                    bottom: "0px",
                    left: "10px",
                    backgroundColor: "white",
                    boxShadow: "-2px 0 4px rgba(0,0,0,0.1)",
                }}
            >
                {/* Info - Hidden on very small screens */}
                <div className="hidden sm:flex items-center text-xs sm:text-sm text-gray-700" style={{

                    fontFamily: "NeuzeitGro",
                }}>
                    <span>
                        Showing{" "}
                        {totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to{" "}
                        {Math.min(currentPage * rowsPerPage, totalRecords)} of {totalRecords} results
                    </span>
                </div>

                {/* Mobile compact info */}
                <div className="sm:hidden text-xs text-gray-700" style={{

                    fontFamily: "NeuzeitGro",
                }}>
                    <span>Page {currentPage} of {totalPages}</span>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-1 sm:space-x-2">
                    {/* Previous */}
                    <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${currentPage === 1
                            ? "text-gray-400 cursor-not-allowed bg-gray-100"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        style={{

                            fontFamily: "NeuzeitGro",
                        }}
                    >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                        {getPageNumbers().map((pageNumber, index) => (
                            <button
                                key={index}
                                onClick={() => typeof pageNumber === "number" && goToPage(pageNumber)}
                                disabled={pageNumber === "..."}
                                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${pageNumber === currentPage
                                    ? "bg-blue-600 text-white border border-blue-600"
                                    : pageNumber === "..."
                                        ? "text-gray-400 cursor-default"
                                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                {pageNumber}
                            </button>
                        ))}
                    </div>

                    {/* Next */}
                    <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${currentPage === totalPages
                            ? "text-gray-400 cursor-not-allowed bg-gray-100"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        style={{

                            fontFamily: "NeuzeitGro",
                        }}
                    >
                        Next
                    </button>
                </div>

                {/* Rows per page */}
                <div className="flex items-center">
                    <select
                        value={rowsPerPage}
                        onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                        className="border border-gray-300 rounded-md text-xs sm:text-sm px-2 py-1"
                        style={{

                            fontFamily: "NeuzeitGro",
                        }}
                    >
                        {[10, 20, 50].map((size) => (
                            <option key={size} value={size}>
                                Show {size}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        )
    );
};

export default Pagination;