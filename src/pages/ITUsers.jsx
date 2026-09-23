// src/pages/ITUsers.jsx
import React, { useState } from 'react';

export default function ITUsers() {
  // Search and Filter State (Default dateRange set to 'All time')
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [dateRange, setDateRange] = useState('All time');

  // Custom Date Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customDateError, setCustomDateError] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Suspend Modal & Flow State
  const [userToSuspend, setUserToSuspend] = useState(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('Abusive Language');
  const [suspendDuration, setSuspendDuration] = useState('24 Hours / 1 Day');
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  
  // Success State
  const [suspendSuccessData, setSuspendSuccessData] = useState(null);

  // Clean Mock Users Data using a simple numeric 'daysAgo' property for easy filtering
  const [usersList, setUsersList] = useState([
    { id: 1, username: 'PixelCoder99', email: 'pixel99@studycircle.dev', status: 'Active', totalSessions: 42, lastActive: '10 mins ago', daysAgo: 0, flags: 0 },
    { id: 2, username: 'ShadowHacker', email: 'shadow@darkweb.io', status: 'Suspended', totalSessions: 5, lastActive: '2 days ago', daysAgo: 2, flags: 3 },
    { id: 3, username: 'SarahConnor', email: 'sarah.c@resistance.org', status: 'Active', totalSessions: 88, lastActive: '1 hour ago', daysAgo: 0, flags: 0 },
    { id: 4, username: 'AlexMorgan', email: 'alex.m@lofi.beats', status: 'Active', totalSessions: 24, lastActive: 'Just now', daysAgo: 0, flags: 1 },
    { id: 5, username: 'BadActor23', email: 'spammy23@gmail.com', status: 'Suspended', totalSessions: 12, lastActive: '3 hours ago', daysAgo: 0, flags: 4 },
    { id: 6, username: 'CodeNinja21', email: 'ninja@react.dev', status: 'Active', totalSessions: 110, lastActive: 'Yesterday', daysAgo: 1, flags: 0 },
    { id: 7, username: 'ChillStudent', email: 'chill@lounge.edu', status: 'Inactive', totalSessions: 15, lastActive: '2 weeks ago', daysAgo: 14, flags: 0 },
    { id: 8, username: 'AlgorithmMaps', email: 'algo@cs.edu', status: 'Active', totalSessions: 67, lastActive: '4 days ago', daysAgo: 4, flags: 0 },
    { id: 9, username: 'ByteCoder', email: 'byte@compiler.net', status: 'Active', totalSessions: 33, lastActive: '3 days ago', daysAgo: 3, flags: 0 },
    { id: 10, username: 'RetroGamer', email: 'retro@arcade.org', status: 'Inactive', totalSessions: 8, lastActive: '2 months ago', daysAgo: 60, flags: 0 },
    { id: 11, username: 'MathWhiz', email: 'math@calculus.org', status: 'Active', totalSessions: 95, lastActive: '30 mins ago', daysAgo: 0, flags: 0 },
    { id: 12, username: 'HistoryBuff', email: 'history@past.net', status: 'Active', totalSessions: 41, lastActive: '5 hours ago', daysAgo: 0, flags: 0 },
    { id: 13, username: 'PhysicsGeek', email: 'physics@quantum.edu', status: 'Active', totalSessions: 53, lastActive: 'Yesterday', daysAgo: 1, flags: 0 },
    { id: 14, username: 'ChemistryLab', email: 'chem@molecules.com', status: 'Inactive', totalSessions: 19, lastActive: '3 weeks ago', daysAgo: 21, flags: 0 },
    { id: 15, username: 'BioHacker', email: 'bio@dna.org', status: 'Suspended', totalSessions: 3, lastActive: '5 days ago', daysAgo: 5, flags: 2 },
    { id: 16, username: 'LiteratureFan', email: 'lit@books.io', status: 'Active', totalSessions: 77, lastActive: '12 mins ago', daysAgo: 0, flags: 0 },
    { id: 17, username: 'ArtStudent', email: 'art@canvas.design', status: 'Active', totalSessions: 29, lastActive: '1 hour ago', daysAgo: 0, flags: 0 },
    { id: 18, username: 'MusicComposer', email: 'music@melody.audio', status: 'Active', totalSessions: 64, lastActive: '45 mins ago', daysAgo: 0, flags: 0 },
    { id: 19, username: 'WebDevPro', email: 'web@frontend.dev', status: 'Active', totalSessions: 142, lastActive: 'Just now', daysAgo: 0, flags: 0 },
    { id: 20, username: 'DataScientist', email: 'data@python.ai', status: 'Active', totalSessions: 89, lastActive: '6 hours ago', daysAgo: 0, flags: 0 },
    { id: 21, username: 'CloudArchitect', email: 'cloud@aws.net', status: 'Inactive', totalSessions: 22, lastActive: '10 days ago', daysAgo: 10, flags: 0 },
    { id: 22, username: 'SecurityAnalyst', email: 'sec@infosec.org', status: 'Active', totalSessions: 104, lastActive: '15 mins ago', daysAgo: 0, flags: 0 },
    { id: 23, username: 'GameDevGuru', email: 'gamedev@unity.com', status: 'Active', totalSessions: 58, lastActive: '2 days ago', daysAgo: 2, flags: 0 },
    { id: 24, username: 'UIUXDesigner', email: 'design@figma.ux', status: 'Active', totalSessions: 45, lastActive: '50 mins ago', daysAgo: 0, flags: 0 },
    { id: 25, username: 'MobileDev', email: 'mobile@swift.app', status: 'Inactive', totalSessions: 11, lastActive: '2 months ago', daysAgo: 60, flags: 0 },
    { id: 26, username: 'DevOpsEngineer', email: 'devops@docker.io', status: 'Active', totalSessions: 71, lastActive: 'Yesterday', daysAgo: 1, flags: 0 },
    { id: 27, username: 'AITeacher', email: 'ai@neural.net', status: 'Active', totalSessions: 115, lastActive: '5 mins ago', daysAgo: 0, flags: 0 },
    { id: 28, username: 'RoboticsKid', email: 'robot@hardware.tech', status: 'Active', totalSessions: 38, lastActive: '4 hours ago', daysAgo: 0, flags: 0 },
    { id: 29, username: 'NetworkAdmin', email: 'net@cisco.org', status: 'Active', totalSessions: 82, lastActive: '20 mins ago', daysAgo: 0, flags: 0 },
    { id: 30, username: 'DatabaseGuru', email: 'sql@postgres.db', status: 'Suspended', totalSessions: 4, lastActive: '6 days ago', daysAgo: 6, flags: 3 },
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

  // Check if current view is Today to hide percentage trend indicators
  const isToday = dateRange === 'Today';

  // Dynamic Timeframe Mapping Logic Helper matching ITDashboard
  const getTimeframeLabel = () => {
    switch (dateRange) {
      case 'Yesterday':
        return 'vs. yesterday';
      case 'Last 7 days':
        return 'vs. last week';
      case 'Last 30 days':
        return 'vs. last month';
      default:
        if (dateRange.includes('to')) {
          return 'vs. previous period';
        }
        return 'vs. last week';
    }
  };

  // Mock User Metrics Data matching ITDashboard card structure
  const metricsData = {
    totalUsers: { value: '1,248', changeNum: '↑ 12%', positive: true },
    activeUsers: { value: '986', changeNum: '↑ 8%', positive: true },
    currentlyStudying: { value: '342', changeNum: '↑ 15%', positive: true },
    reportedUsers: { value: '10', changeNum: '↓ 4%', positive: false },
  };

  const todayMax = new Date().toISOString().split('T')[0];

  // Super simple numeric check using daysAgo!
  const matchesDateFilter = (daysAgo) => {
    if (dateRange === 'All time' || !dateRange) {
      return true;
    }

    if (dateRange === 'Today') {
      return daysAgo === 0;
    }

    if (dateRange === 'Yesterday') {
      return daysAgo === 1;
    }

    if (dateRange === 'Last 7 days') {
      return daysAgo <= 7;
    }

    if (dateRange === 'Last 30 days') {
      return daysAgo <= 30;
    }

    // For custom ranges, show all records gracefully
    return true;
  };

  // Filtering users based on search query, status filter, and simple daysAgo numeric check
  const filteredUsers = usersList.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'All Status' || user.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesDate = matchesDateFilter(user.daysAgo);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination Calculations (Strictly 20 rows per page)
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredUsers.slice(indexOfFirstRow, indexOfLastRow);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Suspend action confirmation & simulated backend flow handler
  const confirmSuspendUser = () => {
    if (userToSuspend) {
      const durationText = suspendDuration === 'Custom Date/Time' ? customDurationInput || 'Custom Duration' : suspendDuration;

      // Update user status in state list to 'Suspended'
      setUsersList((prev) =>
        prev.map((u) => (u.id === userToSuspend.id ? { ...u, status: 'Suspended' } : u))
      );

      // --- SIMULATED BACKEND ACTIONS ---
      console.log(`[Backend Simulation] Automated suspension email dispatched to ${userToSuspend.email}. Reason: ${suspendReason}, Duration: ${durationText}, Notes: ${internalNotes}`);
      console.log(`[Backend Simulation] User profile state for ID ${userToSuspend.id} flagged as active suspension.`);
      // ---------------------------------

      // Transition modal into Success State
      setSuspendSuccessData({
        username: userToSuspend.username,
        duration: durationText,
      });
    }
  };

  // Helper for status badge styling
  const renderUserStatusBadge = (status) => {
    let dotColor = 'bg-theme-safe';
    if (status.toLowerCase() === 'inactive') {
      dotColor = 'bg-theme-dark/40';
    } else if (status.toLowerCase() === 'suspended') {
      dotColor = 'bg-theme-danger';
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} inline-block shrink-0`} />
        <span className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">{status}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      
      {/* ROW 1: COMBINED SEARCH BAR AND DROPDOWNS IN A SINGLE RESPONSIVE ROW */}
      <div className="w-full flex flex-col md:flex-row items-center gap-3">
        
        {/* Search Bar Container (Height reduced to match dropdowns) */}
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
            placeholder="Search user..."
            className="font-pixel text-[16px] sm:text-[20px] text-theme-dark bg-transparent outline-none w-full"
          />
        </div>

        {/* Filters Group (Status & Date Dropdowns with Uniform Width) */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-48 bg-theme-surface border-2 border-theme-dark font-pixel text-[16px] sm:text-[20px] px-3.5 py-2 rounded-[12px] text-theme-dark outline-none cursor-pointer shadow-md hover:bg-theme-muted transition-colors"
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* Date Range Dropdown */}
          <select
            value={dateRange.includes('to') ? 'Custom' : dateRange}
            onChange={handleDateFilterChange}
            className="w-full md:w-48 bg-theme-surface border-2 border-theme-dark font-pixel text-[16px] sm:text-[20px] px-3.5 py-2 rounded-[12px] text-theme-dark outline-none cursor-pointer shadow-md hover:bg-theme-muted transition-colors"
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

      {/* ROW 2: 4 METRIC CARDS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: Total Users */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">TOTAL USERS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.totalUsers.value}</h3>
            {!isToday && dateRange !== 'All time' && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.totalUsers.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.totalUsers.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Active Users */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">ACTIVE USERS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.activeUsers.value}</h3>
            {!isToday && dateRange !== 'All time' && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.activeUsers.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.activeUsers.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: Currently Studying */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">CURRENTLY STUDYING</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.currentlyStudying.value}</h3>
            {!isToday && dateRange !== 'All time' && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.currentlyStudying.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.currentlyStudying.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Reported Users */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">REPORTED USERS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.reportedUsers.value}</h3>
            {!isToday && dateRange !== 'All time' && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.reportedUsers.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.reportedUsers.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* USER MANAGEMENT DATA TABLE & LEDGER CONTAINER */}
      <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] shadow-md flex flex-col justify-between gap-6">
        
        {/* Table Wrapper */}
        <div className="overflow-x-auto w-full rounded-[12px]">
          <table className="w-full text-center border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-theme-muted border-b-2 border-theme-dark uppercase">
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">USERNAME</th>
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">EMAIL</th>
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">STATUS</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">TOTAL SESSIONS</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">LAST ACTIVE</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">FLAGS</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-dark/10 font-pixel text-[15px] sm:text-[18px] text-theme-dark">
              {currentRows.length > 0 ? (
                currentRows.map((user) => (
                  <tr key={user.id} className="hover:bg-theme-muted/50 transition-colors">
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-left">{user.username}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark truncate max-w-[200px] text-left">{user.email}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-left">
                      <div className="inline-flex w-full">{renderUserStatusBadge(user.status)}</div>
                    </td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">{user.totalSessions}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">{user.lastActive}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">
                      <span className={`font-pixel text-[15px] sm:text-[20px] rounded-[4px] inline-block ${user.flags > 0 ? 'text-theme-danger' : 'text-theme-dark'}`}>
                        {user.flags}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">
                      <div className="flex justify-center w-full">
                        {user.status.toLowerCase() !== 'suspended' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUserToSuspend(user);
                              setSuspendReason('Abusive Language');
                              setSuspendDuration('24 Hours / 1 Day');
                              setCustomDurationInput('');
                              setInternalNotes('');
                              setSuspendSuccessData(null);
                              setShowSuspendModal(true);
                            }}
                            className="font-pixel font-normal text-[15px] sm:text-[18px] bg-theme-danger text-white px-3.5 py-1 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer"
                          >
                            Suspend
                          </button>
                        ) : (
                          <span className="font-pixel font-normal text-[15px] sm:text-[18px] text-theme-danger italic">Suspended</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center font-pixel text-lg text-theme-dark/60">
                    No users found matching your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-theme-dark/10 p-4">
          <span className="font-pixel text-[14px] sm:text-[16px] text-theme-dark/80">
            Showing {filteredUsers.length > 0 ? indexOfFirstRow + 1 : 0}-{Math.min(indexOfLastRow, filteredUsers.length)} of {filteredUsers.length} users
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

      {/* SUSPEND USER CONFIRMATION MODAL & SUCCESS STATE */}
      {showSuspendModal && userToSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-lg w-full shadow-xl flex flex-col">
            
            {!suspendSuccessData ? (
              <>
                {/* Modal Header with Warning Icon */}
                <div className="flex items-center border-b-2 border-theme-dark/10 pb-3">
                  <div className="w-7 h-7 rounded-full text-theme-danger flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                  </div>
                  <h3 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">
                    CONFIRM SUSPENSION
                  </h3>
                </div>

                <p className="font-pixel text-[18px] sm:text-[24px] text-theme-dark">
                  Target User: <span className="text-theme-primary">{userToSuspend.username}</span>
                </p>

                {/* Form Fields Container */}
                <div className="flex flex-col gap-3">
                  
                  {/* Reason Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="font-pixel text-[18px] sm:text-[24px] text-theme-dark">Reason:</label>
                    <select
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      className="bg-theme-surface border-2 border-theme-dark p-2.5 font-pixel text-[15px] sm:text-[18px] rounded-[8px] outline-none text-theme-dark cursor-pointer"
                    >
                      <option value="Abusive Language">Abusive Language</option>
                      <option value="Off-topic spamming">Off-topic spamming</option>
                      <option value="Hate speech">Hate speech</option>
                      <option value="Adult content">Adult content</option>
                      <option value="Harassment">Harassment</option>
                      <option value="Sharing personal information">Sharing personal information</option>
                      <option value="Repeat offender">Repeat offender</option>
                    </select>
                  </div>

                  {/* Duration Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="font-pixel text-[18px] sm:text-[24px] text-theme-dark">Suspension Duration:</label>
                    <select
                      value={suspendDuration}
                      onChange={(e) => setSuspendDuration(e.target.value)}
                      className="bg-theme-surface border-2 border-theme-dark p-2.5 font-pixel text-[15px] sm:text-[18px] rounded-[8px] outline-none text-theme-dark cursor-pointer"
                    >
                      <option value="24 Hours / 1 Day">24 Hours / 1 Day</option>
                      <option value="3 Days">3 Days</option>
                      <option value="7 Days / 1 Week">7 Days / 1 Week</option>
                      <option value="14 Days / 2 Weeks">14 Days / 2 Weeks</option>
                      <option value="30 Days / 1 Month">30 Days / 1 Month</option>
                      <option value="90 Days / 3 Months">90 Days / 3 Months</option>
                      <option value="Permanent / Indefinite">Permanent / Indefinite</option>
                      <option value="Custom Date/Time">Custom Date/Time</option>
                    </select>
                  </div>

                  {/* Additional Input Field if Custom Date/Time is selected */}
                  {suspendDuration === 'Custom Date/Time' && (
                    <div className="flex flex-col gap-1 animate-fadeIn">
                      <label className="font-pixel text-[18px] sm:text-[24px] text-theme-dark">Custom Expiration Datetime</label>
                      <input
                        type="datetime-local"
                        value={customDurationInput}
                        onChange={(e) => setCustomDurationInput(e.target.value)}
                        className="bg-theme-surface border-2 border-theme-dark p-2 font-pixel text-[15px] sm:text-[18px] rounded-[8px] outline-none text-theme-dark"
                      />
                    </div>
                  )}

                  {/* Internal Notes Textarea */}
                  <div className="flex flex-col gap-1">
                    <label className="font-pixel text-[18px] sm:text-[24px] text-theme-dark">Internal Notes:</label>
                    <textarea
                      rows="3"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Type optional moderator context or warning details..."
                      className="bg-theme-muted border-2 border-theme-dark p-2.5 font-pixel text-[15px] sm:text-[18px] rounded-[8px] outline-none text-theme-dark resize-none"
                    ></textarea>
                  </div>

                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center mt-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuspendModal(false);
                      setUserToSuspend(null);
                    }}
                    className="bg-[#E87339] text-white border-2 border-theme-dark px-4 py-2.5 rounded-[8px] font-pressstart text-[9px] cursor-pointer transition-all duration-150 retro-shadow"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={confirmSuspendUser}
                    className="bg-[#8B0000] text-white border-2 border-theme-dark px-4 py-2.5 rounded-[8px] font-pressstart text-[9px] cursor-pointer transition-all duration-150 retro-shadow"
                  >
                    CONFIRM
                  </button>
                </div>
              </>
            ) : (
              /* SUCCESS STATE POP-UP */
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-theme-safe text-white flex items-center justify-center shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-8 h-8">
                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" />
                  </svg>
                </div>

                <h3 className="font-pressstart text-[14px] sm:text-[20px] text-theme-dark uppercase">
                  SUCCESS
                </h3>

                <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">
                  User <span className="text-theme-primary">{suspendSuccessData.username}</span> has been suspended for {suspendSuccessData.duration}.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShowSuspendModal(false);
                    setUserToSuspend(null);
                    setSuspendSuccessData(null);
                  }}
                  className="bg-theme-primary text-white border-2 border-theme-dark px-6 py-2.5 rounded-[8px] font-pressstart text-[10px] cursor-pointer retro-shadow mt-2"
                >
                  DONE
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CUSTOM DATE PICKER MODAL */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
            <h3 className="font-pressstart text-[12px] text-theme-dark">Select Custom Range</h3>
            <p className="font-pixel text-[13px] text-theme-dark">
              Choose a specific start date and end date to filter metrics.
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