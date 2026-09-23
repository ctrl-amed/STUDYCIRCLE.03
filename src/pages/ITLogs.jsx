// src/pages/ITLogs.jsx
import React, { useState } from 'react';

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

  // Comprehensive Mock Admin Action Logs Data with a healthy distribution relative to current date (2026-09-23)
  const [logsList, setLogsList] = useState([
    { id: 1, logId: 'LOG-1001', date: '2026-09-23', timestamp: '14:30:12', admin: 'AdminSarah', targetUser: 'PixelCoder99', action: 'Dismissed', duration: 'N/A' },
    { id: 2, logId: 'LOG-1002', date: '2026-09-23', timestamp: '13:15:45', admin: 'AdminAlex', targetUser: 'ShadowHacker', action: 'Suspended', duration: '7 Days' },
    { id: 3, logId: 'LOG-1003', date: '2026-09-22', timestamp: '11:05:30', admin: 'AdminMike', targetUser: 'BadActor23', action: 'Suspended', duration: '30 Days' },
    { id: 4, logId: 'LOG-1004', date: '2026-09-22', timestamp: '10:20:00', admin: 'AdminSarah', targetUser: 'ChillStudent', action: 'Warning', duration: 'N/A' },
    { id: 5, logId: 'LOG-1005', date: '2026-09-21', timestamp: '18:45:10', admin: 'AdminAlex', targetUser: 'BioHacker', action: 'Suspended', duration: 'Permanent' },
    { id: 6, logId: 'LOG-1006', date: '2026-09-21', timestamp: '16:12:33', admin: 'AdminDave', targetUser: 'CodeNinja21', action: 'Dismissed', duration: 'N/A' },
    { id: 7, logId: 'LOG-1007', date: '2026-09-20', timestamp: '14:00:22', admin: 'AdminSarah', targetUser: 'DatabaseGuru', action: 'Suspended', duration: '14 Days' },
    { id: 8, logId: 'LOG-1008', date: '2026-09-19', timestamp: '12:30:50', admin: 'AdminMike', targetUser: 'RetroGamer', action: 'Warning', duration: 'N/A' },
    { id: 9, logId: 'LOG-1009', date: '2026-09-18', timestamp: '15:10:11', admin: 'AdminAlex', targetUser: 'SpammerX', action: 'Suspended', duration: '24 Hours' },
    { id: 10, logId: 'LOG-1010', date: '2026-09-18', timestamp: '11:20:05', admin: 'AdminDave', targetUser: 'MathWhiz', action: 'Dismissed', duration: 'N/A' },
    { id: 11, logId: 'LOG-1011', date: '2026-09-17', timestamp: '09:45:30', admin: 'AdminSarah', targetUser: 'HistoryBuff', action: 'Dismissed', duration: 'N/A' },
    { id: 12, logId: 'LOG-1012', date: '2026-09-16', timestamp: '17:30:00', admin: 'AdminMike', targetUser: 'TrollMaster', action: 'Suspended', duration: '7 Days' },
    { id: 13, logId: 'LOG-1013', date: '2026-09-15', timestamp: '14:15:22', admin: 'AdminAlex', targetUser: 'PhysicsGeek', action: 'Dismissed', duration: 'N/A' },
    { id: 14, logId: 'LOG-1014', date: '2026-09-14', timestamp: '10:05:12', admin: 'AdminDave', targetUser: 'ChemistryLab', action: 'Warning', duration: 'N/A' },
    { id: 15, logId: 'LOG-1015', date: '2026-09-10', timestamp: '16:50:40', admin: 'AdminSarah', targetUser: 'AbusiveUser99', action: 'Suspended', duration: '30 Days' },
    { id: 16, logId: 'LOG-1016', date: '2026-09-08', timestamp: '13:20:15', admin: 'AdminMike', targetUser: 'LiteratureFan', action: 'Dismissed', duration: 'N/A' },
    { id: 17, logId: 'LOG-1017', date: '2026-09-05', timestamp: '11:10:00', admin: 'AdminAlex', targetUser: 'ArtStudent', action: 'Warning', duration: 'N/A' },
    { id: 18, logId: 'LOG-1018', date: '2026-09-03', timestamp: '15:40:50', admin: 'AdminDave', targetUser: 'MusicComposer', action: 'Dismissed', duration: 'N/A' },
    { id: 19, logId: 'LOG-1019', date: '2026-09-01', timestamp: '12:00:33', admin: 'AdminSarah', targetUser: 'BadBot01', action: 'Suspended', duration: 'Permanent' },
    { id: 20, logId: 'LOG-1020', date: '2026-09-01', timestamp: '08:30:10', admin: 'AdminMike', targetUser: 'WebDevPro', action: 'Dismissed', duration: 'N/A' },
    { id: 21, logId: 'LOG-1021', date: '2026-08-25', timestamp: '16:22:11', admin: 'AdminAlex', targetUser: 'DataScientist', action: 'Dismissed', duration: 'N/A' },
    { id: 22, logId: 'LOG-1022', date: '2026-08-20', timestamp: '14:11:05', admin: 'AdminDave', targetUser: 'CloudArchitect', action: 'Warning', duration: 'N/A' },
    { id: 23, logId: 'LOG-1023', date: '2026-08-15', timestamp: '10:00:00', admin: 'AdminSarah', targetUser: 'SecurityAnalyst', action: 'Dismissed', duration: 'N/A' },
    { id: 24, logId: 'LOG-1024', date: '2026-08-10', timestamp: '15:33:40', admin: 'AdminMike', targetUser: 'GameDevGuru', action: 'Suspended', duration: '3 Days' },
    { id: 25, logId: 'LOG-1025', date: '2026-08-01', timestamp: '11:15:20', admin: 'AdminAlex', targetUser: 'UIUXDesigner', action: 'Dismissed', duration: 'N/A' },
  ]);

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

  // Custom Date Form Validation & Submission
  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];

    if (startDate > todayStr || endDate > todayStr) {
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

  const todayMax = new Date().toISOString().split('T')[0];

  // Robust date comparison helper matching YYYY-MM-DD log date against active dateRange filters
  const matchesDateFilter = (logDateStr) => {
    if (dateRange === 'All time' || !dateRange) {
      return true;
    }

    const logDate = new Date(logDateStr);
    logDate.setHours(0, 0, 0, 0);

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

    const diffTime = now - logDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (dateRange === 'Last 7 days') {
      return diffDays >= 0 && diffDays <= 7;
    }

    if (dateRange === 'Last 30 days') {
      return diffDays >= 0 && diffDays <= 30;
    }

    if (dateRange.includes('to')) {
      const [startStr, endStr] = dateRange.split(' to ');
      const startDateObj = new Date(startStr);
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = new Date(endStr);
      endDateObj.setHours(23, 59, 59, 999);

      return logDate >= startDateObj && logDate <= endDateObj;
    }

    return true;
  };

  // Filtering logs across search query and active date range filter
  const filteredLogs = logsList.filter((log) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      log.logId.toLowerCase().includes(query) ||
      log.admin.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.duration.toLowerCase().includes(query) ||
      log.targetUser.toLowerCase().includes(query);

    const matchesDate = matchesDateFilter(log.date);

    return matchesSearch && matchesDate;
  });

  // Pagination Calculations (Strictly 20 rows per page)
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
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
    if (action.toLowerCase() === 'suspended') {
      badgeColor = 'bg-theme-danger/20 text-theme-danger';
    } else if (action.toLowerCase() === 'warning') {
      badgeColor = 'bg-[#FFB703]/20 text-[#B38000]';
    }

    return (
      <span className={`font-pressstart text-[9px] px-2.5 py-1 rounded-[6px] inline-block ${badgeColor}`}>
        {action}
      </span>
    );
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

        {/* Date Range Dropdown Container */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={dateRange.includes('to') ? 'Custom' : dateRange}
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
                  <td colSpan="7" className="py-12 text-center font-pixel text-lg text-theme-dark/60">
                    No action logs found matching your search or filter criteria.
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
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
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
                  currentPage === num
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
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
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