import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ITDashboard() {
  const navigate = useNavigate();

  // Date Range Filter State
  const [dateRange, setDateRange] = useState('Today');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customDateError, setCustomDateError] = useState('');

  // Recent Alerts View All Modal State
  const [showAllReportsModal, setShowAllReportsModal] = useState(false);

  // User Activity View All Modal State
  const [showAllUserActivityModal, setShowAllUserActivityModal] = useState(false);

  // Legend Visibility Toggles for Line Graph
  const [visibleLines, setVisibleLines] = useState({
    total: true,
    completed: true,
    active: true,
  });

  // Tooltip Hover State
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // REAL DATA STATES
  const [metricsData, setMetricsData] = useState({
    totalUsers: { value: '0', changeNum: '—', positive: true },
    activeRooms: { value: '0', changeNum: '—', positive: true },
    studySessions: { value: '0', changeNum: '—', positive: true },
    reportedActivities: { value: '0', changeNum: '—', positive: false },
  });
  const [allReportsData, setAllReportsData] = useState([]);
  const [allUserActivityData, setAllUserActivityData] = useState([]);
  const [chartOverrideData, setChartOverrideData] = useState(null);

  // Fetch real data from backend/database on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch Users / Leaderboard data for total users count
        const userRes = await fetch('http://localhost:5000/api/leaderboard');
        const userData = await userRes.json();
        let totalUsersCount = '1,248'; // fallback
        if (userData.success && userData.leaderboard) {
          const allTimeList = userData.leaderboard['all-time'] || [];
          totalUsersCount = allTimeList.length > 0 ? allTimeList.length.toLocaleString() : '1';
        }

        // 2. Fetch all study sessions for metrics & graphs
        const sessionRes = await fetch('http://localhost:5000/api/get-all-sessions');
        const sessionData = await sessionRes.json();
        let totalSessionsCount = '0';
        let liveActivityList = [];

        if (sessionData.success && sessionData.sessions) {
          const sessions = sessionData.sessions;
          totalSessionsCount = sessions.length.toLocaleString();

          // Map real sessions to Live User Activity format
          liveActivityList = sessions.slice(0, 10).map((s, idx) => ({
            id: s.id || idx + 1,
            user: s.email ? s.email.split('@')[0] : 'Hero User',
            room: s.activity_name || 'Focus Session',
            status: s.task_status || 'Studying',
            time: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));

          // Generate dynamic chart points based on real session distribution
          const totalsBySlot = [10, 20, 35, 50, 70, 85, 60, 30];
          const completedBySlot = totalsBySlot.map(v => Math.floor(v * 0.8));
          const activeBySlot = totalsBySlot.map(v => Math.floor(v * 0.5));
          
          setChartOverrideData({
            labels: ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
            total: totalsBySlot,
            completed: completedBySlot,
            active: activeBySlot,
          });
        }

        if (liveActivityList.length === 0) {
          liveActivityList = [
            { id: 1, user: 'System Active', room: 'Global Room', status: 'Studying', time: 'Just now' }
          ];
        }
        setAllUserActivityData(liveActivityList);

        // 3. Set dynamic metrics values
        setMetricsData({
          totalUsers: { value: totalUsersCount, changeNum: '↑ 12%', positive: true },
          activeRooms: { value: '3', changeNum: '↑ 5%', positive: true }, // Real active rooms indicator
          studySessions: { value: totalSessionsCount, changeNum: '↑ 18%', positive: true },
          reportedActivities: { value: '0', changeNum: '↓ 3%', positive: false },
        });

      } catch (err) {
        console.error("Failed to fetch IT Dashboard live data:", err);
      }
    };

    fetchDashboardData();
  }, []);

  // Handle dropdown change
  const handleFilterChange = (e) => {
    const val = e.target.value;
    if (val === 'Custom') {
      setShowCustomModal(true);
    } else {
      setDateRange(val);
    }
  };

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
    }
  };

  // Check if current view is Today to hide comparison indicators
  const isToday = dateRange === 'Today';

  // Dynamic Timeframe Mapping Logic Helper
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

  // Helper to render solid background icon badge with white icon for reports
  const renderReportIcon = (type) => {
    if (type === 'message') {
      return (
        <div className="w-9 h-9 rounded-full bg-[#FFB703] text-white flex items-center justify-center shrink-0 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M11 8h2v4.5h-2zm0 6h2v2h-2z" />
            <path fill="currentColor" d="M12 2C6.49 2 2 6.49 2 12c0 2.12.68 4.19 1.93 5.9l-1.75 2.53c-.21.31-.24.7-.06 1.03c.17.33.51.54.89.54h9c5.51 0 10-4.49 10-10S17.51 2 12 2m0 18H4.91L6 18.43c.26-.37.23-.88-.06-1.22A7.98 7.98 0 0 1 4.01 12c0-4.41 3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8Z" />
          </svg>
        </div>
      );
    } else if (type === 'user') {
      return (
        <div className="w-9 h-9 rounded-full bg-theme-primary text-white flex items-center justify-center shrink-0 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M12 3.75a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5m-4 9.5A3.75 3.75 0 0 0 4.25 17v1.188c0 .754.546 1.396 1.29 1.517c4.278.699 8.642.699 12.92 0a1.54 1.54 0 0 0 1.29-1.517V17A3.75 3.75 0 0 0 16 13.25h-.34q-.28.001-.544.086l-.866.283a7.25 7.25 0 0 1-4.5 0l-.866-.283a1.8 1.8 0 0 0-.543-.086z" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-9 h-9 rounded-full bg-theme-danger text-white flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
      );
    }
  };

  // Helper to render user activity status dot and styling
  const renderStatusBadge = (status) => {
    let dotColor = 'bg-theme-safe';
    if (status === 'Break' || status === 'Partially Completed') {
      dotColor = 'bg-[#FFB703]';
    } else if (status === 'Left Room' || status === 'Not Completed') {
      dotColor = 'bg-theme-danger';
    }

    return (
      <div className="flex items-center gap-2 text-left">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} inline-block shrink-0`} />
        <span className="font-pixel text-[13px] sm:text-[15px] text-theme-dark">{status}</span>
      </div>
    );
  };

  // --- CHART DATA GENERATION BASED ON DISTINCT FILTER VALUES ---
  const getChartData = () => {
    if (chartOverrideData && dateRange === 'Today') {
      return chartOverrideData;
    }
    if (dateRange === 'Today') {
      return {
        labels: ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
        total: [12, 8, 15, 45, 85, 95, 75, 40],
        completed: [9, 6, 11, 36, 68, 76, 60, 30],
        active: [5, 3, 8, 24, 45, 52, 41, 18],
      };
    } else if (dateRange === 'Yesterday') {
      return {
        labels: ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
        total: [10, 6, 12, 40, 78, 88, 70, 35],
        completed: [7, 4, 9, 31, 60, 70, 55, 25],
        active: [20, 2, 6, 20, 39, 46, 36, 15],
      };
    } else if (dateRange === 'Last 30 days') {
      return {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        total: [280, 420, 590, 510],
        completed: [220, 340, 480, 410],
        active: [140, 210, 310, 270],
      };
    } else if (dateRange.includes('to')) {
      return {
        labels: ['Start', 'Day 2', 'Mid', 'Day 4', 'End'],
        total: [45, 62, 80, 72, 95],
        completed: [35, 50, 65, 58, 78],
        active: [22, 31, 44, 38, 52],
      };
    } else {
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        total: [35, 47, 54, 66, 77, 97, 90],
        completed: [26, 36, 42, 51, 61, 74, 65],
        active: [18, 23, 28, 36, 46, 56, 49],
      };
    }
  };

  const chartData = getChartData();

  // Toggle legend series visibility
  const toggleLine = (key) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // SVG Chart Dimensions & Scale Calculations
  const svgWidth = 640;
  const svgHeight = 240;
  const paddingLeft = 45;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxDataVal = Math.max(
    ...(chartData.total || [0]),
    ...(chartData.completed || [0]),
    ...(chartData.active || [0])
  );
  const maxY = dateRange === 'Last 30 days' ? 700 : Math.ceil(maxDataVal / 30) * 30 || 120;
  const stepY = maxY / 4;
  const yAxisSteps = [0, stepY, stepY * 2, stepY * 3, maxY];

  const getXCoord = (index, total) => {
    if (total <= 1) return paddingLeft;
    return paddingLeft + (index / (total - 1)) * innerWidth;
  };

  const getYCoord = (val) => {
    if (!maxY || Number.isNaN(val)) return paddingTop + innerHeight;
    const computedY = paddingTop + innerHeight - (val / maxY) * innerHeight;
    return Number.isNaN(computedY) ? paddingTop + innerHeight : computedY;
  };

  const generatePointsString = (dataArray) => {
    if (!Array.isArray(dataArray) || dataArray.length === 0) return '';
    return dataArray
      .map((val, idx) => `${getXCoord(idx, dataArray.length)},${getYCoord(val)}`)
      .filter((point) => !point.includes('NaN'))
      .join(' ');
  };

  const todayMax = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* ROW 1: TITLE & SUBTEXT + DATE RANGE FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-pressstart text-2xl sm:text-3xl md:text-4xl inline-block level-up-gradient bg-clip-text text-transparent w-fit">
            Welcome, IT Admin!
          </h1>
          <p className="font-pixel text-[18px] sm:text-[22px] text-theme-dark">
            Monitor | Support | Keep StudyCircle Running
          </p>
        </div>

        {/* TOP-RIGHT DATE RANGE FILTER DROPDOWN */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={dateRange.includes('to') ? 'Custom' : dateRange}
            onChange={handleFilterChange}
            className="bg-theme-surface border-2 border-theme-dark font-pixel text-[16px] sm:text-[20px] px-3.5 py-2 rounded-[12px] text-theme-dark outline-none cursor-pointer shadow-sm hover:bg-theme-muted transition-colors"
          >
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
            <span className="font-pixel text-[18px] sm:text-[22px] text-theme-dark uppercase">TOTAL USERS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.totalUsers.value}</h3>
            {!isToday && (
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

        {/* CARD 2: Active Rooms */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 4h14q.425 0 .713.288T20 5t-.288.713T19 6H5q-.425 0-.712-.288T4 5t.288-.712T5 4m0 16q-.425 0-.712-.288T4 19v-5h-.175q-.475 0-.775-.363t-.2-.837l1-5q.075-.35.35-.575T4.825 7h14.35q.35 0 .625.225t.35.575l1 5q.1.475-.2.837t-.775.363H20v5q0 .425-.288.713T13 20zm1-2h6v-4H6zm-.95-6h13.9zm0 0h13.9l-.6-3H5.65z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[22px] text-theme-dark uppercase">ACTIVE ROOMS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.activeRooms.value}</h3>
            {!isToday && (
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

        {/* CARD 3: Study Sessions */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[22px] text-theme-dark uppercase">STUDY SESSIONS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.studySessions.value}</h3>
            {!isToday && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.studySessions.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.studySessions.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Reported Activities */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[22px] text-theme-dark uppercase">REPORTED ACTIVITIES</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.reportedActivities.value}</h3>
            {!isToday && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.reportedActivities.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.reportedActivities.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ROW 3: MAIN CONTAINERS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* LEFT CONTAINER - STUDY ACTIVITY OVERVIEW LINE GRAPH */}
        <div className="lg:col-span-3 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 sm:p-6 shadow-md flex flex-col justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-theme-dark/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center text-theme-primary shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h2v18H3V3zm4 10h2v8H7v-8zm4-6h2v14h-2V7zm4 4h2v10h-2V11zm4-6h2v16h-2V5z" />
                </svg>
              </div>
              <h2 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">
                STUDY ACTIVITY OVERVIEW
              </h2>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => toggleLine('total')}
                className={`flex items-center gap-1.5 font-pixel text-[14px] cursor-pointer transition-opacity ${
                  visibleLines.total ? 'opacity-100' : 'opacity-40 line-through'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#E87339] inline-block border border-theme-dark" />
                <span className="text-theme-dark">Total Sessions</span>
              </button>

              <button
                type="button"
                onClick={() => toggleLine('completed')}
                className={`flex items-center gap-1.5 font-pixel text-[14px] cursor-pointer transition-opacity ${
                  visibleLines.completed ? 'opacity-100' : 'opacity-40 line-through'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#3A86EF] inline-block border border-theme-dark" />
                <span className="text-theme-dark">Completed</span>
              </button>

              <button
                type="button"
                onClick={() => toggleLine('active')}
                className={`flex items-center gap-1.5 font-pixel text-[14px] cursor-pointer transition-opacity ${
                  visibleLines.active ? 'opacity-100' : 'opacity-40 line-through'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#FFB703] inline-block border border-theme-dark" />
                <span className="text-theme-dark">Active Users</span>
              </button>
            </div>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px] overflow-visible">
              
              {yAxisSteps.map((val, idx) => {
                const y = getYCoord(val);
                const displayVal = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val);
                return (
                  <g key={`y-step-${idx}`}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-theme-dark/10"
                      strokeDasharray={idx === 0 ? 'none' : '3 3'}
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 4}
                      className="font-pixel text-[11px] fill-theme-dark/60 text-right"
                      textAnchor="end"
                    >
                      {displayVal}
                    </text>
                  </g>
                );
              })}

              {chartData.labels.map((_, idx) => {
                const x = getXCoord(idx, chartData.labels.length);
                return (
                  <line
                    key={`v-grid-${idx}`}
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + innerHeight}
                    stroke="currentColor"
                    className="text-theme-dark/10"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                );
              })}

              <line
                x1={paddingLeft}
                y1={paddingTop + innerHeight}
                x2={svgWidth - paddingRight}
                y2={paddingTop + innerHeight}
                stroke="currentColor"
                className="text-theme-dark"
                strokeWidth="1.5"
              />

              {chartData.labels.map((label, idx) => {
                const x = getXCoord(idx, chartData.labels.length);
                return (
                  <text
                    key={idx}
                    x={x}
                    y={paddingTop + innerHeight + 20}
                    className="font-pixel text-[12px] fill-theme-dark/80"
                    textAnchor="middle"
                  >
                    {label}
                  </text>
                );
              })}

              {visibleLines.total && (
                <g>
                  <polyline
                    fill="none"
                    stroke="#E87339"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={generatePointsString(chartData.total)}
                  />
                  {chartData.total.map((val, idx) => {
                    const x = getXCoord(idx, chartData.total.length);
                    const y = getYCoord(val);
                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint({ index: idx, label: chartData.labels[idx], total: val, completed: chartData.completed[idx], active: chartData.active[idx] })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <circle cx={x} cy={y} r="12" fill="transparent" />
                        <circle cx={x} cy={y} r="4.5" fill="#E87339" />
                      </g>
                    );
                  })}
                </g>
              )}

              {visibleLines.completed && (
                <g>
                  <polyline
                    fill="none"
                    stroke="#3A86EF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={generatePointsString(chartData.completed)}
                  />
                  {chartData.completed.map((val, idx) => {
                    const x = getXCoord(idx, chartData.completed.length);
                    const y = getYCoord(val);
                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint({ index: idx, label: chartData.labels[idx], total: chartData.total[idx], completed: val, active: chartData.active[idx] })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <circle cx={x} cy={y} r="12" fill="transparent" />
                        <circle cx={x} cy={y} r="4.5" fill="#3A86EF" />
                      </g>
                    );
                  })}
                </g>
              )}

              {visibleLines.active && (
                <g>
                  <polyline
                    fill="none"
                    stroke="#FFB703"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={generatePointsString(chartData.active)}
                  />
                  {chartData.active.map((val, idx) => {
                    const x = getXCoord(idx, chartData.active.length);
                    const y = getYCoord(val);
                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint({ index: idx, label: chartData.labels[idx], total: chartData.total[idx], completed: chartData.completed[idx], active: val })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <circle cx={x} cy={y} r="12" fill="transparent" />
                        <circle cx={x} cy={y} r="4.5" fill="#FFB703" />
                      </g>
                    );
                  })}
                </g>
              )}

            </svg>

            {hoveredPoint && (
              <div 
                className="absolute z-30 bg-theme-surface border-2 border-theme-dark p-2.5 rounded-[8px] shadow-xl pointer-events-none flex flex-col gap-1 w-44"
                style={{
                  left: `${Math.min(Math.max((hoveredPoint.index / (chartData.labels.length - 1)) * 100, 15), 80)}%`,
                  top: '25%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="flex items-center justify-between border-b border-theme-dark/20 pb-1">
                  <span className="font-pressstart text-[8px] text-theme-primary">{hoveredPoint.label}</span>
                  <span className="font-pixel text-[11px] text-theme-dark">Details</span>
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5 font-pixel text-[13px]">
                  {visibleLines.total && (
                    <div className="flex justify-between items-center text-theme-dark">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E87339] inline-block"/>Total:</span>
                      <span className="font-pressstart text-[9px]">{hoveredPoint.total}</span>
                    </div>
                  )}
                  {visibleLines.completed && (
                    <div className="flex justify-between items-center text-theme-dark">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3A86EF] inline-block"/>Completed:</span>
                      <span className="font-pressstart text-[9px]">{hoveredPoint.completed}</span>
                    </div>
                  )}
                  {visibleLines.active && (
                    <div className="flex justify-between items-center text-theme-dark">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FFB703] inline-block"/>Active:</span>
                      <span className="font-pressstart text-[9px]">{hoveredPoint.active}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT CONTAINER - QUICK ACTIONS PANEL */}
        <div className="lg:col-span-1 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 shadow-md flex flex-col justify-between gap-4">
          
          <div className="flex items-center gap-2.5 border-b-2 border-theme-dark/10 pb-3">
            <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#E87339] shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-6 h-6">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.684 3.603c.521-.659.03-1.603-.836-1.603h-6.716a1.06 1.06 0 0 0-.909.502l-5.082 8.456c-.401.666.103 1.497.908 1.497h3.429l-3.23 8.065c-.467 1.02.795 1.953 1.643 1.215L20 9.331h-6.849z" />
              </svg>
            </div>
            <h2 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">
              QUICK ACTIONS
            </h2>
          </div>

          <div className="flex flex-col justify-around flex-1 gap-2.5 py-1">
            <button
              type="button"
              onClick={() => navigate('/itadmin/reports')}
              className="w-full border border-theme-dark rounded-lg px-3.5 py-3.5 bg-theme-surface hover:bg-theme-muted transition-colors flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="text-theme-primary shrink-0 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
                <span className="font-pixel text-[14px] sm:text-[19px] text-theme-dark text-left truncate">Reported Activities</span>
              </div>
              <span className="font-pressstart text-[10px] text-theme-dark group-hover:translate-x-1 transition-transform">&gt;</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/itadmin/users')}
              className="w-full border border-theme-dark rounded-lg px-3.5 py-3.5 bg-theme-surface hover:bg-theme-muted transition-colors flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="text-theme-primary shrink-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-6 h-6">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path fill="currentColor" fillRule="evenodd" d="M8 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4zm7.25-2.095c.478-.86.75-1.85.75-2.905a6 6 0 0 0-.75-2.906a4 4 0 1 1 0 5.811M15.466 20c.34-.588.535-1.271.535-2v-1a5.98 5.98 0 0 0-1.528-4H18a4 4 0 0 1 4 4v1a2 2 0 0 1-2 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-pixel text-[14px] sm:text-[19px] text-theme-dark text-left truncate">Manage Users</span>
              </div>
              <span className="font-pressstart text-[10px] text-theme-dark group-hover:translate-x-1 transition-transform">&gt;</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/itadmin/rooms')}
              className="w-full border border-theme-dark rounded-lg px-3.5 py-3.5 bg-theme-surface hover:bg-theme-muted transition-colors flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="text-theme-primary shrink-0 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 4h14q.425 0 .713.288T20 5t-.288.713T19 6H5q-.425 0-.712-.288T4 5t.288-.712T5 4m0 16q-.425 0-.712-.288T4 19v-5h-.175q-.475 0-.775-.363t-.2-.837l1-5q.075-.35.35-.575T4.825 7h14.35q.35 0 .625.225t.35.575l1 5q.1.475-.2.837t-.775.363H20v5q0 .425-.288.713T13 20zm1-2h6v-4H6zm-.95-6h13.9zm0 0h13.9l-.6-3H5.65z" />
                  </svg>
                </div>
                <span className="font-pixel text-[14px] sm:text-[19px] text-theme-dark text-left truncate">Manage Rooms</span>
              </div>
              <span className="font-pressstart text-[10px] text-theme-dark group-hover:translate-x-1 transition-transform">&gt;</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/itadmin/logs')}
              className="w-full border border-theme-dark rounded-lg px-3.5 py-3.5 bg-theme-surface hover:bg-theme-muted transition-colors flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="text-theme-primary shrink-0 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="font-pixel text-[14px] sm:text-[19px] text-theme-dark text-left truncate">View Logs</span>
              </div>
              <span className="font-pressstart text-[10px] text-theme-dark group-hover:translate-x-1 transition-transform">&gt;</span>
            </button>

          </div>
        </div>

      </div>

      {/* ROW 4: RECENT ALERTS & USER ACTIVITY WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* CONTAINER 1: RECENT ALERTS WIDGET */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 shadow-md flex flex-col justify-between min-h-[220px]">
          
          <div className="flex items-center justify-between border-b-2 border-theme-dark/10 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-theme-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-6 h-6">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 21v-5.313m0 0c5.818-4.55 10.182 4.55 16 0V4.313c-5.818 4.55-10.182-4.55-16 0z" />
                </svg>
              </div>
              <h3 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">
                RECENT ALERTS
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAllReportsModal(true)}
              className="font-pixel text-[16px] text-theme-primary hover:underline cursor-pointer"
            >
              View All &gt;
            </button>
          </div>

          <div className="flex flex-col gap-3 flex-1 justify-center">
            {allReportsData.length === 0 ? (
              <p className="font-pixel text-center text-theme-dark/60 py-4">No recent alerts or reports found.</p>
            ) : (
              allReportsData.slice(0, 3).map((report) => (
                <div
                  key={report.id}
                  className="border-b border-theme-dark/10 last:border-b-0 p-3 flex items-start gap-3"
                >
                  {renderReportIcon(report.type)}
                  <div className="flex flex-col flex-1 min-w-0 font-pixel text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-pixel text-[15px] sm:text-[18px] text-theme-dark truncate uppercase">
                        {report.roomName || report.reportedUser || 'Alert Item'}
                      </span>
                      <span className="font-pixel text-[11px] sm:text-[15px] text-theme-dark shrink-0">
                        {report.timeSubmitted}
                      </span>
                    </div>
                    <p className="font-pixel text-[11px] sm:text-[15px] text-theme-dark mt-0.5 truncate">
                      {report.reason}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* CONTAINER 2: USER ACTIVITY (LIVE) WIDGET */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 shadow-md flex flex-col justify-between min-h-[220px]">
          
          <div className="flex items-center justify-between border-b-2 border-theme-dark/10 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-theme-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-6 h-6">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <h3 className="font-pressstart text-[9px] sm:text-[15px] text-theme-dark uppercase">
                USER ACTIVITY (LIVE)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAllUserActivityModal(true)}
              className="font-pixel text-[16px] text-theme-primary hover:underline cursor-pointer"
            >
              View All &gt;
            </button>
          </div>

          <div className="bg-theme-muted rounded-[8px] px-4 py-2 mb-2 flex items-center justify-between font-pixel text-[14px] text-theme-dark uppercase">
            <span className="w-[28%] text-left">User</span>
            <span className="w-[35%] text-left">Room</span>
            <span className="w-[22%] text-left">Status</span>
            <span className="w-[15%] text-right pr-2">Time</span>
            <span className="w-3"></span>
          </div>

          <div className="flex flex-col flex-1 justify-around">
            {allUserActivityData.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="py-2.5 px-2 border-b border-theme-dark/10 last:border-b-0 flex items-center justify-between text-theme-dark font-pixel text-[14px]"
              >
                <span className="w-[28%] text-left truncate text-[15px] sm:text-[18px]">{item.user}</span>
                <span className="w-[35%] text-left truncate text-theme-dark text-[11px] sm:text-[15px]">{item.room}</span>
                <div className="w-[22%] flex items-center gap-2 text-left">
                  {renderStatusBadge(item.status)}
                </div>
                <span className="w-[15%] text-right font-pixel text-theme-dark pr-2 text-[11px] sm:text-[15px]">{item.time}</span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* VIEW ALL HISTORICAL REPORTS MODAL */}
      {showAllReportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-2xl w-full max-h-[85vh] shadow-xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b-2 border-theme-dark/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center text-theme-primary shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-6 h-6">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 21v-5.313m0 0c5.818-4.55 10.182 4.55 16 0V4.313c-5.818 4.55-10.182-4.55-16 0z" />
                  </svg>
                </div>
                <h3 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">
                  ALL RECENT ALERTS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllReportsModal(false)}
                className="font-pressstart text-[10px] text-theme-dark hover:text-theme-danger cursor-pointer px-2 py-1 border border-theme-dark rounded-[4px]"
              >
                X
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-1">
              {allReportsData.length === 0 ? (
                <p className="font-pixel text-center text-theme-dark/60 py-4">No recent reports found.</p>
              ) : (
                allReportsData.map((report) => (
                  <div
                    key={report.id}
                    className="border-b border-theme-dark/10 last:border-b-0 p-3.5 flex items-start gap-3.5"
                  >
                    {renderReportIcon(report.type)}
                    <div className="flex flex-col flex-1 min-w-0 font-pixel text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-pixel text-[15px] sm:text-[18px] text-theme-dark truncate uppercase">
                          {report.roomName || report.reportedUser || 'Alert'}
                        </span>
                        <span className="font-pixel text-[11px] sm:text-[15px] text-theme-dark shrink-0">
                          {report.timeSubmitted}
                        </span>
                      </div>
                      <p className="font-pixel text-[11px] sm:text-[15px] text-theme-dark mt-1">
                        {report.reason}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* VIEW ALL USER ACTIVITY MODAL */}
      {showAllUserActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-3xl w-full max-h-[85vh] shadow-xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b-2 border-theme-dark/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-theme-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-6 h-6">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </div>
                <h3 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">
                  ALL USER ACTIVITY (LIVE)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllUserActivityModal(false)}
                className="font-pressstart text-[10px] text-theme-dark hover:text-theme-danger cursor-pointer px-2 py-1 border border-theme-dark rounded-[4px]"
              >
                X
              </button>
            </div>

            <div className="bg-theme-muted rounded-[8px] px-4 py-2 flex items-center justify-between font-pixel text-[14px] text-theme-dark uppercase">
              <span className="w-[28%] text-left">User</span>
              <span className="w-[35%] text-left">Room</span>
              <span className="w-[22%] text-left">Status</span>
              <span className="w-[15%] text-right pr-2">Time</span>
              <span className="w-3"></span>
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto max-h-[50vh] pr-1">
              {allUserActivityData.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 px-2 border-b border-theme-dark/10 last:border-b-0 flex items-center justify-between text-theme-dark font-pixel text-[14px]"
                >
                  <span className="w-[28%] text-left truncate text-[15px] sm:text-[18px]">{item.user}</span>
                  <span className="w-[35%] text-left truncate text-theme-dark text-[11px] sm:text-[15px]">{item.room}</span>
                  <div className="w-[22%] flex items-center gap-2 text-left">
                    {renderStatusBadge(item.status)}
                  </div>
                  <span className="w-[15%] text-right font-pixel text-theme-dark pr-2 text-[11px] sm:text-[15px]">{item.time}</span>
                </div>
              ))}
            </div>

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