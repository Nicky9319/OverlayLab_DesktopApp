import React, { useState, useRef, useEffect } from 'react';
import { subDays, subMonths, subYears, format, parseISO } from 'date-fns';
import DateRangePicker from './DateRangePicker';

const TimeFrameSelector = ({ onTimeFrameChange }) => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('30 Days');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const buttonRef = useRef(null);

  useEffect(() => {
    // Initialize with default time frame
    const today = new Date();
    const startDate = subDays(today, 30);
    const endDate = today;
    onTimeFrameChange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      label: '30 Days'
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeFrameSelect = (timeFrame) => {
    setSelectedTimeFrame(timeFrame);
    setShowCustomPicker(false);
    
    const today = new Date();
    let startDate, endDate;

    switch (timeFrame) {
      case '1 Day':
        startDate = subDays(today, 1);
        endDate = today;
        break;
      case '7 Days':
        startDate = subDays(today, 7);
        endDate = today;
        break;
      case '30 Days':
        startDate = subDays(today, 30);
        endDate = today;
        break;
      case '1 Year':
        startDate = subYears(today, 1);
        endDate = today;
        break;
      case 'Custom':
        setShowCustomPicker(true);
        return;
      default:
        startDate = subDays(today, 30);
        endDate = today;
    }

    onTimeFrameChange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      label: timeFrame
    });
  };

  const handleCustomDateChange = (startDate, endDate) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    onTimeFrameChange({
      startDate,
      endDate,
      label: 'Custom'
    });
  };

  const timeFrames = ['1 Day', '7 Days', '30 Days', '1 Year', 'Custom'];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#8E8E93]">Time Frame:</span>
        <div className="flex gap-1 bg-[#1C1C1E] border border-[#2D2D2F] rounded-lg p-1">
          {timeFrames.map((timeFrame) => (
            <button
              key={timeFrame}
              ref={timeFrame === 'Custom' ? buttonRef : null}
              onClick={() => handleTimeFrameSelect(timeFrame)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                selectedTimeFrame === timeFrame
                  ? 'bg-[#007AFF] text-white'
                  : 'text-[#8E8E93] hover:text-white hover:bg-[#2D2D2F]'
              }`}
            >
              {timeFrame}
            </button>
          ))}
        </div>
      </div>
      {showCustomPicker && (
        <DateRangePicker
          startDate={customStartDate}
          endDate={customEndDate}
          onDateChange={handleCustomDateChange}
          onClose={() => {
            if (customStartDate && customEndDate) {
              setShowCustomPicker(false);
            } else {
              // If no custom dates selected, revert to previous selection
              handleTimeFrameSelect('30 Days');
            }
          }}
        />
      )}
    </div>
  );
};

export default TimeFrameSelector;

