// src/pages/ITReports.jsx
import React, { useState } from 'react';
import { jsPDF } from 'jspdf';

export default function ITReports() {
  // Search and Filter State (Default dateRange set to 'All time')
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('All time');

  // New Filter State Variables for Group and Submitted Timeframe
  const [ticketGroupFilter, setTicketGroupFilter] = useState('All');
  const [ticketSubmittedFilter, setTicketSubmittedFilter] = useState('Any time');

  // Custom Date Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customDateError, setCustomDateError] = useState('');

  // Pagination State for Tickets Feed (30 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 30;

  // Multi-step Resolution Modal & Animation State
  const [ticketToResolve, setTicketToResolve] = useState(null);
  const [activeModalStep, setActiveModalStep] = useState('none'); // 'none' | 'detail' | 'dismiss' | 'warning' | 'suspension' | 'closure' | 'success'
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('24 Hours / 1 Day');
  const [customSuspensionDate, setCustomSuspensionDate] = useState('');
  const [successActionTitle, setSuccessActionTitle] = useState('');
  const [fadingTicketIds, setFadingTicketIds] = useState([]);
  const [showChatLogModal, setShowChatLogModal] = useState(false);

  // Closed / Resolved Tickets State & Modal Filters
  const [resolvedTicketsList, setResolvedTicketsList] = useState([
    { id: 101, ticketId: 'MESSAGE #998811', type: 'message', submitter: 'AlphaUser', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), status: 'closed', action: 'Dismiss Report' },
    { id: 102, ticketId: 'USER #554433', type: 'user', submitter: 'BetaTester', timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), status: 'resolved', action: 'Suspend User' },
    { id: 103, ticketId: 'ROOM #112233', type: 'room', submitter: 'GammaOwner', timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), status: 'resolved', action: 'Close Room / Content' },
  ]);
  const [showResolvedHistoryModal, setShowResolvedHistoryModal] = useState(false);
  const [modalStatusFilter, setModalStatusFilter] = useState('All status');
  const [modalDateFilter, setModalDateFilter] = useState('Any time');

  // Updated Mock Tickets Data with detailed properties and expanded chat logs (5-10 messages each)
  const [ticketsList, setTicketsList] = useState([
    { 
      id: 1, 
      ticketId: 'MESSAGE #123456', 
      type: 'message', 
      submitter: 'PixelCoder99', 
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), 
      content: 'Inappropriate language used in public study thread.',
      username: 'angeluuh_c',
      userSince: '10/10/2021',
      reportingHistory: '5 times reported',
      reportedBy: 'alexisMarie123',
      additionalNotes: 'User was cursing repeatedly despite warnings.',
      chatLog: [
        { timestamp: '[9:42]', sender: 'alexisMarie123', text: 'Hey guys, welcome to the study session.' },
        { timestamp: '[9:44]', sender: 'pixel_coder', text: 'Glad to be here, ready for algorithms.' },
        { timestamp: '[9:46]', sender: 'angeluuh_c', text: 'This review sheet is way too hard.', isFlagged: false },
        { timestamp: '[9:48]', sender: 'angeluuh_c', text: 'Inappropriate language used in public study thread.', isFlagged: true },
        { timestamp: '[9:49]', sender: 'alexisMarie123', text: 'Please keep the chat clean and respectful.' },
        { timestamp: '[9:50]', sender: 'mod_sarah', text: 'Staff notification: maintain channel guidelines.' },
        { timestamp: '[9:52]', sender: 'pixel_coder', text: 'Let focus back on the practice problems.' }
      ],
      reportReason: 'Abusive language'
    },
    { 
      id: 2, 
      ticketId: 'USER #654321', 
      type: 'user', 
      submitter: 'SarahConnor', 
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), 
      content: 'Harassment and spamming private messages.',
      username: 'user_alpha99',
      userSince: '03/15/2021',
      reportingHistory: '3 times reported',
      reportedBy: 'mod_sarah',
      additionalNotes: 'Sent unsolicited spam links and harassing messages.',
      reportReason: 'Harassment'
    },
    { 
      id: 3, 
      ticketId: 'ROOM #987654', 
      type: 'room', 
      submitter: 'AlexMorgan', 
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), 
      content: 'Room name contains explicit/offensive keywords.',
      host: 'AlexMorgan',
      dateCreated: '05/01/2022',
      roomName: 'Chill Study Lounge',
      reportedBy: 'moderator_sam',
      additionalNotes: 'Explicit keywords detected in title.',
      reportReason: 'Explicit room name'
    },
    { 
      id: 4, 
      ticketId: 'MESSAGE #112233', 
      type: 'message', 
      submitter: 'CodeNinja21', 
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), 
      content: 'Spamming referral links in study chat.',
      username: 'codeninja_21',
      userSince: '05/12/2022',
      reportingHistory: '2 times reported',
      reportedBy: 'dev_guru',
      additionalNotes: 'none',
      chatLog: [
        { timestamp: '[10:15]', sender: 'dev_guru', text: 'Good morning everyone!' },
        { timestamp: '[10:16]', sender: 'codeninja_21', text: 'Check out this external link for free tokens!', isFlagged: true },
        { timestamp: '[10:17]', sender: 'study_mod', text: 'Codeninja, no self-promo or referral links.' },
        { timestamp: '[10:18]', sender: 'codeninja_21', text: 'Just trying to help people out.' },
        { timestamp: '[10:19]', sender: 'dev_guru', text: 'Please read community rules regarding spam.' },
        { timestamp: '[10:20]', sender: 'study_mod', text: 'Issuing warning for off-topic spamming.' }
      ],
      reportReason: 'Off-topic spamming'
    },
    { 
      id: 5, 
      ticketId: 'USER #445566', 
      type: 'user', 
      submitter: 'MathWhiz', 
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), 
      content: 'Impersonating platform moderators.',
      username: 'fake_mod_01',
      userSince: '01/10/2023',
      reportingHistory: '4 times reported',
      reportedBy: 'admin_team',
      additionalNotes: 'Claiming to be staff in DM channels.',
      reportReason: 'Sharing personal information'
    },
    { 
      id: 6, 
      ticketId: 'ROOM #778899', 
      type: 'room', 
      submitter: 'HistoryBuff', 
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), 
      content: 'Hosting restricted / prohibited content stream.',
      host: 'HistoryBuff',
      dateCreated: '08/14/2021',
      roomName: 'Forbidden Archive Stream',
      reportedBy: 'watcher_99',
      additionalNotes: 'Prohibited stream content active.',
      reportReason: 'Promoting illegal'
    },
    { 
      id: 7, 
      ticketId: 'MESSAGE #998877', 
      type: 'message', 
      submitter: 'PhysicsGeek', 
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(), 
      content: 'Off-topic disruptive shouting.', 
      username: 'physics_geek', 
      userSince: '01/15/2023', 
      reportingHistory: 'none', 
      reportedBy: 'lab_partner', 
      additionalNotes: 'Disrupting channel.', 
      chatLog: [
        { timestamp: '[11:00]', sender: 'lab_partner', text: 'Who is working on lab experiment 3?' },
        { timestamp: '[11:02]', sender: 'physics_geek', text: 'Off-topic disruptive shouting.', isFlagged: true },
        { timestamp: '[11:03]', sender: 'lab_partner', text: 'There is no need to shout in all caps.' },
        { timestamp: '[11:04]', sender: 'physics_geek', text: 'I am just excited about quantum mechanics!' },
        { timestamp: '[11:05]', sender: 'mod_team', text: 'Please keep voice and text channels calm.' }
      ], 
      reportReason: 'Harassment' 
    },
    { 
      id: 8, 
      ticketId: 'USER #332211', 
      type: 'user', 
      submitter: 'LiteratureFan', 
      timestamp: new Date(Date.now() - 300 * 60 * 1000).toISOString(), 
      content: 'Trolling and inciting arguments.',
      username: 'troll_master',
      userSince: '09/01/2022',
      reportingHistory: '1 time reported',
      reportedBy: 'book_worm',
      additionalNotes: 'none',
      reportReason: 'Abusive language'
    },
    { 
      id: 9, 
      ticketId: 'ROOM #554433', 
      type: 'room', 
      submitter: 'MusicComposer', 
      timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(), 
      content: 'Excessive disruptive noise.',
      host: 'MusicComposer',
      dateCreated: '11/02/2022',
      roomName: 'Loud Jam Room',
      reportedBy: 'audio_mod',
      additionalNotes: 'none',
      reportReason: 'Off-topic noise'
    },
    { 
      id: 10, 
      ticketId: 'MESSAGE #665544', 
      type: 'message', 
      submitter: 'WebDevPro', 
      timestamp: new Date(Date.now() - 500 * 60 * 1000).toISOString(), 
      content: 'Sharing malicious script snippets.', 
      username: 'webdev_pro', 
      userSince: '11/20/2020', 
      reportingHistory: '3 times reported', 
      reportedBy: 'security_lead', 
      additionalNotes: 'Posted malicious script.', 
      chatLog: [
        { timestamp: '[12:30]', sender: 'security_lead', text: 'Testing deployment scripts.' },
        { timestamp: '[12:32]', sender: 'webdev_pro', text: 'Sharing malicious script snippets.', isFlagged: true },
        { timestamp: '[12:33]', sender: 'security_lead', text: 'Do not post unverified code snippets here!' },
        { timestamp: '[12:34]', sender: 'webdev_pro', text: 'Relax, it is just a prank script.' },
        { timestamp: '[12:35]', sender: 'admin_team', text: 'Content quarantined.' }
      ], 
      reportReason: 'Sharing personal information' 
    },
    { 
      id: 11, 
      ticketId: 'MESSAGE #554433', 
      type: 'message', 
      submitter: 'DataScientist', 
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), 
      content: 'Offensive comments in Q&A.', 
      username: 'data_sci', 
      userSince: '03/04/2022', 
      reportingHistory: 'none', 
      reportedBy: 'analyst_99', 
      additionalNotes: 'none', 
      chatLog: [
        { timestamp: '[13:10]', sender: 'analyst_99', text: 'Data sets are uploaded in the shared drive.' },
        { timestamp: '[13:12]', sender: 'data_sci', text: 'Offensive comments in Q&A.', isFlagged: true },
        { timestamp: '[13:13]', sender: 'analyst_99', text: 'That comment was uncalled for.' },
        { timestamp: '[13:14]', sender: 'mod_team', text: 'Unprofessional conduct will not be tolerated.' }
      ], 
      reportReason: 'Hate speech' 
    },
    { 
      id: 12, 
      ticketId: 'USER #654322', 
      type: 'user', 
      submitter: 'CloudArchitect', 
      timestamp: new Date(Date.now() - 600 * 60 * 1000).toISOString(), 
      content: 'Harassing other study partners.',
      username: 'cloud_troll',
      userSince: '04/11/2022',
      reportingHistory: '2 times reported',
      reportedBy: 'dev_ops',
      additionalNotes: 'Repeated harassment behavior.',
      reportReason: 'Harassment'
    },
    { 
      id: 13, 
      ticketId: 'ROOM #987655', 
      type: 'room', 
      submitter: 'SecurityAnalyst', 
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(), 
      content: 'Suspicious phishing links broadcasted.',
      host: 'SecurityAnalyst',
      dateCreated: '02/10/2023',
      roomName: 'SecOps Briefing',
      reportedBy: 'net_watcher',
      additionalNotes: 'Phishing links shared in room banner.',
      reportReason: 'Promoting illegal'
    },
    { 
      id: 14, 
      ticketId: 'MESSAGE #334455', 
      type: 'message', 
      submitter: 'GameDevGuru', 
      timestamp: new Date(Date.now() - 700 * 60 * 1000).toISOString(), 
      content: 'Spamming chat with self-promo.', 
      username: 'gamedev_guru', 
      userSince: '08/19/2021', 
      reportingHistory: '1 time reported', 
      reportedBy: 'player_one', 
      additionalNotes: 'Self promo spam', 
      chatLog: [
        { timestamp: '[14:00]', sender: 'player_one', text: 'Anyone testing the new indie build?' },
        { timestamp: '[14:02]', sender: 'gamedev_guru', text: 'Spamming chat with self-promo.', isFlagged: true },
        { timestamp: '[14:03]', sender: 'player_one', text: 'Please post promo links in the showcase channel.' },
        { timestamp: '[14:04]', sender: 'mod_alpha', text: 'Keep channels organized.' }
      ], 
      reportReason: 'Off-topic spamming' 
    },
    { 
      id: 15, 
      ticketId: 'USER #998811', 
      type: 'user', 
      submitter: 'UIUXDesigner', 
      timestamp: new Date(Date.now() - 800 * 60 * 1000).toISOString(), 
      content: 'Abusive behavior towards peer.',
      username: 'toxic_designer',
      userSince: '12/05/2021',
      reportingHistory: '5 times reported',
      reportedBy: 'lead_ux',
      additionalNotes: 'Verbal abuse in workspace comments.',
      reportReason: 'Abusive language'
    },
    { 
      id: 16, 
      ticketId: 'ROOM #223344', 
      type: 'room', 
      submitter: 'MobileDev', 
      timestamp: new Date(Date.now() - 900 * 60 * 1000).toISOString(), 
      content: 'Empty room used for bypassing bans.',
      host: 'MobileDev',
      dateCreated: '04/18/2022',
      roomName: 'Dev Hangout',
      reportedBy: 'mod_alpha',
      additionalNotes: 'none',
      reportReason: 'Repeated room violation'
    },
    { 
      id: 17, 
      ticketId: 'MESSAGE #556677', 
      type: 'message', 
      submitter: 'DevOpsEngineer', 
      timestamp: new Date(Date.now() - 1000 * 60 * 1000).toISOString(), 
      content: 'Inappropriate image upload.', 
      username: 'devops_eng', 
      userSince: '02/11/2023', 
      reportingHistory: 'none', 
      reportedBy: 'sys_admin', 
      additionalNotes: 'none', 
      chatLog: [
        { timestamp: '[15:20]', sender: 'sys_admin', text: 'System maintenance scheduled tonight.' },
        { timestamp: '[15:22]', sender: 'devops_eng', text: '[Inappropriate Image]', isFlagged: true },
        { timestamp: '[15:23]', sender: 'sys_admin', text: 'Image removed by automated filter.' },
        { timestamp: '[15:24]', sender: 'security_lead', text: 'Reviewing infraction policy.' }
      ], 
      reportReason: 'Adult content' 
    },
    { 
      id: 18, 
      ticketId: 'USER #889900', 
      type: 'user', 
      submitter: 'AITeacher', 
      timestamp: new Date(Date.now() - 1100 * 60 * 1000).toISOString(), 
      content: 'Bullying participants.',
      username: 'ai_bully',
      userSince: '07/19/2022',
      reportingHistory: 'none',
      reportedBy: 'student_rep',
      additionalNotes: 'none',
      reportReason: 'Harassment'
    },
    { 
      id: 19, 
      ticketId: 'ROOM #113355', 
      type: 'room', 
      submitter: 'RoboticsKid', 
      timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(), 
      content: 'Unauthorized commercial advertising.',
      host: 'RoboticsKid',
      dateCreated: '09/12/2021',
      roomName: 'Robot Showcase & Ads',
      reportedBy: 'ad_police',
      additionalNotes: 'Commercial advertising space.',
      reportReason: 'Explicit room name'
    },
    { 
      id: 20, 
      ticketId: 'MESSAGE #224466', 
      type: 'message', 
      submitter: 'NetworkAdmin', 
      timestamp: new Date(Date.now() - 1200 * 60 * 1000).toISOString(), 
      content: 'Flooding text channel.', 
      username: 'net_admin', 
      userSince: '09/09/2019', 
      reportingHistory: '4 times reported', 
      reportedBy: 'user_active', 
      additionalNotes: 'Flooding', 
      chatLog: [
        { timestamp: '[16:00]', sender: 'user_active', text: 'Network diagnostics looking good.' },
        { timestamp: '[16:01]', sender: 'net_admin', text: 'Flooding text channel.', isFlagged: true },
        { timestamp: '[16:02]', sender: 'user_active', text: 'Please stop spamming the feed.' },
        { timestamp: '[16:03]', sender: 'mod_team', text: 'Rate limit applied to user.' }
      ], 
      reportReason: 'Off-topic spamming' 
    },
    { 
      id: 21, 
      ticketId: 'USER #335577', 
      type: 'user', 
      submitter: 'DatabaseGuru', 
      timestamp: new Date(Date.now() - 1300 * 60 * 1000).toISOString(), 
      content: 'Creating duplicate fake accounts.',
      username: 'bot_creator_x',
      userSince: '02/28/2023',
      reportingHistory: '6 times reported',
      reportedBy: 'system_bot',
      additionalNotes: 'Automated fake account generation detected.',
      reportReason: 'Off-topic spamming'
    },
    { 
      id: 22, 
      ticketId: 'ROOM #446688', 
      type: 'room', 
      submitter: 'PixelCoder99', 
      timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(), 
      content: 'Disruptive room tags.',
      host: 'PixelCoder99',
      dateCreated: '01/05/2023',
      roomName: 'Code & Chaos',
      reportedBy: 'tag_checker',
      additionalNotes: 'none',
      reportReason: 'Off-topic noise'
    },
    { 
      id: 23, 
      ticketId: 'MESSAGE #557799', 
      type: 'message', 
      submitter: 'ShadowHacker', 
      timestamp: new Date(Date.now() - 1400 * 60 * 1000).toISOString(), 
      content: 'Threats directed at members.', 
      username: 'shadow_h', 
      userSince: '12/12/2022', 
      reportingHistory: '6 times reported', 
      reportedBy: 'victim_01', 
      additionalNotes: 'Direct threats sent.', 
      chatLog: [
        { timestamp: '[17:10]', sender: 'victim_01', text: 'Can someone assist with debugging?' },
        { timestamp: '[17:12]', sender: 'shadow_h', text: 'Threats directed at members.', isFlagged: true },
        { timestamp: '[17:13]', sender: 'victim_01', text: 'Reporting this harassment immediately.' },
        { timestamp: '[17:14]', sender: 'mod_team', text: 'Zero tolerance policy for threats.' }
      ], 
      reportReason: 'Harassment' 
    },
    { 
      id: 24, 
      ticketId: 'USER #668800', 
      type: 'user', 
      submitter: 'BadActor23', 
      timestamp: new Date(Date.now() - 1500 * 60 * 1000).toISOString(), 
      content: 'Spamming reports feature.',
      username: 'report_spammer',
      userSince: '10/01/2022',
      reportingHistory: '2 times reported',
      reportedBy: 'mod_queue',
      additionalNotes: 'Abusing report ticket submissions.',
      reportReason: 'Off-topic spamming'
    },
    { 
      id: 25, 
      ticketId: 'ROOM #779911', 
      type: 'room', 
      submitter: 'ChillStudent', 
      timestamp: new Date(Date.now() - 1600 * 60 * 1000).toISOString(), 
      content: 'Misleading room categorization.',
      host: 'ChillStudent',
      dateCreated: '06/20/2022',
      roomName: 'Study Zone 101',
      reportedBy: 'category_mod',
      additionalNotes: 'Misleading tags.',
      reportReason: 'Repeated room violation'
    },
    { 
      id: 26, 
      ticketId: 'MESSAGE #880022', 
      type: 'message', 
      submitter: 'AlgorithmMaps', 
      timestamp: new Date(Date.now() - 1700 * 60 * 1000).toISOString(), 
      content: 'Profanity in study notes link.', 
      username: 'algo_maps', 
      userSince: '04/05/2021', 
      reportingHistory: 'none', 
      reportedBy: 'student_99', 
      additionalNotes: 'none', 
      chatLog: [
        { timestamp: '[18:00]', sender: 'student_99', text: 'Sharing study notes for chapter 4.' },
        { timestamp: '[18:02]', sender: 'algo_maps', text: 'Profanity in study notes link.', isFlagged: true },
        { timestamp: '[18:03]', sender: 'student_99', text: 'That link contains inappropriate words.' },
        { timestamp: '[18:04]', sender: 'mod_team', text: 'Link deleted by moderation.' }
      ], 
      reportReason: 'Abusive language' 
    },
    { 
      id: 27, 
      ticketId: 'USER #991133', 
      type: 'user', 
      submitter: 'ByteCoder', 
      timestamp: new Date(Date.now() - 1800 * 60 * 1000).toISOString(), 
      content: 'Scamming users for credentials.',
      username: 'phish_lord',
      userSince: '05/05/2023',
      reportingHistory: '8 times reported',
      reportedBy: 'security_bot',
      additionalNotes: 'Credential harvesting attempts in DMs.',
      reportReason: 'Sharing personal information'
    },
    { 
      id: 28, 
      ticketId: 'ROOM #102244', 
      type: 'room', 
      submitter: 'RetroGamer', 
      timestamp: new Date(Date.now() - 1900 * 60 * 1000).toISOString(), 
      content: 'Improperly formatted room metadata.',
      host: 'RetroGamer',
      dateCreated: '03/22/2021',
      roomName: 'Retro Arcade Club',
      reportedBy: 'meta_admin',
      additionalNotes: 'none',
      reportReason: 'Explicit room name'
    },
    { 
      id: 29, 
      ticketId: 'MESSAGE #203355', 
      type: 'message', 
      submitter: 'BioHacker', 
      timestamp: new Date(Date.now() - 2000 * 60 * 1000).toISOString(), 
      content: 'Offensive language in public feed.', 
      username: 'bio_hacker', 
      userSince: '06/06/2022', 
      reportingHistory: '2 times reported', 
      reportedBy: 'mod_team', 
      additionalNotes: 'Offensive language', 
      chatLog: [
        { timestamp: '[19:15]', sender: 'mod_team', text: 'Evening check-in for study rooms.' },
        { timestamp: '[19:17]', sender: 'bio_hacker', text: 'Offensive language in public feed.', isFlagged: true },
        { timestamp: '[19:18]', sender: 'student_99', text: 'Unacceptable language in a public channel.' },
        { timestamp: '[19:20]', sender: 'mod_team', text: 'Official warning recorded.' }
      ], 
      reportReason: 'Abusive language' 
    },
    { 
      id: 30, 
      ticketId: 'USER #304466', 
      type: 'user', 
      submitter: 'ChemistryLab', 
      timestamp: new Date(Date.now() - 2100 * 60 * 1000).toISOString(), 
      content: 'Harassment in breakout session.',
      username: 'chem_troll',
      userSince: '09/14/2021',
      reportingHistory: '1 time reported',
      reportedBy: 'lab_lead',
      additionalNotes: 'none',
      reportReason: 'Harassment'
    },
    { 
      id: 31, 
      ticketId: 'ROOM #405577', 
      type: 'room', 
      submitter: 'HistoryBuff', 
      timestamp: new Date(Date.now() - 2200 * 60 * 1000).toISOString(), 
      content: 'Violation of community code.',
      host: 'HistoryBuff',
      dateCreated: '07/11/2020',
      roomName: 'Debate Arena',
      reportedBy: 'code_enforcer',
      additionalNotes: 'Cyberbullying reported in room channels.',
      reportReason: 'Cyberbullying space'
    },
    { 
      id: 32, 
      ticketId: 'MESSAGE #506688', 
      type: 'message', 
      submitter: 'MathWhiz', 
      timestamp: new Date(Date.now() - 2300 * 60 * 1000).toISOString(), 
      content: 'Spamming solution links.', 
      username: 'math_whiz_alt', 
      userSince: '07/07/2023', 
      reportingHistory: 'none', 
      reportedBy: 'peer_reviewer', 
      additionalNotes: 'none', 
      chatLog: [
        { timestamp: '[20:10]', sender: 'peer_reviewer', text: 'Homework assignments due tonight.' },
        { timestamp: '[20:12]', sender: 'math_whiz_alt', text: 'Spamming solution links.', isFlagged: true },
        { timestamp: '[20:13]', sender: 'peer_reviewer', text: 'Please do not post direct answer keys.' },
        { timestamp: '[20:15]', sender: 'mod_team', text: 'Please adhere to academic honesty guidelines.' }
      ], 
      reportReason: 'Off-topic spamming' 
    },
    { 
      id: 33, 
      ticketId: 'USER #607799', 
      type: 'user', 
      submitter: 'PhysicsGeek', 
      timestamp: new Date(Date.now() - 2400 * 60 * 1000).toISOString(), 
      content: 'Improper user conduct.',
      username: 'quantum_bad',
      userSince: '11/11/2022',
      reportingHistory: 'none',
      reportedBy: 'head_mod',
      additionalNotes: 'none',
      reportReason: 'Hate speech'
    },
    { 
      id: 34, 
      ticketId: 'ROOM #708800', 
      type: 'room', 
      submitter: 'LiteratureFan', 
      timestamp: new Date(Date.now() - 2500 * 60 * 1000).toISOString(), 
      content: 'Copyright infringement claims.',
      host: 'LiteratureFan',
      dateCreated: '10/15/2021',
      roomName: 'Book Share Club',
      reportedBy: 'copy_guard',
      additionalNotes: 'Infringement claims on uploaded material.',
      reportReason: 'Promoting illegal'
    },
    { 
      id: 35, 
      ticketId: 'MESSAGE #809911', 
      type: 'message', 
      submitter: 'MusicComposer', 
      timestamp: new Date(Date.now() - 2600 * 60 * 1000).toISOString(), 
      content: 'Disruptive audio feed notes.', 
      username: 'music_comp', 
      userSince: '10/30/2021', 
      reportingHistory: '1 time reported', 
      reportedBy: 'listener_one', 
      additionalNotes: 'Disruptive feed notes', 
      chatLog: [
        { timestamp: '[21:00]', sender: 'listener_one', text: 'Great ambient music stream tonight.' },
        { timestamp: '[21:02]', sender: 'music_comp', text: 'Disruptive audio feed notes.', isFlagged: true },
        { timestamp: '[21:03]', sender: 'listener_one', text: 'The feedback noise is quite loud.' },
        { timestamp: '[21:05]', sender: 'audio_mod', text: 'Sound levels checked and verified.' }
      ], 
      reportReason: 'Harassment' 
    }
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

  const hideTrends = dateRange === 'Today' || dateRange === 'All time';

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

  const metricsData = {
    totalReports: { value: '142', changeNum: '↑ 14%', positive: true },
    reportedMessages: { value: '89', changeNum: '↑ 9%', positive: true },
    reportedUsers: { value: '38', changeNum: '↑ 5%', positive: true },
    reportedRooms: { value: '15', changeNum: '↓ 3%', positive: false },
  };

  const todayMax = new Date().toISOString().split('T')[0];

  const sortedTickets = [...ticketsList].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const isTicketWithinSubmittedTimeframe = (timestampStr, filterVal) => {
    if (filterVal === 'Any time' || !filterVal) return true;

    const ticketTime = new Date(timestampStr).getTime();
    const now = Date.now();
    const diffMs = now - ticketTime;
    const diffMins = diffMs / (1000 * 60);
    const diffHours = diffMins / 60;
    const diffDays = diffHours / 24;

    const ticketDate = new Date(timestampStr);
    const nowDate = new Date();
    
    const ticketDay = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate()).getTime();
    const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    switch (filterVal) {
      case 'Within 5 minutes':
        return diffMins <= 5;
      case 'Within 15 minutes':
        return diffMins <= 15;
      case 'Within 30 minutes':
        return diffMins <= 30;
      case 'Within 1 hour':
        return diffHours <= 1;
      case 'Within 4 hours':
        return diffHours <= 4;
      case 'Within 12 hours':
        return diffHours <= 12;
      case 'Within 24 hours':
        return diffHours <= 24;
      case 'Today':
        return ticketDay === today;
      case 'Yesterday':
        return ticketDay === today - dayMs;
      case 'This week': {
        const dayOfWeek = nowDate.getDay();
        const startOfWeek = today - dayOfWeek * dayMs;
        return ticketDay >= startOfWeek;
      }
      case 'Last 7 days':
        return diffDays <= 7;
      case 'This month':
        return ticketDate.getMonth() === nowDate.getMonth() && ticketDate.getFullYear() === nowDate.getFullYear();
      case 'Last 30 days':
        return diffDays <= 30;
      case 'Last 60 days':
        return diffDays <= 60;
      case 'Last 180 days':
        return diffDays <= 180;
      default:
        return true;
    }
  };

  const filteredTickets = sortedTickets.filter((ticket) => {
    if (ticketGroupFilter === 'User report' && ticket.type !== 'user') return false;
    if (ticketGroupFilter === 'Message report' && ticket.type !== 'message') return false;
    if (ticketGroupFilter === 'Room report' && ticket.type !== 'room') return false;

    if (!isTicketWithinSubmittedTimeframe(ticket.timestamp, ticketSubmittedFilter)) {
      return false;
    }

    const query = searchQuery.toLowerCase();
    return (
      ticket.ticketId.toLowerCase().includes(query) ||
      ticket.submitter.toLowerCase().includes(query) ||
      ticket.content.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredTickets.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstRow, indexOfLastRow);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const isTicketNew = (timestampStr) => {
    const ticketTime = new Date(timestampStr).getTime();
    const now = Date.now();
    const diffMinutes = (now - ticketTime) / (1000 * 60);
    return diffMinutes < 10;
  };

  const formatTicketTimestamp = (timestampStr) => {
    const ticketTime = new Date(timestampStr);
    const now = new Date();
    const diffMinutes = Math.floor((now - ticketTime) / (1000 * 60));

    if (diffMinutes < 60 && diffMinutes >= 0) {
      return diffMinutes <= 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    }

    const mm = String(ticketTime.getMonth() + 1).padStart(2, '0');
    const dd = String(ticketTime.getDate()).padStart(2, '0');
    const yyyy = ticketTime.getFullYear();
    let hours = ticketTime.getHours();
    const minutes = String(ticketTime.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${mm}/${dd}/${yyyy} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Workflow Handlers
  const handleOpenTicketDetail = (ticket) => {
    setTicketToResolve(ticket);
    setActionReason('');
    setActionNotes('');
    setSuspensionDuration('24 Hours / 1 Day');
    setCustomSuspensionDate('');
    setShowChatLogModal(false);
    setActiveModalStep('detail');
  };

  const handleSubmitActionConfirmation = (actionType) => {
    setSuccessActionTitle(actionType);
    setActiveModalStep('success');
  };

  const handleCloseSuccessModal = () => {
    if (ticketToResolve) {
      const targetId = ticketToResolve.id;
      setFadingTicketIds((prev) => [...prev, targetId]);

      const isDismiss = successActionTitle.includes('Dismiss');
      const statusValue = isDismiss ? 'closed' : 'resolved';
      
      const resolvedEntry = {
        id: Date.now(),
        ticketId: ticketToResolve.ticketId,
        type: ticketToResolve.type,
        submitter: ticketToResolve.submitter,
        timestamp: new Date().toISOString(),
        status: statusValue,
        action: successActionTitle,
      };

      setTimeout(() => {
        setTicketsList((prev) => prev.filter((t) => t.id !== targetId));
        setFadingTicketIds((prev) => prev.filter((id) => id !== targetId));
        setResolvedTicketsList((prev) => [resolvedEntry, ...prev]);
        setActiveModalStep('none');
        setTicketToResolve(null);
      }, 300);
    } else {
      setActiveModalStep('none');
    }
  };

  // Real PDF Download Export Handler using jsPDF
  const handleDownloadResolvedPDF = () => {
    const filtered = resolvedTicketsList.filter((item) => {
      if (modalStatusFilter === 'Closed' && item.status !== 'closed') return false;
      if (modalStatusFilter === 'Resolved' && item.status !== 'resolved') return false;
      if (!isTicketWithinSubmittedTimeframe(item.timestamp, modalDateFilter)) return false;
      return true;
    });

    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Closed & Resolved Tickets Report", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Status Filter: ${modalStatusFilter} | Date Filter: ${modalDateFilter}`, 14, 34);

    let yPos = 44;
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    if (filtered.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.text("No tickets match the selected filters.", 14, yPos);
    } else {
      filtered.forEach((ticket, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`${index + 1}. Ticket ID: ${ticket.ticketId}`, 14, yPos);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Status: ${ticket.status.toUpperCase()} | Submitter: ${ticket.submitter}`, 14, yPos + 6);
        doc.text(`Action: ${ticket.action}`, 14, yPos + 12);
        doc.text(`Timestamp: ${new Date(ticket.timestamp).toLocaleString()}`, 14, yPos + 18);

        yPos += 26;
        doc.setLineWidth(0.2);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos - 4, 196, yPos - 4);
      });
    }

    doc.save(`Resolved_Tickets_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const renderReportIcon = (type) => {
    if (type === 'message') {
      return (
        <div className="w-9 h-9 rounded-full bg-[#FFB703] text-white flex items-center justify-center shrink-0 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M11 8h2v4.5h-2zM11 14h2v2h-2z" />
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
              setCurrentPage(1);
            }}
            placeholder="Search reports by Ticket ID or Username..."
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

      {/* ROW 2: 4 METRIC CARDS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: Total Reports */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v-2zm-3-5V3.5L18.5 9H13z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">TOTAL REPORTS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.totalReports.value}</h3>
            {!hideTrends && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.totalReports.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.totalReports.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Reported Messages */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">REPORTED MESSAGES</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.reportedMessages.value}</h3>
            {!hideTrends && (
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className={`font-pressstart text-[9px] ${metricsData.reportedMessages.positive ? 'text-theme-safe' : 'text-theme-danger'}`}>
                  {metricsData.reportedMessages.changeNum}
                </span>
                <span className="font-pressstart text-[7px] text-theme-dark">
                  {getTimeframeLabel()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: Reported Users */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">REPORTED USERS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.reportedUsers.value}</h3>
            {!hideTrends && (
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

        {/* CARD 4: Reported Rooms */}
        <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-5 shadow-md flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-full bg-theme-muted border border-theme-dark flex items-center justify-center shrink-0 text-theme-primary self-start">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 4h14q.425 0 .713.288T20 5t-.288.713T19 6H5q-.425 0-.712-.288T4 5t.288-.712T5 4m0 16q-.425 0-.712-.288T4 19v-5h-.175q-.475 0-.775-.363t-.2-.837l1-5q.075-.35.35-.575T4.825 7h14.35q.35 0 .625.225t.35.575l1 5q.1.475-.2.837t-.775.363H20v5q0 .425-.288.713T13 20zm1-2h6v-4H6zm-.95-6h13.9zm0 0h13.9l-.6-3H5.65z" />
            </svg>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">REPORTED ROOMS</span>
            <h3 className="font-pressstart text-[20px] sm:text-[24px] text-theme-dark mt-1 truncate">{metricsData.reportedRooms.value}</h3>
            {!hideTrends && (
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

      {/* ROW 3: TWO-COLUMN CONTAINER GRID SECTION (70% / 30%) */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        
        {/* Left Column (70% width) - Tickets Feed / Ledger Component */}
        <div className="w-full lg:w-[70%] flex flex-col justify-between">
          <div>

            {/* Scrollable Container Area */}
            <div className="overflow-y-auto max-h-[630px] flex flex-col gap-3 pr-2 p-1 border-b-2 border-theme-dark/30">
              {currentTickets.length > 0 ? (
                currentTickets.map((ticket) => {
                  const isNew = isTicketNew(ticket.timestamp);
                  const isFading = fadingTicketIds.includes(ticket.id);

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => handleOpenTicketDetail(ticket)}
                      className={`bg-theme-surface border-2 border-theme-dark rounded-[10px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 retro-shadow cursor-pointer hover:bg-theme-muted/40 ${
                        isFading ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {renderReportIcon(ticket.type)}
                        <div className="flex flex-col min-w-0">
                          {isNew && (
                            <span className="inline-block font-pressstart text-[7px] bg-theme-safe text-white px-2 py-0.5 rounded-[4px] w-fit mb-1 shadow-2xs">
                              NEW
                            </span>
                          )}
                          <span className="font-pressstart text-[11px] sm:text-[14px] text-theme-dark">
                            {ticket.ticketId}
                          </span>
                          <span className="font-pixel text-[15px] sm:text-[18px] text-theme-dark mt-1">
                            Submitted {formatTicketTimestamp(ticket.timestamp)} by {ticket.submitter}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center font-pixel text-lg text-theme-dark/60">
                  No reports found matching your search criteria.
                </div>
              )}
            </div>
          </div>

          {/* Pagination Controls Fixed at Bottom Outside Scroll Container */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <span className="font-pixel text-[14px] sm:text-[16px] text-theme-dark/80">
              Showing {filteredTickets.length > 0 ? indexOfFirstRow + 1 : 0}-{Math.min(indexOfLastRow, filteredTickets.length)} of {filteredTickets.length} tickets
            </span>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 font-pressstart text-[10px] bg-theme-surface hover:bg-theme-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors rounded-[6px]"
              >
                &lt;
              </button>

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

        {/* Right Column (30% width) - Stacked Vertically */}
        <div className="w-full lg:w-[30%] flex flex-col gap-6">
          
          {/* Top Row Container (~35% proportion) with Interactive Group & Submitted Filter Dropdowns */}
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-3 shadow-md h-[35%] min-h-[140px] flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-4 h-4 sm:w-6 sm:h-6 text-theme-primary shrink-0">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 5.6c0-.56 0-.84-.11-1.054a1 1 0 0 0-.436-.437C19.24 4 18.96 4 18.4 4H5.6c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C4 4.76 4 5.04 4 5.6v.737c0 .245 0 .367.028.482a1 1 0 0 0 .12.29c.061.1.148.187.32.36l5.063 5.062c.173.173.26.26.321.36q.083.136.12.29c.028.114.028.235.028.474v4.756c0 .857 0 1.286.18 1.544a1 1 0 0 0 .674.416c.311.046.695-.145 1.461-.529l.8-.4c.322-.16.482-.24.599-.36a1 1 0 0 0 .231-.374c.055-.158.055-.338.055-.697v-4.348c0-.245 0-.367.028-.482a1 1 0 0 1 .12-.29c.06-.1.147-.186.317-.356l.004-.004l5.063-5.062c.172-.173.258-.26.32-.36q.083-.136.12-.29C20 6.706 20 6.584 20 6.345z" />
              </svg>
              <h3 className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">
                Filter Reports Feed
              </h3>
            </div>
            <div className="flex flex-col gap-3 my-auto">
              <div className="flex flex-col gap-1">
                <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Group Filter:</label>
                <select
                  value={ticketGroupFilter}
                  onChange={(e) => {
                    setTicketGroupFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="font-pixel text-[15px] sm:text-[20px] bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2 text-theme-dark outline-none cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="User report">User report</option>
                  <option value="Message report">Message report</option>
                  <option value="Room report">Room report</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Submitted Timeframe:</label>
                <select
                  value={ticketSubmittedFilter}
                  onChange={(e) => {
                    setTicketSubmittedFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="font-pixel text-[15px] sm:text-[20px] bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2 text-theme-dark outline-none cursor-pointer"
                >
                  <option value="Any time">Any time</option>
                  <option value="Within 5 minutes">Within 5 minutes</option>
                  <option value="Within 15 minutes">Within 15 minutes</option>
                  <option value="Within 30 minutes">Within 30 minutes</option>
                  <option value="Within 1 hour">Within 1 hour</option>
                  <option value="Within 4 hours">Within 4 hours</option>
                  <option value="Within 12 hours">Within 12 hours</option>
                  <option value="Within 24 hours">Within 24 hours</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This week">This week</option>
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="This month">This month</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 60 days">Last 60 days</option>
                  <option value="Last 180 days">Last 180 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Row Container (~65% proportion) - CLOSED/RESOLVED TICKETS */}
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 shadow-md h-[65%] min-h-[260px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-theme-primary shrink-0">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <h3 className="font-pixel text-[18px] sm:text-[24px] text-theme-dark uppercase">
                  CLOSED/RESOLVED
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResolvedHistoryModal(true)}
                className="font-pixel text-[14px] sm:text-[16px] text-theme-primary hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Scrollable Mini-Preview Feed - Updated with Minimalist List Layout */}
            <div className="overflow-y-auto flex-1 flex flex-col pr-1">
              {resolvedTicketsList.length > 0 ? (
                resolvedTicketsList.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="py-2 border-b border-theme-dark/10 last:border-b-0 flex items-center justify-between gap-2 bg-transparent transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.status === 'resolved' ? 'bg-theme-primary' : 'bg-theme-safe'}`}></div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-pixel text-[15px] sm:text-[20px] text-theme-dark truncate">
                          {item.ticketId}
                        </span>
                        <span className="font-pixel text-[12px] sm:text-[14px] truncate">
                          {item.action} • {formatTicketTimestamp(item.timestamp)}
                        </span>
                      </div>
                    </div>
                    <span className={`font-pixel text-[10px] sm:text-[15px] px-1.5 py-0.5 rounded uppercase shrink-0 ${
                      item.status === 'resolved' ? 'bg-theme-primary/25 text-theme-primary' : 'bg-theme-safe/25 text-theme-safe'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="my-auto text-center font-pixel text-[14px] text-theme-dark/60">
                  No resolved or closed tickets yet.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* MULTI-STEP TICKET RESOLUTION MODALS */}
      {activeModalStep !== 'none' && ticketToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          
          {/* STEP 1: DETAIL MODAL (MESSAGE, ROOM, OR USER) */}
          {activeModalStep === 'detail' && (
            <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-lg w-full shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b-2 border-theme-dark/10 pb-3">
                <div className="flex items-center gap-2">
                  {renderReportIcon(ticketToResolve.type)}
                  <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark uppercase">
                    REPORT DETAILS: {ticketToResolve.ticketId}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModalStep('none')}
                  className="font-pressstart text-[12px] text-theme-dark hover:text-theme-danger cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Message Report Details Section */}
              {ticketToResolve.type === 'message' ? (
                <div className="flex flex-col gap-3">
                  {/* PFP & Grid Layout */}
                  <div className="flex items-start gap-4 bg-theme-muted/40 border border-theme-dark/20 rounded-[8px] p-3.5">
                    <div className="w-12 h-12 rounded-full bg-theme-primary text-white font-pressstart text-[14px] flex items-center justify-center shrink-0 border border-theme-dark">
                      {ticketToResolve.username ? ticketToResolve.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1 min-w-0 font-pixel text-[15px] sm:text-[20px] text-theme-dark">
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Username:</span>
                        <span className="text-theme-dark">{ticketToResolve.username || ticketToResolve.submitter}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">User since:</span>
                        <span className="text-theme-dark">{ticketToResolve.userSince || '10/10/2021'}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Reporting History:</span>
                        <span className="text-theme-danger">{ticketToResolve.reportingHistory || 'none'}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Reported by:</span>
                        <span className="text-theme-dark">{ticketToResolve.reportedBy || 'admin'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Border Separator Line */}
                  <hr className="border-t-2 border-theme-dark/10 my-1" />

                  {/* Additional Notes Section */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Additional Notes:</span>
                      <button
                        type="button"
                        onClick={() => setShowChatLogModal(true)}
                        className="font-pixel text-[14px] sm:text-[18px] text-theme-primary hover:underline cursor-pointer"
                      >
                        VIEW CHAT
                      </button>
                    </div>
                    <div className="bg-theme-surface border border-theme-dark/20 p-2.5 rounded-[8px] font-pixel text-[15px] sm:text-[20px] text-theme-dark min-h-[44px]">
                      {ticketToResolve.additionalNotes || ticketToResolve.content || 'none'}
                    </div>
                  </div>

                  {/* Report Reason Section */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Report Reason:</span>
                    <div className="bg-theme-muted border border-theme-dark/30 px-3 py-2 rounded-[8px] font-pressstart text-[9px] text-theme-primary w-fit uppercase select-none">
                      {ticketToResolve.reportReason || 'Abusive language'}
                    </div>
                  </div>
                </div>
              ) : ticketToResolve.type === 'room' ? (
                <div className="flex flex-col gap-3">
                  {/* PFP & Grid Layout */}
                  <div className="flex items-start gap-4 bg-theme-muted/40 border border-theme-dark/20 rounded-[8px] p-3.5">
                    <div className="w-12 h-12 rounded-full bg-theme-danger text-white font-pressstart text-[14px] flex items-center justify-center shrink-0 border border-theme-dark">
                      {ticketToResolve.roomName ? ticketToResolve.roomName.charAt(0).toUpperCase() : 'R'}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1 min-w-0 font-pixel text-[15px] sm:text-[20px] text-theme-dark">
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Host:</span>
                        <span className="text-theme-dark">{ticketToResolve.host || ticketToResolve.submitter}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Date Created:</span>
                        <span className="text-theme-dark">{ticketToResolve.dateCreated || '05/01/2022'}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Room Name:</span>
                        <span className="text-theme-dark">{ticketToResolve.roomName || 'Study Room'}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Reported by:</span>
                        <span className="text-theme-dark">{ticketToResolve.reportedBy || 'admin'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Border Separator Line */}
                  <hr className="border-t-2 border-theme-dark/10 my-1" />

                  {/* Additional Notes Section */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Additional Notes:</span>
                    <div className="bg-theme-surface border border-theme-dark/20 p-2.5 rounded-[8px] font-pixel text-[15px] sm:text-[20px] text-theme-dark min-h-[44px]">
                      {ticketToResolve.additionalNotes || ticketToResolve.content || 'none'}
                    </div>
                  </div>

                  {/* Report Reason Section */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Report Reason:</span>
                    <div className="bg-theme-muted border border-theme-dark/30 px-3 py-2 rounded-[8px] font-pressstart text-[9px] text-theme-primary w-fit uppercase select-none">
                      {ticketToResolve.reportReason || 'Explicit room name'}
                    </div>
                  </div>
                </div>
              ) : ticketToResolve.type === 'user' ? (
                <div className="flex flex-col gap-3">
                  {/* PFP & Grid Layout */}
                  <div className="flex items-start gap-4 bg-theme-muted/40 border border-theme-dark/20 rounded-[8px] p-3.5">
                    <div className="w-12 h-12 rounded-full bg-theme-primary text-white font-pressstart text-[14px] flex items-center justify-center shrink-0 border border-theme-dark">
                      {ticketToResolve.username ? ticketToResolve.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1 min-w-0 font-pixel text-[15px] sm:text-[20px] text-theme-dark">
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Username:</span>
                        <span className="text-theme-dark">{ticketToResolve.username || ticketToResolve.submitter}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">User since:</span>
                        <span className="text-theme-dark">{ticketToResolve.userSince || '03/15/2021'}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Reporting History:</span>
                        <span className="text-theme-danger">{ticketToResolve.reportingHistory || 'none'}</span>
                      </div>
                      <div>
                        <span className="text-theme-dark/60 block text-[15px] sm:text-[20px]">Reported by:</span>
                        <span className="text-theme-dark">{ticketToResolve.reportedBy || 'admin'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Border Separator Line */}
                  <hr className="border-t-2 border-theme-dark/10 my-1" />

                  {/* Additional Notes Section */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Additional Notes:</span>
                    <div className="bg-theme-surface border border-theme-dark/20 p-2.5 rounded-[8px] font-pixel text-[15px] sm:text-[20px] text-theme-dark min-h-[44px]">
                      {ticketToResolve.additionalNotes || ticketToResolve.content || 'none'}
                    </div>
                  </div>

                  {/* Report Reason Section */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Report Reason:</span>
                    <div className="bg-theme-muted border border-theme-dark/30 px-3 py-2 rounded-[8px] font-pressstart text-[9px] text-theme-primary w-fit uppercase select-none">
                      {ticketToResolve.reportReason || 'Harassment'}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* 3 Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalStep('dismiss')}
                  className="flex-1 bg-theme-surface text-theme-dark border-2 border-theme-dark py-2.5 px-3 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow text-center shadow-xs"
                >
                  DISMISS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalStep('warning')}
                  className="flex-1 bg-theme-primary text-white border-2 border-theme-dark py-2.5 px-3 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow text-center"
                >
                  WARNING
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalStep(ticketToResolve.type === 'room' ? 'closure' : 'suspension')}
                  className="flex-1 bg-theme-danger text-white border-2 border-theme-dark py-2.5 px-3 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow text-center"
                >
                  {ticketToResolve.type === 'room' ? 'CLOSE' : 'SUSPEND'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2A: DISMISS MODAL WITH GRANULAR OPTIONS */}
          {activeModalStep === 'dismiss' && (
            <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
              <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">Dismiss Report</h3>
              <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark/80">
                Marking ticket <span className="text-theme-primary">{ticketToResolve.ticketId}</span> as closed with no violation.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Reason:</label>
                  <select
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="font-pixel bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none cursor-pointer"
                  >
                    <option value="">Select dismissal reason...</option>
                    <option value="Insufficient evidence">Insufficient evidence</option>
                    <option value="Misunderstanding">Misunderstanding</option>
                    <option value="Spam">Spam</option>
                    <option value="Duplicate report">Duplicate report</option>
                    <option value="No violation found">No violation found</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Additional Notes (Optional):</label>
                  <textarea
                    rows="3"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Enter internal dismiss notes..."
                    className="font-pixel bg-theme-muted border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalStep('detail')}
                  className="bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!actionReason}
                  onClick={() => handleSubmitActionConfirmation('Dismiss Report')}
                  className="bg-theme-safe text-white border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Dismissal
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: WARNING MODAL WITH GRANULAR OPTIONS */}
          {activeModalStep === 'warning' && (
            <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
              <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">Issue Warning</h3>
              <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark/80">
                Issue an official warning for ticket <span className="text-theme-primary">{ticketToResolve.ticketId}</span>.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Reason:</label>
                  <select
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="font-pixel bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none cursor-pointer"
                  >
                    <option value="">Select warning reason...</option>
                    {ticketToResolve.type === 'room' ? (
                      <>
                        <option value="Explicit room name">Explicit room name</option>
                        <option value="Cyberbullying space">Cyberbullying space</option>
                        <option value="Off-topic noise">Off-topic noise</option>
                        <option value="Promoting illegal">Promoting illegal</option>
                        <option value="Repeated room violation">Repeated room violation</option>
                      </>
                    ) : (
                      <>
                        <option value="Abusive language">Abusive language</option>
                        <option value="Off-topic spamming">Off-topic spamming</option>
                        <option value="Hate speech">Hate speech</option>
                        <option value="Adult content">Adult content</option>
                        <option value="Harassment">Harassment</option>
                        <option value="Sharing personal information">Sharing personal information</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Additional Notes (Optional):</label>
                  <textarea
                    rows="3"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Enter warning details..."
                    className="font-pixel bg-theme-muted border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalStep('detail')}
                  className="bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!actionReason}
                  onClick={() => handleSubmitActionConfirmation('Issue Warning')}
                  className="bg-theme-primary text-white border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Warning
                </button>
              </div>
            </div>
          )}

          {/* STEP 2C: SUSPENSION MODAL (FOR USERS/MESSAGES) */}
          {activeModalStep === 'suspension' && (
            <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-md w-full shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">Suspend User / Content</h3>
              <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark/80">
                Apply suspension for ticket <span className="text-theme-primary">{ticketToResolve.ticketId}</span>.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Reason:</label>
                  <select
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="font-pixel bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none cursor-pointer"
                  >
                    <option value="">Select suspension reason...</option>
                    <option value="Abusive language">Abusive language</option>
                    <option value="Off-topic spamming">Off-topic spamming</option>
                    <option value="Hate speech">Hate speech</option>
                    <option value="Adult content">Adult content</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Sharing personal information">Sharing personal information</option>
                    <option value="Repeat offender">Repeat offender</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Duration:</label>
                  <select
                    value={suspensionDuration}
                    onChange={(e) => setSuspensionDuration(e.target.value)}
                    className="font-pixel bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none cursor-pointer"
                  >
                    <option value="24 Hours / 1 Day">24 Hours / 1 Day</option>
                    <option value="3 Days">3 Days</option>
                    <option value="7 Days / 1 Week">7 Days / 1 Week</option>
                    <option value="14 Days / 2 Weeks">14 Days / 2 Weeks</option>
                    <option value="30 Days / 1 Month">30 Days / 1 Month</option>
                    <option value="90 Days / 3 Months">90 Days / 3 Months</option>
                    <option value="Permanent / Indefinite">Permanent / Indefinite</option>
                    <option value="Custom">Custom Date/Time</option>
                  </select>
                </div>

                {suspensionDuration === 'Custom' && (
                  <div className="flex flex-col gap-1">
                    <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Custom Expiration Date/Time:</label>
                    <input
                      type="datetime-local"
                      value={customSuspensionDate}
                      onChange={(e) => setCustomSuspensionDate(e.target.value)}
                      className="font-pixel bg-theme-muted border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Additional Notes (Optional):</label>
                  <textarea
                    rows="3"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Enter suspension justification..."
                    className="font-pixel bg-theme-muted border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalStep('detail')}
                  className="bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!actionReason}
                  onClick={() => handleSubmitActionConfirmation('Suspend User')}
                  className="bg-theme-danger text-white border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Suspension
                </button>
              </div>
            </div>
          )}

          {/* STEP 2D: CLOSURE MODAL (FOR ROOMS) */}
          {activeModalStep === 'closure' && (
            <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-md w-full shadow-xl flex flex-col gap-4">
              <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">Close Room / Content</h3>
              <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark/80">
                Apply room closure for ticket <span className="text-theme-primary">{ticketToResolve.ticketId}</span>.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Reason:</label>
                  <select
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="font-pixel bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none cursor-pointer"
                  >
                    <option value="">Select closure reason...</option>
                    <option value="Explicit room name">Explicit room name</option>
                    <option value="Cyberbullying space">Cyberbullying space</option>
                    <option value="Off-topic noise">Off-topic noise</option>
                    <option value="Promoting illegal">Promoting illegal</option>
                    <option value="Repeated room violation">Repeated room violation</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-pixel text-[15px] sm:text-[20px] text-theme-dark">Additional Notes (Optional):</label>
                  <textarea
                    rows="3"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Enter closure details..."
                    className="font-pixel bg-theme-muted border-2 border-theme-dark rounded-[8px] p-2.5 text-theme-dark text-[15px] sm:text-[20px] outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalStep('detail')}
                  className="bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!actionReason}
                  onClick={() => handleSubmitActionConfirmation('Close Room / Content')}
                  className="bg-theme-danger text-white border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Closure
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS MODAL */}
          {activeModalStep === 'success' && (
            <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-theme-safe text-white flex items-center justify-center">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" />
                </svg>
              </div>
              <h3 className="font-pressstart text-[12px] text-theme-dark uppercase">Action Successful</h3>
              <p className="font-pixel text-[16px] sm:text-[20px] text-theme-dark/80">
                Ticket <span className="text-theme-primary">{ticketToResolve.ticketId}</span> has been successfully processed via {successActionTitle}
              </p>
              <button
                type="button"
                onClick={handleCloseSuccessModal}
                className="w-full bg-theme-primary text-white border-2 border-theme-dark py-2.5 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow mt-2"
              >
                Close & Update Feed
              </button>
            </div>
          )}

        </div>
      )}

      {/* CHAT LOG PREVIEW MODAL */}
      {showChatLogModal && ticketToResolve && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 max-w-lg w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b-2 border-theme-dark/10 pb-2.5">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5 text-theme-primary shrink-0">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8h4a1 1 0 0 1 1 1v11l-3.333-2.769a1 1 0 0 0-.64-.231H9a1 1 0 0 1-1-1v-3m8-5V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11l3.333-2.77c.18-.148.406-.23.64-.23H8m8-5v4a1 1 0 0 1-1 1H8" />
                </svg>
                <h3 className="font-pressstart text-[10px] sm:text-[12px] text-theme-dark uppercase">
                  CHAT LOG: {ticketToResolve.ticketId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChatLogModal(false)}
                className="font-pressstart text-[11px] text-theme-dark hover:text-theme-danger cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-theme-muted border border-theme-dark/20 rounded-[8px] p-3 flex flex-col gap-2 max-h-[320px] overflow-y-auto">
              {ticketToResolve.chatLog && ticketToResolve.chatLog.length > 0 ? (
                ticketToResolve.chatLog.map((chat, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-[8px] border font-pixel text-[15px] sm:text-[18px] flex flex-col gap-1 ${
                      chat.isFlagged
                        ? 'bg-theme-danger/15 border-theme-danger text-theme-danger'
                        : 'bg-theme-surface border-theme-dark/15 text-theme-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between font-pixel text-[15px] sm:text-[18px]">
                      <span>{chat.timestamp} {chat.sender}:</span>
                      {chat.isFlagged && (
                        <span className="bg-theme-danger text-white font-pixel text-[10px] sm:text-[15px] px-1.5 py-0.5 rounded uppercase">
                          FLAGGED
                        </span>
                      )}
                    </div>
                    <div className="font-pixel text-[15px] sm:text-[18px]">{chat.text}</div>
                  </div>
                ))
              ) : (
                <p className="font-pixel text-[15px] sm:text-[20px] text-theme-dark/60 text-center py-4">No chat log available.</p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowChatLogModal(false)}
                className="bg-theme-primary text-theme-surface border-2 border-theme-dark px-5 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:bg-theme-muted retro-shadow shadow-xs"
              >
                BACK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ALL CLOSED/RESOLVED TICKETS HISTORY MODAL */}
      {showResolvedHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-3xl w-full shadow-xl flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between border-b-2 border-theme-dark/10 pb-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-5 h-5 text-theme-primary">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <h3 className="font-pressstart text-[12px] sm:text-[14px] text-theme-dark uppercase">
                  CLOSED & RESOLVED TICKETS HISTORY
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResolvedHistoryModal(false)}
                className="font-pressstart text-[12px] text-theme-dark hover:text-theme-danger cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              <div className="flex flex-col gap-1">
                <label className="font-pixel text-[14px] sm:text-[18px] text-theme-dark">Status Filter:</label>
                <select
                  value={modalStatusFilter}
                  onChange={(e) => setModalStatusFilter(e.target.value)}
                  className="font-pixel bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2 text-theme-dark text-[14px] sm:text-[18px] outline-none cursor-pointer"
                >
                  <option value="All status">All status</option>
                  <option value="Closed">Closed</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-pixel text-[14px] sm:text-[18px] text-theme-dark">Date Filter:</label>
                <select
                  value={modalDateFilter}
                  onChange={(e) => setModalDateFilter(e.target.value)}
                  className="font-pixel bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2 text-theme-dark text-[14px] sm:text-[18px] outline-none cursor-pointer"
                >
                  <option value="Any time">Any time</option>
                  <option value="Within 5 minutes">Within 5 minutes</option>
                  <option value="Within 15 minutes">Within 15 minutes</option>
                  <option value="Within 30 minutes">Within 30 minutes</option>
                  <option value="Within 1 hour">Within 1 hour</option>
                  <option value="Within 4 hours">Within 4 hours</option>
                  <option value="Within 12 hours">Within 12 hours</option>
                  <option value="Within 24 hours">Within 24 hours</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This week">This week</option>
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="This month">This month</option>
                  <option value="Last 30 days">Last 30 days</option>
                </select>
              </div>
            </div>

            {/* Filtered List Feed inside Modal */}
            <div className="overflow-y-auto flex-1 flex flex-col gap-3 pr-2 py-2 border-t border-b border-theme-dark/10">
              {resolvedTicketsList.filter((item) => {
                if (modalStatusFilter === 'Closed' && item.status !== 'closed') return false;
                if (modalStatusFilter === 'Resolved' && item.status !== 'resolved') return false;
                if (!isTicketWithinSubmittedTimeframe(item.timestamp, modalDateFilter)) return false;
                return true;
              }).length > 0 ? (
                resolvedTicketsList.filter((item) => {
                  if (modalStatusFilter === 'Closed' && item.status !== 'closed') return false;
                  if (modalStatusFilter === 'Resolved' && item.status !== 'resolved') return false;
                  if (!isTicketWithinSubmittedTimeframe(item.timestamp, modalDateFilter)) return false;
                  return true;
                }).map((item) => (
                  <div
                    key={item.id}
                    className="bg-theme-surface border-2 border-theme-dark/40 rounded-[8px] p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {renderReportIcon(item.type)}
                      <div className="flex flex-col min-w-0">
                        <span className="font-pressstart text-[11px] text-theme-dark">
                          {item.ticketId}
                        </span>
                        <span className="font-pixel text-[14px] sm:text-[18px] text-theme-dark/80 mt-0.5">
                          Submitted by {item.submitter} • Action: <span className="text-theme-primary">{item.action}</span>
                        </span>
                        <span className="font-pixel text-[12px] sm:text-[16px] text-theme-dark/60 mt-0.5">
                          {formatTicketTimestamp(item.timestamp)}
                        </span>
                      </div>
                    </div>
                    <span className={`font-pressstart text-[8px] px-2 py-1 rounded uppercase shrink-0 ${
                      item.status === 'resolved' ? 'bg-theme-primary text-white' : 'bg-theme-safe text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center font-pixel text-[16px] sm:text-[20px] text-theme-dark/60">
                  No tickets match the selected filters.
                </div>
              )}
            </div>

            {/* Modal Footer / Download Button */}
            <div className="flex items-center justify-between pt-4 mt-2">
              <span className="font-pixel text-[14px] sm:text-[18px] text-theme-dark/70">
                Showing filtered history items
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDownloadResolvedPDF}
                  className="bg-theme-primary text-white border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-90 retro-shadow flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="w-3.5 h-3.5">
                    <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7l7-7M5 18v2h14v-2H5z"/>
                  </svg>
                  Download Report [PDF]
                </button>
                <button
                  type="button"
                  onClick={() => setShowResolvedHistoryModal(false)}
                  className="bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[9px] cursor-pointer hover:opacity-80"
                >
                  Close
                </button>
              </div>
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
              Choose a specific start date and end date to filter reports.
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