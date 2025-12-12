import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';

const DateRangePicker = ({ startDate, endDate, onDateChange, onClose }) => {
  const [localStartDate, setLocalStartDate] = useState(startDate || '');
  const [localEndDate, setLocalEndDate] = useState(endDate || '');
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setLocalStartDate(newStartDate);
    if (newStartDate && localEndDate && newStartDate <= localEndDate) {
      onDateChange(newStartDate, localEndDate);
    }
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setLocalEndDate(newEndDate);
    if (localStartDate && newEndDate && localStartDate <= newEndDate) {
      onDateChange(localStartDate, newEndDate);
    }
  };

  const handleApply = () => {
    if (localStartDate && localEndDate && localStartDate <= localEndDate) {
      onDateChange(localStartDate, localEndDate);
      onClose();
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 mt-2 bg-[#111111] border border-[#2D2D2F] rounded-lg p-4 shadow-lg"
      style={{ minWidth: '320px' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">Select Date Range</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#8E8E93] mb-1.5">Start Date</label>
            <input
              type="date"
              value={localStartDate}
              onChange={handleStartDateChange}
              max={localEndDate || today}
              className="w-full px-3 py-2 bg-[#1C1C1E] border border-[#2D2D2F] rounded-lg text-white text-sm focus:outline-none focus:border-[#007AFF]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8E8E93] mb-1.5">End Date</label>
            <input
              type="date"
              value={localEndDate}
              onChange={handleEndDateChange}
              min={localStartDate}
              max={today}
              className="w-full px-3 py-2 bg-[#1C1C1E] border border-[#2D2D2F] rounded-lg text-white text-sm focus:outline-none focus:border-[#007AFF]"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-[#1C1C1E] text-[#8E8E93] border border-[#2D2D2F] rounded-lg text-sm font-medium hover:bg-[#2D2D2F] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={!localStartDate || !localEndDate || localStartDate > localEndDate}
          className="px-3 py-1.5 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-[#0056CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker;

