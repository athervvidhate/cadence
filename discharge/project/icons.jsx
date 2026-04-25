// DischargeCoach — minimal line icons
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const Icon = ({ size = 20, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>{children}</svg>
);

const IconHeart = (p) => <Icon {...p}><path {...stroke} d="M12 19s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 9c0 5.5-7 10-7 10Z"/></Icon>;
const IconCamera = (p) => <Icon {...p}><path {...stroke} d="M3 8h3l2-2h8l2 2h3v11H3z"/><circle {...stroke} cx="12" cy="13" r="3.5"/></Icon>;
const IconMic = (p) => <Icon {...p}><rect {...stroke} x="9" y="3" width="6" height="12" rx="3"/><path {...stroke} d="M5 11a7 7 0 0 0 14 0M12 18v3"/></Icon>;
const IconPill = (p) => <Icon {...p}><rect {...stroke} x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)"/><path {...stroke} d="m9 7 8 8" /></Icon>;
const IconCheck = (p) => <Icon {...p}><path {...stroke} d="m4 12 5 5L20 6"/></Icon>;
const IconClose = (p) => <Icon {...p}><path {...stroke} d="M6 6l12 12M18 6 6 18"/></Icon>;
const IconAlert = (p) => <Icon {...p}><path {...stroke} d="M12 3 2 20h20L12 3Z"/><path {...stroke} d="M12 10v4M12 17v.5"/></Icon>;
const IconBell = (p) => <Icon {...p}><path {...stroke} d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z"/><path {...stroke} d="M10 21h4"/></Icon>;
const IconCal = (p) => <Icon {...p}><rect {...stroke} x="3" y="5" width="18" height="16" rx="2"/><path {...stroke} d="M3 10h18M8 3v4M16 3v4"/></Icon>;
const IconUser = (p) => <Icon {...p}><circle {...stroke} cx="12" cy="8" r="4"/><path {...stroke} d="M4 21c1-4 4-6 8-6s7 2 8 6"/></Icon>;
const IconWeight = (p) => <Icon {...p}><path {...stroke} d="M5 7h14l-2 13H7L5 7Z"/><path {...stroke} d="M9 7a3 3 0 0 1 6 0"/></Icon>;
const IconLung = (p) => <Icon {...p}><path {...stroke} d="M12 4v9M8 13c0 4-2 6-4 6-1 0-1.5-1-1.5-2.5C2.5 13 5 8 8 8M16 13c0 4 2 6 4 6 1 0 1.5-1 1.5-2.5C21.5 13 19 8 16 8"/></Icon>;
const IconHome = (p) => <Icon {...p}><path {...stroke} d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9Z"/></Icon>;
const IconChart = (p) => <Icon {...p}><path {...stroke} d="M4 20V4M4 20h16"/><path {...stroke} d="m7 16 4-5 3 3 5-7"/></Icon>;
const IconChevron = (p) => <Icon {...p}><path {...stroke} d="m9 6 6 6-6 6"/></Icon>;
const IconChevronL = (p) => <Icon {...p}><path {...stroke} d="m15 6-6 6 6 6"/></Icon>;
const IconDoc = (p) => <Icon {...p}><path {...stroke} d="M6 3h9l4 4v14H6V3Z"/><path {...stroke} d="M14 3v5h5M9 13h7M9 17h5"/></Icon>;
const IconPhone = (p) => <Icon {...p}><path {...stroke} d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></Icon>;
const IconWave = (p) => <Icon {...p}><path {...stroke} d="M3 12h2l2-7 3 14 3-10 2 6 2-3h4"/></Icon>;
const IconSettings = (p) => <Icon {...p}><circle {...stroke} cx="12" cy="12" r="3"/><path {...stroke} d="M19.4 14.6 21 13l-1.6-1.6L21 9.8 19.4 8.2 17.8 6.6 16.2 5l-1.6 1.6L13 5l-1.6 1.6L11.4 5 9.8 6.6 8.2 8.2 6.6 9.8 5 11.4 6.6 13 5 14.6l1.6 1.6L5 17.8 6.6 19.4 8.2 21l1.6-1.6L11.4 21l1.6-1.6L14.6 21l1.6-1.6 1.6-1.6 1.6-1.6 1.6-1.6Z"/></Icon>;
const IconSpark = (p) => <Icon {...p}><path {...stroke} d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></Icon>;
const IconDownload = (p) => <Icon {...p}><path {...stroke} d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/></Icon>;
const IconShield = (p) => <Icon {...p}><path {...stroke} d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/></Icon>;

Object.assign(window, { Icon, IconHeart, IconCamera, IconMic, IconPill, IconCheck, IconClose, IconAlert, IconBell, IconCal, IconUser, IconWeight, IconLung, IconHome, IconChart, IconChevron, IconChevronL, IconDoc, IconPhone, IconWave, IconSettings, IconSpark, IconDownload, IconShield });
