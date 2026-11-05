import SecurityInvestigationDrawer from '../components/ui/SecurityInvestigationDrawer';
import SecurityThreatChart from '../components/charts/SecurityThreatChart';
import { useNewSecurityEvents } from '../hooks/useNewSecurityEvents';
import SecurityCoverage from '../components/SecurityCoverage';
import SecurityAlerts from '../components/SecurityAlerts';
import AllSecurityLogs from '../components/AllSecurityLogs';
import SecurityActivityMap from '../components/SecurityActivityMap';
import { useState, useEffect } from 'react';
import { useSecurityOverview } from '../hooks/useSecurityOverview';
const assetPathPrefix = "/assets";
const imgOriginalLogoArtwork = `${assetPathPrefix}/c8aca.png`;
const imgLayoutDashboard = `${assetPathPrefix}/651b9.svg`;
const imgTriangleAlert = `${assetPathPrefix}/7412e.svg`;
const imgClipboardPlus = `${assetPathPrefix}/82d8b.svg`;
const imgFileSearch = `${assetPathPrefix}/83d18.svg`;
const imgSearchCode = `${assetPathPrefix}/746d6.svg`;
const imgList = `${assetPathPrefix}/0df54.svg`;
const imgRadar = `${assetPathPrefix}/2b57e.svg`;
const imgMonitor = `${assetPathPrefix}/9d07e.svg`;
const imgNetwork = `${assetPathPrefix}/8a4d1.svg`;
const imgCloud = `${assetPathPrefix}/78f9f.svg`;
const imgUsersRound = `${assetPathPrefix}/e2640.svg`;
const imgShieldAlert = `${assetPathPrefix}/74b18.svg`;
const imgClipboardCheck = `${assetPathPrefix}/40640.svg`;
const imgChartNoAxesCombined = `${assetPathPrefix}/5a555.svg`;
const imgChartNoAxesColumnIncreasing = `${assetPathPrefix}/c92f1.svg`;
const imgSearch = `${assetPathPrefix}/3f600.svg`;
const imgNotifications = `${assetPathPrefix}/86790.svg`;
const imgChevronDown = `${assetPathPrefix}/efa8c.svg`;
const imgTriangleAlert1 = `${assetPathPrefix}/72350.svg`;
const imgArrowUp = `${assetPathPrefix}/172c8.svg`;
const imgTrendSparkline = `${assetPathPrefix}/fd5f0.svg`;
const imgLayers = `${assetPathPrefix}/56051.svg`;
const imgArrowUp1 = `${assetPathPrefix}/861b4.svg`;
const imgTrendSparkline1 = `${assetPathPrefix}/22dc3.svg`;
const imgShieldCheck = `${assetPathPrefix}/b9516.svg`;
const imgArrowUp2 = `${assetPathPrefix}/c5fdc.svg`;
const imgTrendSparkline2 = `${assetPathPrefix}/b7418.svg`;
const imgUsersRound1 = `${assetPathPrefix}/1debe.svg`;
const imgTrendSparkline3 = `${assetPathPrefix}/61338.svg`;
const imgChartNoAxesColumnIncreasing1 = `${assetPathPrefix}/b539b.svg`;
const imgGaugeProgress = `${assetPathPrefix}/d1819.svg`;
const imgArrowRight = `${assetPathPrefix}/9ba84.svg`;
const imgSeverityMarker = `${assetPathPrefix}/e337c.svg`;
const imgSeverityMarker1 = `${assetPathPrefix}/3c5ed.svg`;
const imgSeverityMarker2 = `${assetPathPrefix}/611bb.svg`;
const imgChevronDown1 = `${assetPathPrefix}/88a05.svg`;
const imgThreatActivityWorldMap = `${assetPathPrefix}/c4f61.svg`;
const imgSeveritySegment = `${assetPathPrefix}/c18ed.svg`;
const imgSeveritySegment1 = `${assetPathPrefix}/43882.svg`;
const imgSeveritySegment2 = `${assetPathPrefix}/eedb7.svg`;
const imgSeveritySegment3 = `${assetPathPrefix}/fd155.svg`;
const imgLegendMarker = `${assetPathPrefix}/e47a0.svg`;
const imgLegendMarker1 = `${assetPathPrefix}/e589c.svg`;
const imgLegendMarker2 = `${assetPathPrefix}/0347a.svg`;
const imgLegendMarker3 = `${assetPathPrefix}/45cb2.svg`;
const imgLaptop = `${assetPathPrefix}/e2150.svg`;
const imgNetwork1 = `${assetPathPrefix}/e2248.svg`;
const imgCloud1 = `${assetPathPrefix}/802a4.svg`;
const imgEventStatus = `${assetPathPrefix}/e4758.svg`;
const imgGoal = `${assetPathPrefix}/8864f.svg`;
const imgLayers1 = `${assetPathPrefix}/27559.svg`;
const imgSearch1 = `${assetPathPrefix}/edb9a.svg`;
const imgFileText = `${assetPathPrefix}/e845f.svg`;


