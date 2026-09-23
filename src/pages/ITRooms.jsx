// src/pages/ITRooms.jsx
import React, { useState } from 'react';

export default function ITRooms() {
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

  // Close Room Modal & Flow State
  const [roomToClose, setRoomToClose] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState('Explicit room name');
  const [internalNotes, setInternalNotes] = useState('');
  
  // Success State
  const [closeSuccessData, setCloseSuccessData] = useState(null);

  // Comprehensive Mock Rooms Data with a healthy distribution of dateCreated values
  const [roomsList, setRoomsList] = useState([
    { id: 1, roomName: 'Chill & Lofi Beats', host: 'AlexMorgan', status: 'Active', privacy: 'Public', dateCreated: '09/23/2026', capacity: 4 },
    { id: 2, roomName: 'Advanced React Algorithms', host: 'PixelCoder99', status: 'Active', privacy: 'Public', dateCreated: '09/23/2026', capacity: 2 },
    { id: 3, roomName: 'Late Night Study Grinds', host: 'SarahConnor', status: 'Inactive', privacy: 'Private', dateCreated: '09/22/2026', capacity: 5 },
    { id: 4, roomName: 'Quiet Study Sanctuary', host: 'CodeNinja21', status: 'Active', privacy: 'Public', dateCreated: '09/22/2026', capacity: 3 },
    { id: 5, roomName: 'Math Calculus Mastery', host: 'MathWhiz', status: 'Inactive', privacy: 'Private', dateCreated: '09/20/2026', capacity: 1 },
    { id: 6, roomName: 'Quantum Physics Hub', host: 'PhysicsGeek', status: 'Active', privacy: 'Public', dateCreated: '09/23/2026', capacity: 6 },
    { id: 7, roomName: 'Data Structures & Trees', host: 'AlgorithmMaps', status: 'Active', privacy: 'Public', dateCreated: '09/21/2026', capacity: 4 },
    { id: 8, roomName: 'WebDev Frontend Sprint', host: 'WebDevPro', status: 'Active', privacy: 'Public', dateCreated: '09/18/2026', capacity: 2 },
    { id: 9, roomName: 'UI/UX Critique Lounge', host: 'UIUXDesigner', status: 'Inactive', privacy: 'Private', dateCreated: '09/22/2026', capacity: 5 },
    { id: 10, roomName: 'Cybersecurity CTF Prep', host: 'SecurityAnalyst', status: 'Active', privacy: 'Public', dateCreated: '09/19/2026', capacity: 3 },
    { id: 11, roomName: 'Game Dev Unity Hangout', host: 'GameDevGuru', status: 'Active', privacy: 'Public', dateCreated: '09/23/2026', capacity: 1 },
    { id: 12, roomName: 'Python AI & Neural Nets', host: 'AITeacher', status: 'Active', privacy: 'Public', dateCreated: '09/15/2026', capacity: 6 },
    { id: 13, roomName: 'Database Architecture', host: 'DatabaseGuru', status: 'Suspended', privacy: 'Private', dateCreated: '09/01/2026', capacity: 4 },
    { id: 14, roomName: 'System Administration Lab', host: 'NetworkAdmin', status: 'Active', privacy: 'Public', dateCreated: '09/23/2026', capacity: 2 },
    { id: 15, roomName: 'Docker & Kubernetes Ops', host: 'DevOpsEngineer', status: 'Active', privacy: 'Public', dateCreated: '09/20/2026', capacity: 5 },
    { id: 16, roomName: 'Mobile App Swift Jam', host: 'MobileDev', status: 'Inactive', privacy: 'Private', dateCreated: '09/10/2026', capacity: 3 },
    { id: 17, roomName: 'Embedded Systems & IoT', host: 'RoboticsKid', status: 'Active', privacy: 'Public', dateCreated: '09/22/2026', capacity: 1 },
    { id: 18, roomName: 'Cloud Computing AWS/GCP', host: 'CloudArchitect', status: 'Active', privacy: 'Public', dateCreated: '09/05/2026', capacity: 6 },
    { id: 19, roomName: 'Digital Art & Canvas', host: 'ArtStudent', status: 'Inactive', privacy: 'Public', dateCreated: '09/17/2026', capacity: 4 },
    { id: 20, roomName: 'Lo-Fi Literature Reading', host: 'LiteratureFan', status: 'Active', privacy: 'Public', dateCreated: '09/23/2026', capacity: 2 },
    { id: 21, roomName: 'Music Theory & Chords', host: 'MusicComposer', status: 'Active', privacy: 'Public', dateCreated: '09/21/2026', capacity: 5 },
    { id: 22, roomName: 'Organic Chemistry Review', host: 'ChemistryLab', status: 'Inactive', privacy: 'Private', dateCreated: '08/28/2026', capacity: 3 },
    { id: 23, roomName: 'World History Debates', host: 'HistoryBuff', status: 'Active', privacy: 'Public', dateCreated: '09/23/2026', capacity: 1 },
    { id: 24, roomName: 'Bioinformatics & DNA', host: 'BioHacker', status: 'Suspended', privacy: 'Private', dateCreated: '09/02/2026', capacity: 6 },
    { id: 25, roomName: 'Arcade Retro Coding', host: 'RetroGamer', status: 'Inactive', privacy: 'Public', dateCreated: '09/12/2026', capacity: 4 },
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

  // Dynamic Timeframe Mapping Logic Helper matching ITDashboard & ITUsers
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

  // Mock Room Metrics Data adapted for Room Management
  const metricsData = {
    totalRooms: { value: '48', changeNum: '↑ 10%', positive: true },
    activeRooms: { value: '34', changeNum: '↑ 5%', positive: true },
    inactiveRooms: { value: '14', changeNum: '↓ 2%', positive: false },
    reportedRooms: { value: '3', changeNum: '↓ 25%', positive: true },
  };

  const todayMax = new Date().toISOString().split('T')[0];

  // Robust date comparison helper matching MM/DD/YYYY room dateCreated against dateRange filters
  const matchesDateFilter = (dateCreatedStr) => {
    if (dateRange === 'All time' || !dateRange) {
      return true;
    }

    const [month, day, year] = dateCreatedStr.split('/');
    const roomDate = new Date(`${year}-${month}-${day}`);
    roomDate.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (dateRange === 'Today') {
      return roomDate.getTime() === now.getTime();
    }

    if (dateRange === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return roomDate.getTime() === yesterday.getTime();
    }

    const diffTime = now - roomDate;
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

      return roomDate >= startDateObj && roomDate <= endDateObj;
    }

    return true;
  };

  // Filtering rooms based on search query, status filter, and dateCreated filter
  const filteredRooms = roomsList.filter((room) => {
    const matchesSearch =
      room.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.host.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'All Status' || room.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesDate = matchesDateFilter(room.dateCreated);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination Calculations (Strictly 20 rows per page)
  const totalPages = Math.ceil(filteredRooms.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredRooms.slice(indexOfFirstRow, indexOfLastRow);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Close Room action confirmation & simulated backend flow handler
  const confirmCloseRoom = () => {
    if (roomToClose) {
      // Update room status in state list to 'Suspended' or 'Closed'
      setRoomsList((prev) =>
        prev.map((r) => (r.id === roomToClose.id ? { ...r, status: 'Suspended' } : r))
      );

      // --- SIMULATED BACKEND ACTIONS ---
      console.log(`[Backend Simulation] Automated room closure email dispatched to host ${roomToClose.host} for room "${roomToClose.roomName}". Reason: ${closeReason}, Notes: ${internalNotes}`);
      console.log(`[Backend Simulation] Restriction modal triggered for host ${roomToClose.host}; active session for room ID ${roomToClose.id} terminated immediately.`);
      // ---------------------------------

      // Transition modal into Success State
      setCloseSuccessData({
        roomName: roomToClose.roomName,
        host: roomToClose.host,
      });
    }
  };

  // Helper for status badge styling
  const renderRoomStatusBadge = (status) => {
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
            placeholder="Search room by room..."
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
        
        {/* CARD 1: Total Rooms */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 4h14q.425 0 .713.288T20 5t-.288.713T19 6H5q-.425 0-.712-.288T4 5t.288-.712T5 4m0 16q-.425 0-.712-.288T4 19v-5h-.175q-.475 0-.775-.363t-.2-.837l1-5q.075-.35.35-.575T4.825 7h14.35q.35 0 .625.225t.35.575l1 5q.1.475-.2.837t-.775.363H20v5q0 .425-.288.713T13 20zm1-2h6v-4H6zm-.95-6h13.9zm0 0h13.9l-.6-3H5.65z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">TOTAL ROOMS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.totalRooms.value}</h3>
            {!isToday && dateRange !== 'All time' && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.totalRooms.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.totalRooms.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Active Rooms */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">ACTIVE ROOMS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.activeRooms.value}</h3>
            {!isToday && dateRange !== 'All time' && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.activeRooms.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.activeRooms.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: Inactive Rooms */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">INACTIVE ROOMS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.inactiveRooms.value}</h3>
            {!isToday && dateRange !== 'All time' && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.inactiveRooms.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.inactiveRooms.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Reported Rooms */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">REPORTED ROOMS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.reportedRooms.value}</h3>
            {!isToday && dateRange !== 'All time' && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.reportedRooms.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.reportedRooms.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ROOM MANAGEMENT DATA TABLE & LEDGER CONTAINER */}
      <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] shadow-md flex flex-col justify-between gap-6">
        
        {/* Table Wrapper */}
        <div className="overflow-x-auto w-full rounded-[12px]">
          <table className="w-full text-center border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-theme-muted border-b-2 border-theme-dark uppercase">
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">ROOM NAME</th>
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">HOST</th>
                <th className="py-3 px-3 text-left font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">STATUS</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">PRIVACY</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">DATE CREATED</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">CAPACITY</th>
                <th className="py-3 px-3 text-center font-pixel font-normal text-[18px] sm:text-[24px] text-theme-dark">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-dark/10 font-pixel text-[15px] sm:text-[18px] text-theme-dark">
              {currentRows.length > 0 ? (
                currentRows.map((room) => (
                  <tr key={room.id} className="hover:bg-theme-muted/50 transition-colors">
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-left">{room.roomName}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark truncate max-w-[200px] text-left">{room.host}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-left">
                      <div className="inline-flex w-full">{renderRoomStatusBadge(room.status)}</div>
                    </td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">
                      <span className="font-pixel text-[15px] sm:text-[20px] px-2 py-1">
                        {room.privacy}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">{room.dateCreated}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center font-pressstart text-[11px]">{room.capacity}</td>
                    <td className="py-3.5 px-3 font-pixel text-[15px] sm:text-[20px] text-theme-dark text-center">
                      <div className="flex justify-center w-full">
                        {room.status.toLowerCase() !== 'suspended' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRoomToClose(room);
                              setCloseReason('Explicit room name');
                              setInternalNotes('');
                              setCloseSuccessData(null);
                              setShowCloseModal(true);
                            }}
                            className="font-pixel font-normal text-[15px] sm:text-[18px] bg-theme-danger text-white px-3.5 py-1 rounded-[8px] transition-all duration-150 retro-shadow cursor-pointer"
                          >
                            Close Room
                          </button>
                        ) : (
                          <span className="font-pixel font-normal text-[15px] sm:text-[18px] text-theme-danger italic">Closed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center font-pixel text-lg text-theme-dark/60">
                    No rooms found matching your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-theme-dark/10 p-4">
          <span className="font-pixel text-[14px] sm:text-[16px] text-theme-dark/80">
            Showing {filteredRooms.length > 0 ? indexOfFirstRow + 1 : 0}-{Math.min(indexOfLastRow, filteredRooms.length)} of {filteredRooms.length} rooms
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

      {/* CLOSE ROOM CONFIRMATION MODAL & SUCCESS STATE */}
      {showCloseModal && roomToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-lg w-full shadow-xl flex flex-col">
            
            {!closeSuccessData ? (
              <>
                {/* Modal Header with Warning Icon */}
                <div className="flex items-center border-b-2 border-theme-dark/10 pb-3">
                  <div className="w-7 h-7 rounded-full text-theme-danger flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                  </div>
                  <h3 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">
                    CONFIRM ROOM CLOSURE
                  </h3>
                </div>

                <p className="font-pixel text-[18px] sm:text-[24px] text-theme-dark mt-3">
                  Target Room: <span className="text-theme-primary">{roomToClose.roomName}</span> (Host: {roomToClose.host})
                </p>

                {/* Form Fields Container */}
                <div className="flex flex-col gap-3 mt-3">
                  
                  {/* Reason Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="font-pixel text-[18px] sm:text-[24px] text-theme-dark">Reason:</label>
                    <select
                      value={closeReason}
                      onChange={(e) => setCloseReason(e.target.value)}
                      className="bg-theme-surface border-2 border-theme-dark p-2.5 font-pixel text-[15px] sm:text-[18px] rounded-[8px] outline-none text-theme-dark cursor-pointer"
                    >
                      <option value="Explicit room name">Explicit room name</option>
                      <option value="Cyberbullying space">Cyberbullying space</option>
                      <option value="Off-topic noise">Off-topic noise</option>
                      <option value="Promoting illegal">Promoting illegal</option>
                      <option value="Repeated room violation">Repeated room violation</option>
                    </select>
                  </div>

                  {/* Additional Notes Textarea */}
                  <div className="flex flex-col gap-1">
                    <label className="font-pixel text-[18px] sm:text-[24px] text-theme-dark">Additional Notes:</label>
                    <textarea
                      rows="3"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Type optional admin comments or context..."
                      className="bg-theme-muted border-2 border-theme-dark p-2.5 font-pixel text-[15px] sm:text-[18px] rounded-[8px] outline-none text-theme-dark resize-none"
                    ></textarea>
                  </div>

                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center mt-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCloseModal(false);
                      setRoomToClose(null);
                    }}
                    className="bg-[#E87339] text-white border-2 border-theme-dark px-4 py-2.5 rounded-[8px] font-pressstart text-[9px] cursor-pointer transition-all duration-150 retro-shadow"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={confirmCloseRoom}
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
                  Room <span className="text-theme-primary">{closeSuccessData.roomName}</span> (Host: {closeSuccessData.host}) has been successfully closed.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShowCloseModal(false);
                    setRoomToClose(null);
                    setCloseSuccessData(null);
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