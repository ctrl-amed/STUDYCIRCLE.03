// src/pages/ITLogs.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../utils/adminApi';

const API_BASE = 'http://localhost:5000';
const REFRESH_MS = 30000; // auto-refresh every 30 seconds

// Local (not UTC) YYYY-MM-DD, so "today" matches the admin's own calendar day
const toLocalDateStr = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Parse "YYYY-MM-DD" as a LOCAL midnight date (avoids off-by-one-day timezone bugs)
const parseLocalDate = (str) => {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
};

export default function ITLogs() {
  // Search and Date Range Filter State (Default set to 'All time')
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('All time');

  // Custom Date Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customDateError, setCustomDateError] = useState('');

  // Pagination State (Strictly 20 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Real data state
  const [logsList, setLogsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Helper functions to format date (YYYY-MM-DD to MM/DD/YYYY) and timestamp (HH:mm:ss to hh:mm am/pm)
  const formatDateToSlash = (dateStr) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
  };

  const formatTimeTo12Hour = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  };

  // Load the real admin action logs from the backend (authenticated)
  const fetchLogs = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const response = await adminFetch(`${API_BASE}/api/itadmin/logs`);
      const data = await response.json();
      if (data.success) {
        setLogsList(Array.isArray(data.logs) ? data.logs : []);
        setLoadError('');
      } else {
        setLoadError(data.error || 'Failed to load action logs.');
      }
    } catch (err) {
      console.error('Failed to fetch admin logs:', err);
      setLoadError('Cannot reach the server. Please check that the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(true);
    const timer = setInterval(() => fetchLogs(false), REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  // Handle Date Range Filter Dropdown Change
  const handleDateFilterChange = (e) => {
    const val = e.target.value;
    if (val === 'Custom') {
      setShowCustomModal(true);
    } else {
      setDateRange(val);
      setCurrentPage(1);
    }
  };

  const todayMax = toLocalDateStr(new Date());

  // Custom Date Form Validation & Submission
  const handleApplyCustomDates = (e) => {
    e.preventDefault();

    if (startDate > todayMax || endDate > todayMax) {
      setCustomDateError('Error: Future dates are not allowed. Please select a valid past or current date range.');
      return;
    }

    if (startDate > endDate) {
      setCustomDateError('Error: Start date cannot be later than end date.');
      return;
    }

    setCustomDateError('');
    if (startDate && endDate) {
      setDateRange(`${startDate} to ${endDate}`);
      setShowCustomModal(false);
      setCurrentPage(1);
    }
  };

  // Robust date comparison helper matching YYYY-MM-DD log date against active dateRange filters
  const matchesDateFilter = (logDateStr) => {
    if (dateRange === 'All time' || !dateRange) {
      return true;
    }

    const logDate = parseLocalDate(logDateStr);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (dateRange === 'Today') {
      return logDate.getTime() === now.getTime();
    }

    if (dateRange === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return logDate.getTime() === yesterday.getTime();
    }

    const diffDays = Math.round((now - logDate) / (1000 * 60 * 60 * 24));

    if (dateRange === 'Last 7 days') {
      return diffDays >= 0 && diffDays <= 7;
    }

    if (dateRange === 'Last 30 days') {
      return diffDays >= 0 && diffDays <= 30;
    }

    if (dateRange.includes(' to ')) {
      const [startStr, endStr] = dateRange.split(' to ');
      const startDateObj = parseLocalDate(startStr);
      const endDateObj = parseLocalDate(endStr);
      endDateObj.setHours(23, 59, 59, 999);

      return logDate >= startDateObj && logDate <= endDateObj;
    }

    return true;
  };

  // Filtering logs across search query and active date range filter
  const filteredLogs = logsList.filter((log) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      String(log.logId || '').toLowerCase().includes(query) ||
      String(log.admin || '').toLowerCase().includes(query) ||
      String(log.action || '').toLowerCase().includes(query) ||
      String(log.duration || '').toLowerCase().includes(query) ||
      String(log.targetUser || '').toLowerCase().includes(query);

    const matchesDate = matchesDateFilter(log.date);

    return matchesSearch && matchesDate;
  });

  // Pagination Calculations (Strictly 20 rows per page)
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const indexOfLastRow = safePage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredLogs.slice(indexOfFirstRow, indexOfLastRow);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Helper for action badge coloring in the logs table
  const renderActionBadge = (action) => {
    let badgeColor = 'bg-theme-safe/20 text-theme-safe';
    if (String(action).toLowerCase() === 'suspended') {
      badgeColor = 'bg-theme-danger/20 text-theme-danger';
    } else if (String(action).toLowerCase() === 'warning') {
      badgeColor = 'bg-[#FFB703]/20 text-[#B38000]';
    }

    return (
      <span className={`font-pressstart text-[9px] px-2.5 py-1 rounded-[6px] inline-block ${badgeColor}`}>
        {action}
      </span>
    );
  };

  const emptyMessage = () => {
    if (isLoading) return 'Loading action logs...';
    if (loadError) return loadError;
    if (logsList.length === 0) return 'No admin actions have been recorded yet.';
    return 'No action logs found matching your search or filter criteria.';
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">

      {/* ROW 1: COMBINED SEARCH BAR AND DATE DROPDOWN IN A SINGLE RESPONSIVE ROW */}
      <div className="w-full flex flex-col md:flex-row items-center gap-3">

        {/* Search Bar Container */}
        <div className="w-full md:flex-1 flex items-center gap-3 bg-theme-surface border-2 border-theme-dark px-4 py-1 rounded-[12px] shadow-md">
          <svg className="w-6 h-6 text-theme-dark/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // reset to page 1 on search
            }}
            placeholder="Search by Log ID, Admin, Action, Duration, or Target User..."
            className="font-pixel text-[16px] sm:text-[20px] text-theme-dark bg-transparent outline-none w-full"
          />
        </div>

        {/* Date Range Dropdown + Refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={dateRange.includes(' to ') ? 'Custom' : dateRange}
            onChange={handleDateFilterChange}
            className="w-full md:w-auto bg-theme-surface border-2 border-theme-dark font-pixel text-[16px] sm:text-[20px] px-3.5 py-2 rounded-[12px] text-theme-dark outline-none cursor-pointer shadow-md hover:bg-theme-muted transition-colors"
          >
            <option value="All time">All time</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Last 7 days">Last 7 days</option>
            <option value="Last 30 days">Last 30 days</option>
            <option value="Custom">Custom</option>
          </select>

          <button
            type="button"
            onClick={() => fetchLogs(true)}
            title="Refresh logs"
            className="bg-theme-surface border-2 border-theme-dark px-3.5 py-2 rounded-[12px] text-theme-dark shadow-md hover:bg-theme-muted transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0 0 20 12M18.4 9A8 8 0 0 0 4 12" />
            </svg>
          </button>
        </div>

      </div>

      {/* SYSTEM LOGS DATA TABLE & LEDGER CONTAINER */}
      <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] shadow-md flex flex-col justify-between gap-6">

        {/* Table Wrapper */}
        <div className="overflow-x-auto w-full rounded-[12px]">
          <table className="w-full text-center border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-theme-muted border-b-2 border-theme-dark uppercase">
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">LOG ID</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">DATE</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">TIMESTAMP</th>
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">ADMIN</th>
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">TARGET USER</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">ACTION</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">DURATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-dark/10 font-pixel text-[15px] sm:text-[20px] text-theme-dark">
              {currentRows.length > 0 ? (
                currentRows.map((log) => (
                  <tr key={log.id} className="hover:bg-theme-muted/50 transition-colors">
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-primary text-left">{log.logId}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">{formatDateToSlash(log.date)}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">{formatTimeTo12Hour(log.timestamp)}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-left">{log.admin}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-left">{log.targetUser}</td>
                    <td className="py-3.5 px-3 text-center">{renderActionBadge(log.action)}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">
                      <span className={log.duration === 'N/A' ? 'text-theme-dark/70' : 'text-theme-danger'}>
                        {log.duration}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className={`py-12 text-center font-pixel text-lg ${loadError && !isLoading ? 'text-theme-danger' : 'text-theme-dark/60'}`}
                  >
                    {emptyMessage()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS (Strictly 20 Rows Per Page) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-theme-dark/10 p-4">
          <span className="font-pixel text-[14px] sm:text-[16px] text-theme-dark/80">
            Showing {filteredLogs.length > 0 ? indexOfFirstRow + 1 : 0}-{Math.min(indexOfLastRow, filteredLogs.length)} of {filteredLogs.length} logs
          </span>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* Previous Arrow Button */}
            <button
              type="button"
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage === 1}
              className="px-3 py-1.5 font-pressstart text-[10px] bg-theme-surface hover:bg-theme-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors rounded-[6px]"
            >
              &lt;
            </button>

            {/* Page Number Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePageChange(num)}
                className={`px-3 py-1.5 rounded-[6px] font-pressstart text-[9px] cursor-pointer transition-colors ${
                  safePage === num
                    ? 'bg-theme-primary text-white shadow-xs'
                    : 'bg-theme-surface text-theme-dark hover:bg-theme-muted'
                }`}
              >
                {num}
              </button>
            ))}

            {/* Next Arrow Button */}
            <button
              type="button"
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage === totalPages || totalPages === 0}
              className="px-3 py-1.5 font-pressstart text-[10px] bg-theme-surface hover:bg-theme-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors rounded-[6px]"
            >
              &gt;
            </button>
          </div>
        </div>

      </div>

      {/* CUSTOM DATE PICKER MODAL */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
            <h3 className="font-pressstart text-[12px] text-theme-dark">Select Custom Range</h3>
            <p className="font-pixel text-[13px] text-theme-dark">
              Choose a specific start date and end date to filter action logs.
            </p>

            <form onSubmit={handleApplyCustomDates} className="flex flex-col gap-3 mt-2">
              {customDateError && (
                <div className="bg-theme-danger/20 border-2 border-theme-danger p-3 rounded-[8px] text-theme-danger font-pixel text-[13px]">
                  {customDateError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-pressstart text-[9px] text-theme-dark">Start Date</label>
                <input
                  type="date"
                  required
                  max={todayMax}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCustomDateError('');
                  }}
                  className="bg-theme-muted border-2 border-theme-dark p-2 font-pixel text-sm rounded-[8px] outline-none text-theme-dark"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-pressstart text-[9px] text-theme-dark">End Date</label>
                <input
                  type="date"
                  required
                  max={todayMax}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCustomDateError('');
                  }}
                  className="bg-theme-muted border-2 border-theme-dark p-2 font-pixel text-sm rounded-[8px] outline-none text-theme-dark"
                />
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCustomDateError('');
                    setShowCustomModal(false);
                  }}
                  className="bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-theme-primary text-white border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow"
                >
                  Apply Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