function formatReginaAlertTime(value: string | null | undefined) {
  if (!value) return { date: '—', time: '—' };

  const normalized = value.trim().replace(' ', 'T');
  const iso = /(?:Z|[+-]\\d{2}:?\\d{2})$/i.test(normalized)
    ? normalized
    : normalized + 'Z';

  const timestamp = new Date(iso);

  if (Number.isNaN(timestamp.getTime())) {
    return { date: '—', time: '—' };
  }

  return {
    date: new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Regina',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(timestamp),

    time: new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Regina',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(timestamp)
  };
}

export default function RussellWealthSecurityAnalyticsDashboard() {
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [showSecurityLogs, setShowSecurityLogs] = useState(false);
  const [showSecurityAlerts, setShowSecurityAlerts] = useState(false);

  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [investigationEventId, setInvestigationEventId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const refreshActiveAlerts = async () => {
      try {
        const response = await fetch('/api/security/active-alerts', {
          credentials: 'include',
          cache: 'no-store'
        });

        if (!response.ok) return;

        const result = await response.json();

        if (mounted && result.success) {
          setActiveAlertCount(result.alerts.length);
        }
      } catch (error) {
        console.error('Unable to refresh active alerts:', error);
      }
    };

    refreshActiveAlerts();

    const interval = window.setInterval(refreshActiveAlerts, 5000);

    const handleCleared = () => refreshActiveAlerts();
    window.addEventListener('security-alerts-cleared', handleCleared);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('security-alerts-cleared', handleCleared);
    };
  }, []);


  const { data: security, error: securityError } = useSecurityOverview();

  const metrics = security?.metrics;
  const events = security?.recent_events ?? [];
  const investigationEvent = events.find(event => event.id === investigationEventId) ?? null;
  const sources = security?.top_sources ?? [];
  const newSecurityEventIds = useNewSecurityEvents(events.map(event => event.id));

  return (
    <>
      {/* RW_INTERACTIVE_INVESTIGATION */}
      <SecurityInvestigationDrawer
        event={investigationEvent}
        onClose={() => setInvestigationEventId(null)}
      />

      {showSecurityLogs && (
        <AllSecurityLogs onClose={() => setShowSecurityLogs(false)} />
      )}
      {showSecurityAlerts && (
        <SecurityAlerts onClose={() => setShowSecurityAlerts(false)} />
      )}
    <div className="soc-dashboard bg-[#080a0d] content-stretch flex items-start relative size-full" data-node-id="15:2923" data-name="Russell Wealth Security Analytics Dashboard">
      <div className="bg-[#0b0d11] border-[#30343b] border-r border-solid content-stretch flex flex-col gap-[30px] items-start min-h-[1080px] overflow-clip pb-[24px] pt-[27px] px-[24px] relative shrink-0 w-[324px]" data-node-id="15:2924" data-name="Sidebar">
        <div className="h-[78px] overflow-clip relative shrink-0 w-[242px]" data-node-id="15:2925" data-name="Russell Wealth logo">
          <div className="absolute h-[119.2px] left-[-27.8px] top-[-23.8px] w-[297.5px]" data-node-id="15:2926" data-name="Original logo artwork">
            <img onClick={() => window.location.reload()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") window.location.reload(); }} title="Refresh dashboard"  alt="" className="cursor-pointer absolute inset-0 max-w-none object-cover size-full" src={imgOriginalLogoArtwork} />
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[21px] items-start overflow-clip relative shrink-0 w-full" data-node-id="15:2927" data-name="Navigation groups">
          <div className="border-0 border-[#30343b] border-solid content-stretch flex flex-col gap-[9px] items-start overflow-clip relative shrink-0 w-full" data-node-id="15:2928" data-name="Navigation section">
            <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[12px] whitespace-nowrap" data-node-id="15:2929">
              SOC OPERATIONS
            </p>
            <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0 w-full" data-node-id="15:2930" data-name="Navigation links">
              <div className="bg-[#292e36] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2931" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3376" data-name="layout-dashboard">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLayoutDashboard} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#f5f5f5] text-[15px]" data-node-id="15:2933">
                  SOC Dashboard
                </p>
              </div>
              <button type="button" onClick={() => setShowSecurityAlerts(true)} className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full text-left cursor-pointer hover:bg-[#292e36]" data-node-id="15:2934" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3379" data-name="triangle-alert">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgTriangleAlert} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2936">
                  Alerts
                </p>
                <div className="bg-[#8f202b] content-stretch flex items-start overflow-clip px-[8px] py-[2px] relative rounded-[20px] shrink-0" data-node-id="15:2937" data-name="Alert count">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[12px] whitespace-nowrap" data-node-id="15:2938">
                    {activeAlertCount}
                  </p>
                </div>
              </button>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2939" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3382" data-name="clipboard-plus">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgClipboardPlus} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2941">
                  Incidents
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2942" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3385" data-name="file-search">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgFileSearch} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2944">
                  Threat Hunting
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2945" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3388" data-name="search-code">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearchCode} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2947">
                  Investigations
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2948" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3391" data-name="list">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgList} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2950">{`Logs & Telemetry`}</p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2951" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3394" data-name="radar">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRadar} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2953">
                  Threat Intelligence
                </p>
              </div>
            </div>
          </div>
          <div className="border-[#30343b] border-solid border-t content-stretch flex flex-col gap-[9px] items-start overflow-clip pt-[22px] relative shrink-0 w-full" data-node-id="15:2954" data-name="Navigation section">
            <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[12px] whitespace-nowrap" data-node-id="15:2955">
              SECURITY OPERATIONS
            </p>
            <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0 w-full" data-node-id="15:2956" data-name="Navigation links">
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2957" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3397" data-name="monitor">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMonitor} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2959">
                  Endpoints
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2960" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3400" data-name="network">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgNetwork} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2962">
                  Network
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2963" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3403" data-name="cloud">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCloud} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2965">
                  Cloud Security
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2966" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3406" data-name="users-round">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgUsersRound} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2968">{`Identity & Access`}</p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2969" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3409" data-name="shield-alert">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgShieldAlert} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2971">
                  Vulnerability Mgmt
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2972" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3412" data-name="clipboard-check">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgClipboardCheck} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2974">
                  Compliance
                </p>
              </div>
            </div>
          </div>
          <div className="border-[#30343b] border-solid border-t content-stretch flex flex-col gap-[9px] items-start overflow-clip pt-[22px] relative shrink-0 w-full" data-node-id="15:2975" data-name="Navigation section">
            <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[12px] whitespace-nowrap" data-node-id="15:2976">
              REPORTING
            </p>
            <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0 w-full" data-node-id="15:2977" data-name="Navigation links">
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2978" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3415" data-name="chart-no-axes-combined">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChartNoAxesCombined} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2980">{`Metrics & Reports`}</p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[18px] h-[44px] items-center overflow-clip px-[20px] relative rounded-[8px] shrink-0 w-full" data-node-id="15:2981" data-name="Navigation item">
                <div className="relative shrink-0 size-[21px]" data-node-id="15:3418" data-name="chart-no-axes-column-increasing">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChartNoAxesColumnIncreasing} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Medium'] font-medium leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[15px]" data-node-id="15:2983">
                  Service Health
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-[1_0_0] flex-col gap-[18px] items-start min-w-px overflow-clip px-[20px] py-[24px] relative" data-node-id="15:2984" data-name="Security analytics">
        <div className="content-stretch flex flex-col gap-[24px] items-start overflow-clip relative shrink-0 w-full" data-node-id="15:2985" data-name="Dashboard overview">
          <div className="content-stretch flex h-[69px] items-start justify-between overflow-clip px-[8px] relative shrink-0 w-full" data-node-id="15:2986" data-name="Dashboard header">
            <div className="[word-break:break-word] content-stretch flex flex-col gap-[7px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-node-id="15:2987" data-name="Dashboard introduction">
              <p className="font-['Lora:Bold'] font-bold relative shrink-0 text-[#f5f5f5] text-[32px]" data-node-id="15:2988">
                Security Analytics Dashboard
              </p>
              <p className="font-['Inter:Regular'] font-normal not-italic relative shrink-0 text-[#b4b8c0] text-[16px]" data-node-id="15:2989">
                Russell Wealth — Real-Time Threat Detection, Investigation, and Response
              </p>
            </div>
            <div className="content-stretch flex gap-[22px] items-center overflow-clip relative shrink-0" data-node-id="15:2990" data-name="Header tools">
              <div className="bg-[#1a1d22] border border-[#30343b] border-solid content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[16px] relative rounded-[8px] shrink-0 w-[380px]" data-node-id="15:2991" data-name="Search">
                <div className="relative shrink-0 size-[20px]" data-node-id="15:3421" data-name="search">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearch} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.35] not-italic relative shrink-0 text-[#8c929c] text-[14px] whitespace-nowrap" data-node-id="15:2993">
                  Search alerts, IPs, users, or assets...
                </p>
              </div>
              <div className="h-[48px] relative shrink-0 w-[40px]" data-node-id="15:2994" data-name="Notifications">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgNotifications} />
              </div>
              <div className="relative shrink-0" data-name="Account menu">
                <button
                  type="button"
                  onClick={() => window.location.assign('/admin/settings')}
                  aria-label="Open admin settings"
                  className="flex gap-[10px] items-center cursor-pointer"
                >
                  <div className="bg-[#292e36] flex items-center justify-center rounded-full size-[48px]">
                    <span className="font-semibold text-[#f5f5f5] text-[16px]">ER</span>
                  </div>
                  <img alt="" className="size-[16px]" src={imgChevronDown} />
                </button>
              </div>
            </div>
          </div>
          <div
            className="grid grid-cols-2 gap-[24px] w-full"
            data-name="Security metrics"
          >
            <div className="bg-[#14171c] border border-[#30343b] rounded-[14px] h-[130px] p-[22px] flex items-center gap-[22px] min-w-0">
              <div className="bg-[#260f14] rounded-[12px] size-[64px] shrink-0 flex items-center justify-center">
                <img
                  alt=""
                  src={imgTriangleAlert1}
                  className="size-[32px]"
                />
              </div>

              <div className="flex flex-col gap-[7px]">
                <p className="text-[#b4b8c0] text-[15px] font-medium">
                  Active Alerts
                </p>
                <p className="text-[#f5f5f5] text-[36px] font-semibold leading-none">
                  {activeAlertCount}
                </p>
                <p className="text-[#8c929c] text-[11px]">
                  Recorded failed-login alerts
                </p>
              </div>
            </div>

            <div className="bg-[#14171c] border border-[#30343b] rounded-[14px] h-[130px] p-[22px] flex items-center gap-[22px] min-w-0">
              <div className="bg-[#1a1d22] rounded-[12px] size-[64px] shrink-0 flex items-center justify-center">
                <img
                  alt=""
                  src={imgLayers}
                  className="size-[32px]"
                />
              </div>

              <div className="flex flex-col gap-[7px]">
                <p className="text-[#b4b8c0] text-[15px] font-medium">
                  Open Incidents
                </p>
                <p className="text-[#f5f5f5] text-[36px] font-semibold leading-none">
                  {metrics?.open_incidents ?? 0}
                </p>
                <p className="text-[#8c929c] text-[11px]">
                  Incident tracking
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="content-stretch flex gap-[18px] items-start overflow-clip relative shrink-0 w-full" data-node-id="15:3054" data-name="Live alerts and global activity">
          <div
            className={`bg-[#14171c] border border-[#30343b] border-solid flex flex-col gap-[14px] items-start overflow-hidden pb-[10px] pt-[18px] px-[20px] relative rounded-[14px] shrink-0 w-[888px] ${
              showAllAlerts ? 'min-h-[290px]' : 'h-[290px]'
            }`}
            data-name="Real-time alerts"
          >
            <div className="flex items-center justify-between w-full">
              <p className="font-['Inter:Semi_Bold'] font-semibold text-[#f5f5f5] text-[20px]">
                Real-Time Alerts
              </p>

              <button
                type="button"
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="flex items-center gap-[6px] text-[#b4b8c0] hover:text-white text-[12px] cursor-pointer"
              >
                {showAllAlerts ? 'Show Less' : 'View All'}
                <span>{showAllAlerts ? '↑' : '→'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full">
              <label className="text-[#8c929c] text-[12px]">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#1a1d22] border border-[#30343b] text-[#f5f5f5] rounded-[8px] px-3 py-1 text-[12px]"
              >
                {['All', 'Critical', 'High', 'Medium', 'Low'].map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <span className="text-[#8c929c] text-[11px]">
                Refreshes every 5 seconds
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <div className="min-w-[880px]">
                <div className="bg-[#1a1d22] flex items-center gap-[10px] h-[32px] px-[4px] text-[#8c929c] text-[12px]">
                  <span className="w-[105px] shrink-0">Severity</span>
                  <span className="w-[105px] shrink-0">Date (Regina)</span>
                  <span className="w-[105px] shrink-0">Time (CST)</span>
                  <span className="w-[280px] shrink-0">Alert</span>
                  <span className="w-[205px] shrink-0">Asset / User</span>
                  <span className="w-[112px] shrink-0">Status</span>
                </div>

                {(() => {
                  const alerts = events
                    .filter((event) => event.event_type === 'LOGIN_FAILED')
                    .map((event) => ({
                      ...event,
                      displaySeverity: event.severity === 'CRITICAL'
                        ? 'Critical'
                        : event.severity === 'HIGH'
                          ? 'High'
                          : event.severity === 'WARNING'
                            ? 'Low'
                            : 'Low'
                    }))
                    .filter((event) =>
                      severityFilter === 'All' || event.displaySeverity === severityFilter
                    );

                  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 5);

                  if (securityError) {
                    return <p className="text-[#ff454f] text-[12px] py-4">{securityError}</p>;
                  }

                  if (!security) {
                    return <p className="text-[#8c929c] text-[12px] py-4">Loading alerts...</p>;
                  }

                  if (visibleAlerts.length === 0) {
                    return (
                      <p className="text-[#8c929c] text-[12px] py-4">
                        No recorded alerts match this severity.
                      </p>
                    );
                  }

                  return visibleAlerts.map((event) => (
                    <div key={event.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAlertId(selectedAlertId === event.id ? null : event.id)
                        }
                        className="border-b border-[#30343b] flex items-center gap-[10px] min-h-[36px] px-[4px] w-full text-left hover:bg-[#1a1d22] cursor-pointer"
                      >
                        <span className="flex items-center gap-[8px] w-[105px] shrink-0 text-[#58a6ff] text-[12px]">
                          <span className="bg-[#58a6ff] size-[8px] rounded-full" />
                          {event.displaySeverity}
                        </span>

                        <span className="text-[#b4b8c0] text-[11px] w-[105px] shrink-0 whitespace-nowrap">
                          {formatReginaAlertTime(event.created_at).date}
                        </span>

                        <span className="text-[#b4b8c0] text-[11px] w-[105px] shrink-0 whitespace-nowrap">
                          {formatReginaAlertTime(event.created_at).time}
                        </span>

                        <span className="text-[#f5f5f5] text-[12px] w-[280px] shrink-0">
                          Failed Login Attempt
                        </span>

                        <span className="text-[#b4b8c0] text-[12px] w-[205px] shrink-0 truncate">
                          {event.email ?? event.details ?? 'Unknown account'}
                        </span>

                        <span className="text-[#f5b942] text-[11px] w-[112px] shrink-0">
                          Recorded
                        </span>
                      </button>

                      {selectedAlertId === event.id && (
                        <div className="bg-[#1a1d22] border-b border-[#30343b] p-3 text-[12px] text-[#b4b8c0] space-y-1">
                          <p>Event ID: {event.id}</p>
                          <p>Account: {event.email ?? event.details ?? 'Unknown'}</p>
                          <p>Source IP: {event.source_ip ?? 'Unknown'}</p>
                          <p>Date (Regina): {formatReginaAlertTime(event.created_at).date}</p>
                          <p>Time (CST): {formatReginaAlertTime(event.created_at).time}</p>
                          <p>Event Type: {event.event_type}</p>
                          <p>Details: {event.details ?? 'No additional details'}</p>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
          <div
            className="bg-[#14171c] border border-[#30343b] border-solid flex flex-col gap-[12px] h-[290px] p-[18px] relative rounded-[14px] shrink-0 flex-1 min-w-0"
            data-name="Global threat activity"
          >
            <div className="flex items-center justify-between">
              <p className="font-['Inter:Semi_Bold'] font-semibold text-[#f5f5f5] text-[18px]">
                Global Threat Activity
              </p>
              <span className="text-[#8c929c] text-[10px]">
                Live login activity
              </span>
            </div>

            <div className="flex-1 min-h-0">
              <SecurityActivityMap
                events={events.map((event) => ({
                  ...event,
                  latitude: null,
                  longitude: null
                }))}
                selectedEventId={selectedAlertId}
              />
            </div>

            <div className="text-[#8c929c] text-[11px]">
              Location markers will appear when verified IP geolocation is available.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-[18px] items-stretch relative shrink-0 w-full" data-node-id="15:3212" data-name="Incident analytics">
          <div
            className="bg-[#14171c] border border-[#30343b] border-solid flex flex-col gap-[18px] min-h-[240px] p-[18px] relative rounded-[14px] w-full lg:flex-1 lg:min-w-[400px]"
            data-name="Incident overview"
          >
            <div className="flex items-center justify-between">
              <p className="font-['Lora:Bold'] font-bold text-[#f5f5f5] text-[20px]">
                Security Event Overview
              </p>
              <span className="text-[#8c929c] text-[10px]">
                Live · 5s refresh
              </span>
            </div>

            <div className="flex items-center gap-[25px] w-full">
              {(() => {
                const total = Number(metrics?.total_events ?? 0);
                const critical = Number(metrics?.critical_events ?? 0);
                const warning = Number(metrics?.warning_events ?? 0);
                const info = Number(metrics?.info_events ?? 0);

                const percent = (count: number) =>
                  total > 0 ? Math.round((count / total) * 100) : 0;

                const criticalEnd = total > 0 ? critical / total * 100 : 0;
                const warningEnd = total > 0
                  ? (critical + warning) / total * 100
                  : 0;

                const donut = total === 0
                  ? '#30343b'
                  : `conic-gradient(
                      #ff454f 0% ${criticalEnd}%,
                      #f5b942 ${criticalEnd}% ${warningEnd}%,
                      #25e487 ${warningEnd}% 100%
                    )`;

                const categories = [
                  { label: 'Critical', count: critical, color: '#ff454f' },
                  { label: 'Warning', count: warning, color: '#f5b942' },
                  { label: 'Info', count: info, color: '#25e487' }
                ];

                return (
                  <>
                    <div
                      className="relative shrink-0 size-[156px] rounded-full flex items-center justify-center"
                      style={{ background: donut }}
                    >
                      <div className="size-[112px] bg-[#14171c] rounded-full flex flex-col items-center justify-center">
                        <span className="text-[#f5f5f5] text-[30px] font-semibold leading-none">
                          {security ? total : '—'}
                        </span>
                        <span className="text-[#b4b8c0] text-[12px] mt-2">
                          Events
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-[17px] min-w-0">
                      {categories.map(category => (
                        <div
                          key={category.label}
                          className="flex items-center gap-[10px] w-full"
                        >
                          <span
                            className="size-[11px] rounded-full shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-[#b4b8c0] text-[13px] flex-1">
                            {category.label}
                          </span>
                          <span className="text-[#f5f5f5] text-[12px] whitespace-nowrap">
                            {security
                              ? `${category.count} (${percent(category.count)}%)`
                              : '—'}
                          </span>
                        </div>
                      ))}

                      {securityError && (
                        <span className="text-[#ff454f] text-[10px]">
                          Unable to refresh
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[4px] min-h-[240px] items-start overflow-hidden p-[18px] relative rounded-[14px] w-full lg:flex-1 lg:min-w-[400px]" data-node-id="15:3242" data-name="Threat trends">
            <div className="[word-break:break-word] content-stretch flex font-['Inter:Semi_Bold'] font-semibold items-center justify-between not-italic overflow-clip relative shrink-0 w-full whitespace-nowrap" data-node-id="15:3243" data-name="Trend heading">
              <p className="leading-[normal] relative shrink-0 text-[#f5f5f5] text-[20px]" data-node-id="15:3244">
                Threat Trends
              </p>
              <p className="leading-[1.35] relative shrink-0 text-[#25e487] text-[12px]" data-node-id="15:3245">
                ↓ -18.4% (vs. prior 24h)
              </p>
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.35] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="15:3246">
              Security events over time
            </p>
            <div className="content-stretch flex gap-[12px] items-start overflow-clip pt-[12px] relative shrink-0 w-full" data-node-id="15:3247" data-name="Trend plot and axis">
              <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Regular'] font-normal h-[124px] items-start justify-between leading-[1.35] not-italic overflow-clip relative shrink-0 text-[#b4b8c0] text-[11px] w-[30px] whitespace-nowrap" data-node-id="15:3248" data-name="Value axis">
                <p className="relative shrink-0" data-node-id="15:3249">
                  8K
                </p>
                <p className="relative shrink-0" data-node-id="15:3250">
                  6K
                </p>
                <p className="relative shrink-0" data-node-id="15:3251">
                  4K
                </p>
                <p className="relative shrink-0" data-node-id="15:3252">
                  2K
                </p>
                <p className="relative shrink-0" data-node-id="15:3253">
                  0
                </p>
              </div>
              <div className="h-[124px] relative shrink-0 w-[502px]" data-node-id="15:3254" data-name="Threat trend chart" data-rw-chart="true">
                <SecurityThreatChart events={events} />
              </div>
            </div>
            <div className="[word-break:break-word] content-stretch flex font-['Inter:Regular'] font-normal items-start justify-between leading-[1.35] not-italic overflow-clip pl-[42px] relative shrink-0 text-[#b4b8c0] text-[11px] w-full whitespace-nowrap" data-node-id="15:3262" data-name="Time axis">
              <p className="relative shrink-0" data-node-id="15:3263">
                00:00
              </p>
              <p className="relative shrink-0" data-node-id="15:3264">
                04:00
              </p>
              <p className="relative shrink-0" data-node-id="15:3265">
                08:00
              </p>
              <p className="relative shrink-0" data-node-id="15:3266">
                12:00
              </p>
              <p className="relative shrink-0" data-node-id="15:3267">
                16:00
              </p>
              <p className="relative shrink-0" data-node-id="15:3268">
                20:00
              </p>
            </div>
          </div>
          </div>
        <div className="flex flex-wrap justify-center items-stretch gap-[18px] w-full" data-node-id="15:3307" data-name="Coverage and response operations">
          <SecurityCoverage />
          <div className="bg-[#14171c] border border-[#30343b] flex flex-col gap-[10px] min-h-[227px] min-w-0 w-full lg:flex-1 p-[18px] rounded-[14px]" data-node-id="15:3327" data-name="Recent security events">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="15:3328" data-name="Panel heading">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[20px] whitespace-nowrap" data-node-id="15:3329">
                Recent Security Events
              </p>
              <button type="button" onClick={() => setShowSecurityLogs(true)} className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0 cursor-pointer hover:opacity-75" data-node-id="15:3330" data-name="Panel action">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[1.35] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="15:3331">
                  View Logs
                </p>
                <div className="relative shrink-0 size-[14px]" data-node-id="15:3475" data-name="arrow-right">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgArrowRight} />
                </div>
              </button>
            </div>
            <div className="flex flex-col w-full overflow-y-auto max-h-[160px]" data-name="Live event log">
              {securityError ? (
                <p className="text-[#ff454f] text-[12px] py-3">{securityError}</p>
              ) : !security ? (
                <p className="text-[#8c929c] text-[12px] py-3">Loading security events...</p>
              ) : events.length === 0 ? (
                <p className="text-[#8c929c] text-[12px] py-3">No recorded security events.</p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Investigate security event ${event.id}`}
                    onClick={() => setInvestigationEventId(event.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInvestigationEventId(event.id);
                      }
                    }}
                    className={`cursor-pointer transition-colors hover:bg-[#1a1d22] flex items-center gap-[10px] border-b border-[#30343b] min-h-[34px] w-full ${newSecurityEventIds.has(event.id) ? 'rw-event-new' : ''}`}
                  >
                    <span
                      className={`shrink-0 size-[8px] rounded-full ${
                        event.event_type === 'LOGIN_SUCCESS'
                          ? 'bg-[#25e487]'
                          : 'bg-[#f5b942]'
                      }`}
                    />

                    <span className="text-[#b4b8c0] text-[10px] shrink-0 w-[100px] whitespace-nowrap">
                      {formatReginaAlertTime(event.created_at).date}
                    </span>

                    <span className="text-[#b4b8c0] text-[10px] shrink-0 w-[105px] whitespace-nowrap">
                      {formatReginaAlertTime(event.created_at).time}
                    </span>

                    <span className="text-[#f5f5f5] text-[11px] flex-1 truncate">
                      {event.event_type === 'LOGIN_SUCCESS'
                        ? 'Successful login'
                        : event.event_type === 'LOGIN_FAILED'
                          ? 'Failed login'
                          : event.event_type}
                    </span>

                    <span
                      className="text-[#b4b8c0] text-[10px] truncate max-w-[145px]"
                      title={event.email ?? event.details ?? ''}
                    >
                      {event.email ?? event.details ?? 'Unknown user'}
                    </span>

                    <span className="text-[#8c929c] text-[10px] shrink-0">
                      {event.source_ip ?? 'Unknown IP'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
<div className="w-full mt-[18px]">
<div className="bg-[#14171c] border border-[#30343b] flex flex-col gap-5 w-full min-w-0 p-5 rounded-[14px]" data-node-id="15:3359" data-name="SOC operations">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="15:3360" data-name="Panel heading">
              <p className="break-normal font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[20px] whitespace-nowrap" data-node-id="15:3361">
                SOC Operations
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full" data-node-id="15:3362" data-name="Response actions">
              <div className="bg-[#1a1d22] border border-[#30343b] flex flex-col items-center justify-center gap-3 min-h-[125px] min-w-0 p-4 rounded-[12px]" data-node-id="15:3363" data-name="Operation action">
                <div className="relative shrink-0 size-[30px]" data-node-id="15:3478" data-name="goal">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGoal} />
                </div>
                <div className="w-full text-center text-[#f5f5f5] text-[13px] font-medium leading-[1.5] break-normal whitespace-normal" data-node-id="15:3365">
                  <p className="leading-[1.4] mb-0">Create</p>
                  <p className="leading-[1.4]">Incident</p>
                </div>
              </div>
              <div className="bg-[#1a1d22] border border-[#30343b] flex flex-col items-center justify-center gap-3 min-h-[125px] min-w-0 p-4 rounded-[12px]" data-node-id="15:3366" data-name="Operation action">
                <div className="relative shrink-0 size-[30px]" data-node-id="15:3481" data-name="layers">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLayers1} />
                </div>
                <div className="w-full text-center text-[#f5f5f5] text-[13px] font-medium leading-[1.5] break-normal whitespace-normal" data-node-id="15:3368">
                  <p className="leading-[1.4] mb-0">Run</p>
                  <p className="leading-[1.4]">Investigation</p>
                </div>
              </div>
              <div className="bg-[#1a1d22] border border-[#30343b] flex flex-col items-center justify-center gap-3 min-h-[125px] min-w-0 p-4 rounded-[12px]" data-node-id="15:3369" data-name="Operation action">
                <div className="relative shrink-0 size-[30px]" data-node-id="15:3484" data-name="search">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearch1} />
                </div>
                <div className="w-full text-center text-[#f5f5f5] text-[13px] font-medium leading-[1.5] break-normal whitespace-normal" data-node-id="15:3371">
                  <p className="leading-[1.4] mb-0">Threat</p>
                  <p className="leading-[1.4]">Hunt</p>
                </div>
              </div>
              <div className="bg-[#1a1d22] border border-[#30343b] flex flex-col items-center justify-center gap-3 min-h-[125px] min-w-0 p-4 rounded-[12px]" data-node-id="15:3372" data-name="Operation action">
                <div className="relative shrink-0 size-[30px]" data-node-id="15:3487" data-name="file-text">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgFileText} />
                </div>
                <div className="w-full text-center text-[#f5f5f5] text-[13px] font-medium leading-[1.5] break-normal whitespace-normal" data-node-id="15:3374">
                  <p className="leading-[1.4] mb-0">Generate</p>
                  <p className="leading-[1.4]">Report</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
