
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-4 mt-4 py-4">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-lg disabled:bg-gray-700 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
      >
        Previous
      </button>
      <span className="text-lg font-medium text-gray-300">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-lg disabled:bg-gray-700 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
