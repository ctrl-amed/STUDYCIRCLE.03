import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { adminFetch } from '../utils/adminApi';

const API = 'http://localhost:5000';

// ---------- static config ----------
const SERIES = [
  { key: 'total', label: 'Total Sessions', tip: 'Total', color: '#E87339' },
  { key: 'completed', label: 'Completed', tip: 'Completed', color: '#3A86EF' },
  { key: 'active', label: 'Active Users', tip: 'Active', color: '#FFB703' },
];

const ICONS = {
  users: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
  rooms: <path d="M5 4h14q.425 0 .713.288T20 5t-.288.713T19 6H5q-.425 0-.712-.288T4 5t.288-.712T5 4m0 16q-.425 0-.712-.288T4 19v-5h-.175q-.475 0-.775-.363t-.2-.837l1-5q.075-.35.35-.575T4.825 7h14.35q.35 0 .625.225t.35.575l1 5q.1.475-.2.837t-.775.363H20v5q0 .425-.288.713T13 20zm1-2h6v-4H6zm-.95-6h13.9zm0 0h13.9l-.6-3H5.65z" />,
  alert: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />,
  clock: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </g>
  ),
};

const METRIC_CARDS = [
  { key: 'totalUsers', title: 'TOTAL USERS', icon: 'users', badIfUp: false },
  { key: 'activeRooms', title: 'ACTIVE ROOMS', icon: 'rooms', badIfUp: false },
  { key: 'studySessions', title: 'STUDY SESSIONS', icon: 'clock', badIfUp: false },
  { key: 'reportedActivities', title: 'REPORTED ACTIVITIES', icon: 'alert', badIfUp: true },
];

const QUICK_ACTIONS = [
  { label: 'Reported Activities', to: '/itadmin/reports', icon: 'alert' },
  { label: 'Manage Users', to: '/itadmin/users', icon: 'users' },
  { label: 'Manage Rooms', to: '/itadmin/rooms', icon: 'rooms' },
  {
    label: 'View Logs',
    to: '/itadmin/logs',
    icon: (
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    ),
  },
];

const EMPTY_DASH = {
  metrics: {
    totalUsers: { value: 0, changePct: null },
    activeRooms: { value: 0, changePct: null },
    studySessions: { value: 0, changePct: null },
    reportedActivities: { value: 0, changePct: null },
  },
  chart: { labels: ['—', '—', '—', '—'], total: [0, 0, 0, 0], completed: [0, 0, 0, 0], active: [0, 0, 0, 0] },
  alerts: [],
  activity: [],
};

