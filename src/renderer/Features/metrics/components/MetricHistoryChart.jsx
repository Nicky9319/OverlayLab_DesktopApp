import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';

const MetricHistoryChart = ({ history, objectiveUpdates = [] }) => {
  const [visibleLines, setVisibleLines] = useState({
    objective: true,
    backlog: true,
    completed: true,
    total: true,
    resetPoints: true
  });
  const [chartType, setChartType] = useState('line');

  // Process data for chart
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    return history.map((entry) => {
      const date = entry.Date ? (typeof entry.Date === 'string' ? parseISO(entry.Date) : new Date(entry.Date)) : null;
      const objective = entry.ObjectiveCount || 0;
      const backlog = entry.BacklogCount || 0;
      return {
        date: date ? format(date, 'yyyy-MM-dd') : '',
        dateFormatted: date ? format(date, 'MMM d, yyyy') : '',
        dateObj: date,
        objective: objective,
        backlog: backlog,
        completed: entry.CompletedCount || 0,
        total: backlog + objective,
        isFilled: entry.isFilled || false
      };
    });
  }, [history]);

  // Process objective reset points
  const resetPoints = useMemo(() => {
    if (!objectiveUpdates || objectiveUpdates.length === 0) return [];

    return objectiveUpdates
      .map((update) => {
        const date = update.date ? (typeof update.date === 'string' ? parseISO(update.date) : new Date(update.date)) : null;
        if (!date) return null;
        return {
          date: format(date, 'yyyy-MM-dd'),
          dateFormatted: format(date, 'MMM d, yyyy'),
          value: update.newObjectiveValue || 0,
          dateObj: date
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.dateObj - b.dateObj);
  }, [objectiveUpdates]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-[#1C1C1E] border border-[#2D2D2F] rounded-lg p-2 shadow-lg">
          <p className="text-white font-medium mb-1.5 text-xs">{dataPoint.dateFormatted}</p>
          {payload.map((entry, index) => {
            if (!visibleLines[entry.dataKey] && entry.dataKey !== 'resetPoints') return null;
            return (
              <p key={index} className="text-xs" style={{ color: entry.color }}>
                {entry.name}: <span className="font-medium">{entry.value}</span>
              </p>
            );
          })}
          {/* Show reset point info if hovering near a reset date */}
          {resetPoints.some((rp) => rp.date === dataPoint.date) && (
            <p className="text-xs text-[#FF9500] mt-1.5">
              Reset to: <span className="font-medium">
                {resetPoints.find((rp) => rp.date === dataPoint.date)?.value}
              </span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Format X-axis labels
  const formatXAxisLabel = (tickItem) => {
    try {
      const date = parseISO(tickItem);
      // Show month and day for readability
      return format(date, 'MMM d');
    } catch {
      return tickItem;
    }
  };

  const toggleLine = (lineKey) => {
    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }));
  };

  // Line configuration with colors
  const lineConfig = {
    objective: { color: '#007AFF', name: 'Daily Objective' },
    backlog: { color: '#FF9500', name: 'Backlog' },
    completed: { color: '#34C759', name: 'Completed' },
    total: { color: '#AF52DE', name: 'Total' },
    resetPoints: { color: '#FF9500', name: 'Reset Points' }
  };

  return (
    <div className="w-full">
      {/* Chart Type Selector */}
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs text-[#8E8E93]">Chart Type:</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setChartType('line')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              chartType === 'line'
                ? 'bg-[#007AFF] text-white'
                : 'bg-[#1C1C1E] text-[#8E8E93] border border-[#2D2D2F]'
            }`}
          >
            Line
          </button>
          <button
            disabled
            className="px-2 py-1 text-xs font-medium rounded bg-[#1C1C1E] text-[#4A4A4A] border border-[#2D2D2F] cursor-not-allowed opacity-50"
            title="Coming soon"
          >
            Bar
          </button>
          <button
            disabled
            className="px-2 py-1 text-xs font-medium rounded bg-[#1C1C1E] text-[#4A4A4A] border border-[#2D2D2F] cursor-not-allowed opacity-50"
            title="Coming soon"
          >
            Area
          </button>
        </div>
      </div>

      {/* Chart Container with Toggles on Right */}
      <div className="bg-[#111111] border border-[#1C1C1E] rounded-xl p-3">
        <div className="flex gap-4">
          {/* Chart */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2F" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxisLabel}
                  stroke="#8E8E93"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#8E8E93' }}
                />
                <YAxis 
                  stroke="#8E8E93" 
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#8E8E93' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Daily Objective Line */}
                <Line
                  type="monotone"
                  dataKey="objective"
                  name="Daily Objective"
                  stroke="#007AFF"
                  strokeWidth={2}
                  dot={{ fill: '#007AFF', r: 2 }}
                  activeDot={{ r: 4 }}
                  hide={!visibleLines.objective}
                />
                
                {/* Backlog Line */}
                <Line
                  type="monotone"
                  dataKey="backlog"
                  name="Backlog"
                  stroke="#FF9500"
                  strokeWidth={2}
                  dot={{ fill: '#FF9500', r: 2 }}
                  activeDot={{ r: 4 }}
                  hide={!visibleLines.backlog}
                />
                
                {/* Completed Line */}
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#34C759"
                  strokeWidth={2}
                  dot={{ fill: '#34C759', r: 2 }}
                  activeDot={{ r: 4 }}
                  hide={!visibleLines.completed}
                />

                {/* Total Line (Backlog + Objective) */}
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#AF52DE"
                  strokeWidth={2}
                  dot={{ fill: '#AF52DE', r: 2 }}
                  activeDot={{ r: 4 }}
                  hide={!visibleLines.total}
                />

                {/* Objective Reset Points as Reference Lines */}
                {visibleLines.resetPoints && resetPoints.map((resetPoint, index) => {
                  // Find the corresponding data point in chart data
                  const dataPoint = chartData.find((d) => d.date === resetPoint.date);
                  if (!dataPoint) return null;
                  
                  return (
                    <ReferenceLine
                      key={`reset-${index}`}
                      x={resetPoint.date}
                      stroke="#FF9500"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={{
                        value: `Reset: ${resetPoint.value}`,
                        position: 'top',
                        fill: '#FF9500',
                        fontSize: 8,
                        offset: 5
                      }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Vertical Toggle Buttons */}
          <div className="flex flex-col gap-2.5 pt-2 min-w-[140px]">
            <span className="text-xs text-[#8E8E93] mb-0.5 font-medium">Show Lines:</span>
            {Object.entries(lineConfig).map(([key, config]) => (
              <label
                key={key}
                className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity"
                title={config.name}
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={visibleLines[key]}
                    onChange={() => toggleLine(key)}
                    className="w-3.5 h-3.5 rounded border-2 bg-[#1C1C1E] cursor-pointer appearance-none checked:bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#111111]"
                    style={{
                      borderColor: visibleLines[key] ? config.color : '#2D2D2F',
                      accentColor: config.color
                    }}
                  />
                  {visibleLines[key] && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{ color: config.color }}
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <div
                    className="w-3.5 h-1 rounded"
                    style={{ backgroundColor: config.color, opacity: visibleLines[key] ? 1 : 0.5 }}
                  />
                  <span
                    className="text-xs font-medium whitespace-nowrap"
                    style={{ color: visibleLines[key] ? config.color : '#8E8E93' }}
                  >
                    {config.name}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricHistoryChart;