// ---------- small helpers ----------
const Icon = ({ name, className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {typeof name === 'string' ? ICONS[name] : name}
  </svg>
);

const formatChange = (pct) => {
  if (pct === null || pct === undefined) return '—';
  if (pct > 0) return `↑ ${pct}%`;
  if (pct < 0) return `↓ ${Math.abs(pct)}%`;
  return '0%';
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const formatActivityTime = (item) => {
  if (item.live) return 'Live';
  const d = new Date(item.createdAt);
  if (Number.isNaN(d.getTime())) return '—';
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
};

const ReportIcon = ({ type }) => {
  if (type === 'message') {
    return (
      <div className="w-9 h-9 rounded-full bg-[#FFB703] text-white flex items-center justify-center shrink-0 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="currentColor" d="M11 8h2v4.5h-2zm0 6h2v2h-2z" />
          <path fill="currentColor" d="M12 2C6.49 2 2 6.49 2 12c0 2.12.68 4.19 1.93 5.9l-1.75 2.53c-.21.31-.24.7-.06 1.03c.17.33.51.54.89.54h9c5.51 0 10-4.49 10-10S17.51 2 12 2m0 18H4.91L6 18.43c.26-.37.23-.88-.06-1.22A7.98 7.98 0 0 1 4.01 12c0-4.41 3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8Z" />
        </svg>
      </div>
    );
  }
  if (type === 'user') {
    return (
      <div className="w-9 h-9 rounded-full bg-theme-primary text-white flex items-center justify-center shrink-0 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="currentColor" d="M12 3.75a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5m-4 9.5A3.75 3.75 0 0 0 4.25 17v1.188c0 .754.546 1.396 1.29 1.517c4.278.699 8.642.699 12.92 0a1.54 1.54 0 0 0 1.29-1.517V17A3.75 3.75 0 0 0 16 13.25h-.34q-.28.001-.544.086l-.866.283a7.25 7.25 0 0 1-4.5 0l-.866-.283a1.8 1.8 0 0 0-.543-.086z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-theme-danger text-white flex items-center justify-center shrink-0 shadow-sm">
      <Icon name="alert" />
    </div>
  );
};

const StatusBadge = ({ status }) => {
  let dot = 'bg-theme-safe';
  if (status === 'Break' || status === 'Partially Completed') dot = 'bg-[#FFB703]';
  else if (status === 'Left Room' || status === 'Not Completed') dot = 'bg-theme-danger';
  return (
    <div className="flex items-center gap-2 text-left min-w-0">
      <span className={`w-2.5 h-2.5 rounded-full ${dot} inline-block shrink-0`} />
      <span className="font-pixel text-[13px] sm:text-[15px] text-theme-dark truncate">{status}</span>
    </div>
  );
};

const AlertRow = ({ report, wrap = false }) => (
  <div className="border-b border-theme-dark/10 last:border-b-0 p-3 flex items-start gap-3">
    <ReportIcon type={report.type} />
    <div className="flex flex-col flex-1 min-w-0 font-pixel text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-pixel text-[15px] sm:text-[18px] text-theme-dark truncate uppercase">{report.title}</span>
        <span className="font-pixel text-[11px] sm:text-[15px] text-theme-dark shrink-0">{timeAgo(report.createdAt)}</span>
      </div>
      <p className={`font-pixel text-[11px] sm:text-[15px] text-theme-dark mt-0.5 ${wrap ? '' : 'truncate'}`}>{report.reason}</p>
    </div>
  </div>
);

const ActivityHeader = () => (
  <div className="bg-theme-muted rounded-[8px] px-4 py-2 flex items-center justify-between font-pixel text-[14px] text-theme-dark uppercase">
    <span className="w-[28%] text-left">User</span>
    <span className="w-[35%] text-left">Room</span>
    <span className="w-[22%] text-left">Status</span>
    <span className="w-[15%] text-right pr-2">Time</span>
    <span className="w-3"></span>
  </div>
);

const ActivityRow = ({ item }) => (
  <div className="py-2.5 px-2 border-b border-theme-dark/10 last:border-b-0 flex items-center justify-between text-theme-dark font-pixel text-[14px]">
    <span className="w-[28%] text-left truncate text-[15px] sm:text-[18px]">{item.user}</span>
    <span className="w-[35%] text-left truncate text-[11px] sm:text-[15px]">{item.room}</span>
    <div className="w-[22%] flex items-center gap-2 text-left"><StatusBadge status={item.status} /></div>
    <span className={`w-[15%] text-right pr-2 text-[11px] sm:text-[15px] ${item.live ? 'text-theme-safe' : ''}`}>
      {formatActivityTime(item)}
    </span>
  </div>
);

const Modal = ({ title, icon, maxW, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
    <div className={`bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 ${maxW} w-full max-h-[85vh] shadow-xl flex flex-col gap-4`}>
      <div className="flex items-center justify-between border-b-2 border-theme-dark/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center text-theme-primary shrink-0">
            <Icon name={icon} className="w-6 h-6" />
          </div>
          <h3 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-pressstart text-[10px] text-theme-dark hover:text-theme-danger cursor-pointer px-2 py-1 border border-theme-dark rounded-[4px]"
        >
          X
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ---------- component ----------
export default function ITDashboard() {
  const navigate = useNavigate();

  // Date range filter
  const [dateRange, setDateRange] = useState('Today');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customDateError, setCustomDateError] = useState('');

  // Modals / chart UI
  const [showAllReportsModal, setShowAllReportsModal] = useState(false);
  const [showAllUserActivityModal, setShowAllUserActivityModal] = useState(false);
  const [visibleLines, setVisibleLines] = useState({ total: true, completed: true, active: true });
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Real data
  const [dash, setDash] = useState(EMPTY_DASH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.includes(' to ')) {
        const [s, e] = dateRange.split(' to ');
        params.set('range', 'Custom');
        params.set('start', s);
        params.set('end', e);
      } else {
        params.set('range', dateRange);
      }
      const res = await adminFetch(`${API}/api/itadmin/dashboard?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDash({ metrics: data.metrics, chart: data.chart, alerts: data.alerts, activity: data.activity });
        setError('');
      } else {
        setError(data.error || 'Could not load dashboard data.');
      }
    } catch (err) {
      console.error('IT Dashboard fetch failed:', err);
      setError('Could not reach the server. Check that the backend is running.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dateRange]);

  // Reload whenever the date range changes
  useEffect(() => {
    load();
  }, [load]);

  // Keep the latest loader in a ref so the socket/interval never go stale
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Live updates: refresh quietly when presence, rooms or users change, plus a 60s fallback
  useEffect(() => {
    const socket = io(API);
    let timer = null;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadRef.current(true), 1000);   // debounce bursts
    };
    socket.on('admin_presence_update', refresh);
    socket.on('rooms_changed', refresh);
    socket.on('users_changed', refresh);
    const interval = setInterval(() => loadRef.current(true), 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  // ---------- filter handlers ----------
  const handleFilterChange = (e) => {
    const val = e.target.value;
    if (val === 'Custom') setShowCustomModal(true);
    else setDateRange(val);
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

  const isToday = dateRange === 'Today';
  const todayMax = new Date().toISOString().split('T')[0];

  const getTimeframeLabel = () => {
    switch (dateRange) {
      case 'Yesterday': return 'vs. yesterday';
      case 'Last 7 days': return 'vs. last week';
      case 'Last 30 days': return 'vs. last month';
      default: return dateRange.includes(' to ') ? 'vs. previous period' : 'vs. last week';
    }
  };

  // ---------- chart maths ----------
  const chartData = dash.chart;
  const svgWidth = 640;
  const svgHeight = 240;
  const paddingLeft = 45;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;
  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxDataVal = Math.max(0, ...chartData.total, ...chartData.completed, ...chartData.active);
  // "Nice" axis: 4 equal steps, each a 1/2/5/10 multiple of a power of ten (min step 1)
  const rawStep = Math.max(1, maxDataVal / 4);
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const niceMult = [1, 2, 5, 10].find((m) => m * mag >= rawStep) || 10;
  const stepY = niceMult * mag;
  const maxY = stepY * 4;
  const yAxisSteps = [0, 1, 2, 3, 4].map((i) => stepY * i);
  const chartIsEmpty = maxDataVal === 0;

  const getXCoord = (index, total) => (total <= 1 ? paddingLeft : paddingLeft + (index / (total - 1)) * innerWidth);
  const getYCoord = (val) => paddingTop + innerHeight - ((Number(val) || 0) / maxY) * innerHeight;
  const pointsString = (arr) => arr.map((v, i) => `${getXCoord(i, arr.length)},${getYCoord(v)}`).join(' ');

  const showTooltip = (idx) =>
    setHoveredPoint({
      index: idx,
      label: chartData.labels[idx],
      total: chartData.total[idx],
      completed: chartData.completed[idx],
      active: chartData.active[idx],
    });

  const toggleLine = (key) => setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* ROW 1: TITLE + DATE FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-pressstart text-2xl sm:text-3xl md:text-4xl inline-block level-up-gradient bg-clip-text text-transparent w-fit">
            Welcome, IT Admin!
          </h1>
          <p className="font-pixel text-[18px] sm:text-[22px] text-theme-dark">
            Monitor | Support | Keep StudyCircle Running
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={dateRange.includes(' to ') ? 'Custom' : dateRange}
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

      {error && (
        <div className="bg-theme-danger/20 border-2 border-theme-danger p-3 rounded-[8px] text-theme-danger font-pixel text-[15px] flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => load()}
            className="font-pressstart text-[9px] border-2 border-theme-danger px-3 py-1.5 rounded-[8px] cursor-pointer hover:opacity-80 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ROW 2: METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRIC_CARDS.map((card) => {
          const m = dash.metrics[card.key];
          const good = m.changePct === null ? true : card.badIfUp ? m.changePct <= 0 : m.changePct >= 0;
          return (
            <div key={card.key} className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
              <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
                <Icon name={card.icon} />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-pixel text-[18px] sm:text-[22px] text-theme-dark uppercase">{card.title}</span>
                <h3 className={`font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate ${loading ? 'animate-pulse opacity-60' : ''}`}>
                  {Number(m.value).toLocaleString()}
                </h3>
                {!isToday && (
                  <div className="flex items-center gap-1.5 mt-3 justify-end">
                    <span className={`font-pressstart text-[9px] ${good ? 'text-theme-safe' : 'text-theme-danger'}`}>
                      {formatChange(m.changePct)}
                    </span>
                    <span className="font-pressstart text-[7px] text-theme-dark">{getTimeframeLabel()}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ROW 3: CHART + QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        {/* STUDY ACTIVITY OVERVIEW */}
        <div className="lg:col-span-3 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 sm:p-6 shadow-md flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-theme-dark/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center text-theme-primary shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h2v18H3V3zm4 10h2v8H7v-8zm4-6h2v14h-2V7zm4 4h2v10h-2V11zm4-6h2v16h-2V5z" />
                </svg>
              </div>
              <h2 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">STUDY ACTIVITY OVERVIEW</h2>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {SERIES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleLine(s.key)}
                  className={`flex items-center gap-1.5 font-pixel text-[14px] cursor-pointer transition-opacity ${
                    visibleLines[s.key] ? 'opacity-100' : 'opacity-40 line-through'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full inline-block border border-theme-dark" style={{ backgroundColor: s.color }} />
                  <span className="text-theme-dark">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px] overflow-visible">
              {/* horizontal grid + y labels */}
              {yAxisSteps.map((val, idx) => {
                const y = getYCoord(val);
                return (
                  <g key={`y-${idx}`}>
                    <line
                      x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y}
                      stroke="currentColor" className="text-theme-dark/10"
                      strokeDasharray={idx === 0 ? 'none' : '3 3'} strokeWidth="1"
                    />
                    <text x={paddingLeft - 10} y={y + 4} className="font-pixel text-[11px] fill-theme-dark/60" textAnchor="end">
                      {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                    </text>
                  </g>
                );
              })}

              {/* vertical grid + x labels */}
              {chartData.labels.map((label, idx) => {
                const x = getXCoord(idx, chartData.labels.length);
                return (
                  <g key={`x-${idx}`}>
                    <line
                      x1={x} y1={paddingTop} x2={x} y2={paddingTop + innerHeight}
                      stroke="currentColor" className="text-theme-dark/10" strokeDasharray="3 3" strokeWidth="1"
                    />
                    <text x={x} y={paddingTop + innerHeight + 20} className="font-pixel text-[12px] fill-theme-dark/80" textAnchor="middle">
                      {label}
                    </text>
                  </g>
                );
              })}

              <line
                x1={paddingLeft} y1={paddingTop + innerHeight} x2={svgWidth - paddingRight} y2={paddingTop + innerHeight}
                stroke="currentColor" className="text-theme-dark" strokeWidth="1.5"
              />

              {/* data lines */}
              {SERIES.map((s) =>
                visibleLines[s.key] ? (
                  <g key={s.key}>
                    <polyline
                      fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      points={pointsString(chartData[s.key])}
                    />
                    {chartData[s.key].map((val, idx) => {
                      const x = getXCoord(idx, chartData[s.key].length);
                      const y = getYCoord(val);
                      return (
                        <g key={idx} className="cursor-pointer" onMouseEnter={() => showTooltip(idx)} onMouseLeave={() => setHoveredPoint(null)}>
                          <circle cx={x} cy={y} r="12" fill="transparent" />
                          <circle cx={x} cy={y} r="4.5" fill={s.color} />
                        </g>
                      );
                    })}
                  </g>
                ) : null
              )}
            </svg>

            {chartIsEmpty && !loading && (
              <p className="absolute inset-0 flex items-center justify-center font-pixel text-[18px] text-theme-dark/60 pointer-events-none">
                No study sessions in this period.
              </p>
            )}

            {hoveredPoint && (
              <div
                className="absolute z-30 bg-theme-surface border-2 border-theme-dark p-2.5 rounded-[8px] shadow-xl pointer-events-none flex flex-col gap-1 w-44"
                style={{
                  left: `${Math.min(Math.max((hoveredPoint.index / Math.max(chartData.labels.length - 1, 1)) * 100, 15), 80)}%`,
                  top: '25%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="flex items-center justify-between border-b border-theme-dark/20 pb-1">
                  <span className="font-pressstart text-[8px] text-theme-primary">{hoveredPoint.label}</span>
                  <span className="font-pixel text-[11px] text-theme-dark">Details</span>
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5 font-pixel text-[13px]">
                  {SERIES.filter((s) => visibleLines[s.key]).map((s) => (
                    <div key={s.key} className="flex justify-between items-center text-theme-dark">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        {s.tip}:
                      </span>
                      <span className="font-pressstart text-[9px]">{hoveredPoint[s.key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="lg:col-span-1 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 shadow-md flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2.5 border-b-2 border-theme-dark/10 pb-3">
            <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#E87339] shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.684 3.603c.521-.659.03-1.603-.836-1.603h-6.716a1.06 1.06 0 0 0-.909.502l-5.082 8.456c-.401.666.103 1.497.908 1.497h3.429l-3.23 8.065c-.467 1.02.795 1.953 1.643 1.215L20 9.331h-6.849z" />
              </svg>
            </div>
            <h2 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">QUICK ACTIONS</h2>
          </div>

          <div className="flex flex-col justify-around flex-1 gap-2.5 py-1">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.to}
                type="button"
                onClick={() => navigate(a.to)}
                className="w-full border border-theme-dark rounded-lg px-3.5 py-3.5 bg-theme-surface hover:bg-theme-muted transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-theme-primary shrink-0 flex items-center justify-center">
                    <Icon name={a.icon} className="w-6 h-6" />
                  </div>
                  <span className="font-pixel text-[14px] sm:text-[19px] text-theme-dark text-left truncate">{a.label}</span>
                </div>
                <span className="font-pressstart text-[10px] text-theme-dark group-hover:translate-x-1 transition-transform">&gt;</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 4: RECENT ALERTS + USER ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* RECENT ALERTS */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 shadow-md flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between border-b-2 border-theme-dark/10 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-theme-primary shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 21v-5.313m0 0c5.818-4.55 10.182 4.55 16 0V4.313c-5.818 4.55-10.182-4.55-16 0z" />
                </svg>
              </div>
              <h3 className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark uppercase">RECENT ALERTS</h3>
            </div>
            <button type="button" onClick={() => setShowAllReportsModal(true)} className="font-pixel text-[16px] text-theme-primary hover:underline cursor-pointer">
              View All &gt;
            </button>
          </div>

          <div className="flex flex-col gap-3 flex-1 justify-center">
            {dash.alerts.length === 0 ? (
              <p className="font-pixel text-center text-theme-dark/60 py-4">No recent alerts or reports found.</p>
            ) : (
              dash.alerts.slice(0, 3).map((r) => <AlertRow key={r.id} report={r} />)
            )}
          </div>
        </div>

        {/* USER ACTIVITY (LIVE) */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 shadow-md flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between border-b-2 border-theme-dark/10 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center text-theme-primary shrink-0">
                <Icon name="users" className="w-6 h-6" />
              </div>
              <h3 className="font-pressstart text-[9px] sm:text-[15px] text-theme-dark uppercase">USER ACTIVITY (LIVE)</h3>
            </div>
            <button type="button" onClick={() => setShowAllUserActivityModal(true)} className="font-pixel text-[16px] text-theme-primary hover:underline cursor-pointer">
              View All &gt;
            </button>
          </div>

          <div className="mb-2"><ActivityHeader /></div>

          <div className="flex flex-col flex-1 justify-around">
            {dash.activity.length === 0 ? (
              <p className="font-pixel text-center text-theme-dark/60 py-4">No user activity yet.</p>
            ) : (
              dash.activity.slice(0, 3).map((item) => <ActivityRow key={item.id} item={item} />)
            )}
          </div>
        </div>
      </div>

      {/* VIEW ALL ALERTS MODAL */}
      {showAllReportsModal && (
        <Modal title="ALL RECENT ALERTS" icon="alert" maxW="max-w-2xl" onClose={() => setShowAllReportsModal(false)}>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-1">
            {dash.alerts.length === 0 ? (
              <p className="font-pixel text-center text-theme-dark/60 py-4">No recent reports found.</p>
            ) : (
              dash.alerts.map((r) => <AlertRow key={r.id} report={r} wrap />)
            )}
          </div>
        </Modal>
      )}

      {/* VIEW ALL USER ACTIVITY MODAL */}
      {showAllUserActivityModal && (
        <Modal title="ALL USER ACTIVITY (LIVE)" icon="users" maxW="max-w-3xl" onClose={() => setShowAllUserActivityModal(false)}>
          <ActivityHeader />
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[50vh] pr-1">
            {dash.activity.length === 0 ? (
              <p className="font-pixel text-center text-theme-dark/60 py-4">No user activity yet.</p>
            ) : (
              dash.activity.map((item) => <ActivityRow key={item.id} item={item} />)
            )}
          </div>
        </Modal>
      )}

      {/* CUSTOM DATE PICKER MODAL */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
            <h3 className="font-pressstart text-[12px] text-theme-dark">Select Custom Range</h3>
            <p className="font-pixel text-[13px] text-theme-dark">Choose a specific start date and end date to filter metrics.</p>

            <form onSubmit={handleApplyCustomDates} className="flex flex-col gap-3 mt-2">
              {customDateError && (
                <div className="bg-theme-danger/20 border-2 border-theme-danger p-3 rounded-[8px] text-theme-danger font-pixel text-[13px]">
                  {customDateError}
                </div>
              )}

              {[
                ['Start Date', startDate, setStartDate],
                ['End Date', endDate, setEndDate],
              ].map(([label, value, setter]) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="font-pressstart text-[9px] text-theme-dark">{label}</label>
                  <input
                    type="date"
                    required
                    max={todayMax}
                    value={value}
                    onChange={(e) => {
                      setter(e.target.value);
                      setCustomDateError('');
                    }}
                    className="bg-theme-muted border-2 border-theme-dark p-2 font-pixel text-sm rounded-[8px] outline-none text-theme-dark"
                  />
                </div>
              ))}

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
