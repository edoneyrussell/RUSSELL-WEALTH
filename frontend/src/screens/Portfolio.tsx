import MarketSearch from '../components/MarketSearch'
import { usePortfolio, formatCAD } from '../hooks/usePortfolio';
const assetPathPrefix = "/assets";
const imgOriginalLogoArtwork = `${assetPathPrefix}/c8aca.png`;
const imgLayoutDashboard = `${assetPathPrefix}/8bb5a.svg`;
const imgChartPie = `${assetPathPrefix}/a4608.svg`;
const imgArrowLeftRight = `${assetPathPrefix}/74de4.svg`;
const imgStar = `${assetPathPrefix}/e6ac6.svg`;
const imgReceiptText = `${assetPathPrefix}/298d7.svg`;
const imgSettings = `${assetPathPrefix}/6aea4.svg`;
const imgCircleHelp = `${assetPathPrefix}/2bd20.svg`;
const imgLogOut = `${assetPathPrefix}/edbc5.svg`;
const imgSearch = `${assetPathPrefix}/baa9e.svg`;
const imgNotifications = `${assetPathPrefix}/3ccc6.svg`;
const imgInfo = `${assetPathPrefix}/65948.svg`;
const imgTrendingUp = `${assetPathPrefix}/1cd55.svg`;
const imgLayers = `${assetPathPrefix}/a9977.svg`;
const imgWallet = `${assetPathPrefix}/bfd05.svg`;
const imgPerformanceLine = `${assetPathPrefix}/2ce62.svg`;
const imgPerformanceArea = `${assetPathPrefix}/5e796.svg`;
const imgDownload = `${assetPathPrefix}/d4a04.svg`;
const imgArrowLeftRight1 = `${assetPathPrefix}/8667d.svg`;
const imgSearch1 = `${assetPathPrefix}/d51ae.svg`;
const imgChevronDown = `${assetPathPrefix}/fe111.svg`;
const imgArrowDownUp = `${assetPathPrefix}/7b3a4.svg`;
const imgSlidersHorizontal = `${assetPathPrefix}/02607.svg`;
const imgEllipsis = `${assetPathPrefix}/0bf90.svg`;
const imgWallet1 = `${assetPathPrefix}/9032a.svg`;

export default function RussellWealthPortfolioHoldings() {
  const { portfolio, error } = usePortfolio();

  const allocation = {
    stocks: portfolio?.holdings
      .filter(h => h.asset_type?.toLowerCase().includes('stock'))
      .reduce((sum, h) => sum + Number(h.market_value), 0) ?? 0,
    etfs: portfolio?.holdings
      .filter(h => h.asset_type?.toLowerCase().includes('etf'))
      .reduce((sum, h) => sum + Number(h.market_value), 0) ?? 0,
    cash: Number(portfolio?.cash_balance ?? 0),
    total: Number(portfolio?.total_value ?? 0),
  };

  const allocationPercent = (value: number) =>
    allocation.total > 0
      ? (value / allocation.total * 100).toFixed(2)
      : '0.00';

  return (
    <div className="bg-[#080a0d] content-stretch flex items-start relative size-full" data-node-id="38:1427" data-name="Russell Wealth Portfolio Holdings">
      <div className="bg-[#0b0d11] border-[#30343b] border-r border-solid content-stretch flex flex-col gap-[30px] h-[1080px] items-start overflow-clip pb-[24px] pt-[26px] px-[16px] relative shrink-0 w-[208px]" data-node-id="38:1428" data-name="Sidebar">
        <div className="h-[64px] overflow-clip relative shrink-0 w-[176px]" data-node-id="38:1429" data-name="Russell Wealth logo">
          <div className="absolute h-[86.7px] left-[-20.2px] top-[-17.3px] w-[216.4px]" data-node-id="38:1430" data-name="Original logo artwork">
            <a href="/" aria-label="Russell Wealth — refresh homepage" className="contents cursor-pointer"><img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgOriginalLogoArtwork} /></a>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[10px] items-start overflow-clip relative shrink-0 w-full" data-node-id="38:1431" data-name="Main navigation">
          <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="38:1432" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="38:1433" data-name="layout-dashboard">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLayoutDashboard} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="38:1435">
              Dashboard
            </p>
          </div>
          <div className="bg-[#1a1d22] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="38:1436" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="38:1437" data-name="chart-pie">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChartPie} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[13px] whitespace-nowrap" data-node-id="38:1439">
              Portfolio
            </p>
          </div>
          <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="38:1440" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="38:1441" data-name="arrow-left-right">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgArrowLeftRight} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="38:1443">
              Trade
            </p>
          </div>
          <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="38:1444" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="38:1445" data-name="star">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStar} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="38:1447">
              Watchlist
            </p>
          </div>
          <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="38:1448" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="38:1449" data-name="receipt-text">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgReceiptText} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="38:1451">
              Transactions
            </p>
          </div>
        </div>
        <div className="flex-[1_0_0] min-h-px relative w-full" data-node-id="38:1452" data-name="Sidebar space" />
        <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 w-full" data-node-id="38:1453" data-name="Support navigation">
          <div className="content-stretch flex gap-[12px] h-[42px] items-center overflow-clip px-[14px] relative shrink-0 w-full" data-node-id="38:1454" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="38:1455" data-name="settings">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSettings} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="38:1457">
              Settings
            </p>
          </div>
          <div className="content-stretch flex gap-[12px] h-[42px] items-center overflow-clip px-[14px] relative shrink-0 w-full" data-node-id="38:1458" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="38:1459" data-name="circle-help">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCircleHelp} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="38:1461">{`Help & Support`}</p>
          </div>
        </div>
        <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[18px] items-start overflow-clip p-[12px] relative rounded-[12px] shrink-0 w-full" data-node-id="38:1462" data-name="Member profile">
          <div className="content-stretch flex gap-[10px] items-center overflow-clip relative shrink-0" data-node-id="38:1463" data-name="Member">
            <div className="bg-[#252a31] content-stretch flex items-center justify-center overflow-clip relative rounded-[100px] shrink-0 size-[32px]" data-node-id="38:1464" data-name="Avatar">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#c5cad2] text-[11px] whitespace-nowrap" data-node-id="38:1465">
                ER
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[normal] not-italic overflow-clip relative shrink-0 whitespace-nowrap" data-node-id="38:1466" data-name="Identity">
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#f5f5f5] text-[12px]" data-node-id="38:1467">
                Edoney Russell
              </p>
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#8c929c] text-[10px]" data-node-id="38:1468">
                Personal account
              </p>
            </div>
          </div>
          <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1469" data-name="Sign out">
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="38:1470">
              Log out
            </p>
            <div className="relative shrink-0 size-[16px]" data-node-id="38:1471" data-name="log-out">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLogOut} />
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-[1_0_0] flex-col gap-[24px] h-[1080px] items-start min-w-px overflow-clip p-[28px] relative" data-node-id="38:1473" data-name="Portfolio content">
        <div className="content-stretch flex h-[76px] items-start justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1474" data-name="Portfolio header">
          <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-node-id="38:1475" data-name="Page introduction">
            <p className="font-['Lora:Bold'] font-bold relative shrink-0 text-[#f5f5f5] text-[32px]" data-node-id="38:1476">
              Portfolio Holdings
            </p>
            <p className="font-['Inter:Regular'] font-normal not-italic relative shrink-0 text-[#b4b8c0] text-[16px]" data-node-id="38:1477">
              A detailed view of your investments.
            </p>
          </div>
          <div className="content-stretch flex gap-[16px] items-center overflow-clip relative shrink-0" data-node-id="38:1478" data-name="Header tools">
            <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[12px] h-[46px] items-center overflow-clip px-[16px] relative rounded-[8px] shrink-0 w-[360px]" data-node-id="38:1479" data-name="Search"
              role="button"
              tabIndex={0}
              onClick={() => window.dispatchEvent(new Event('russellwealth:open-market-search'))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  window.dispatchEvent(new Event('russellwealth:open-market-search'))
                }
              }}>
              <div className="relative shrink-0 size-[18px]" data-node-id="38:1480" data-name="search">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearch} />
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[14px] whitespace-nowrap" data-node-id="38:1482">
                Search stocks, ETFs, or symbols...
              </p>
            </div>
            <MarketSearch triggerOnly />
            <div className="h-[46px] relative shrink-0 w-[42px]" data-node-id="38:1483" data-name="Notifications">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgNotifications} />
            </div>
          </div>
        </div>
        <div className="content-stretch flex gap-[24px] items-start overflow-clip relative shrink-0 w-full" data-node-id="38:1487" data-name="Portfolio summary">
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[136px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="38:1488" data-name="Metric card">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1489" data-name="Metric heading">
              <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="38:1490" data-name="Label and information">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[14px] whitespace-nowrap" data-node-id="38:1491">
                  Portfolio Value
                </p>
                <div className="relative shrink-0 size-[13px]" data-node-id="38:1492" data-name="info">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgInfo} />
                </div>
              </div>
              <div className="relative shrink-0 size-[24px]" data-node-id="38:1494" data-name="trending-up">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgTrendingUp} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[28px] tracking-[-0.7px] whitespace-nowrap" data-node-id="38:1496">
              {portfolio ? formatCAD(portfolio.total_value) : 'Loading...'}
            </p>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#39e58c] text-[13px] whitespace-nowrap" data-node-id="38:1497">
              Simulated portfolio value
            </p>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[136px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="38:1498" data-name="Metric card">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1499" data-name="Metric heading">
              <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="38:1500" data-name="Label and information">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[14px] whitespace-nowrap" data-node-id="38:1501">{`Today’s P&L`}</p>
                <div className="relative shrink-0 size-[13px]" data-node-id="38:1502" data-name="info">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgInfo} />
                </div>
              </div>
              <div className="relative shrink-0 size-[24px]" data-node-id="38:1504" data-name="trending-up">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgTrendingUp} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[28px] tracking-[-0.7px] whitespace-nowrap" data-node-id="38:1506">
              —
            </p>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[13px] whitespace-nowrap" data-node-id="38:1507">
              Daily performance unavailable
            </p>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[136px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="38:1508" data-name="Metric card">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1509" data-name="Metric heading">
              <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="38:1510" data-name="Label and information">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[14px] whitespace-nowrap" data-node-id="38:1511">
                  Total Return
                </p>
                <div className="relative shrink-0 size-[13px]" data-node-id="38:1512" data-name="info">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgInfo} />
                </div>
              </div>
              <div className="relative shrink-0 size-[24px]" data-node-id="38:1514" data-name="layers">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLayers} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[28px] tracking-[-0.7px] whitespace-nowrap" data-node-id="38:1516">
              —
            </p>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[13px] whitespace-nowrap" data-node-id="38:1517">
              Return tracking coming soon
            </p>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[136px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="38:1518" data-name="Metric card">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1519" data-name="Metric heading">
              <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="38:1520" data-name="Label and information">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[14px] whitespace-nowrap" data-node-id="38:1521">
                  Cash Balance
                </p>
                <div className="relative shrink-0 size-[13px]" data-node-id="38:1522" data-name="info">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgInfo} />
                </div>
              </div>
              <div className="relative shrink-0 size-[24px]" data-node-id="38:1524" data-name="wallet">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgWallet} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[28px] tracking-[-0.7px] whitespace-nowrap" data-node-id="38:1526">
              {portfolio ? formatCAD(portfolio.cash_balance) : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="content-stretch flex gap-[24px] h-[180px] items-start overflow-clip relative shrink-0 w-full" data-node-id="38:1527" data-name="Performance and allocation">
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[10px] h-[180px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="38:1528" data-name="Portfolio performance">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1529" data-name="Performance heading">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[18px] whitespace-nowrap" data-node-id="38:1530">
                Portfolio Performance
              </p>
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[4px] items-start overflow-clip p-[3px] relative rounded-[8px] shrink-0" data-node-id="38:1531" data-name="Time range">
                <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[30px]" data-node-id="38:1532" data-name="Range option">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="38:1533">
                    1D
                  </p>
                </div>
                <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[30px]" data-node-id="38:1534" data-name="Range option">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="38:1535">
                    1W
                  </p>
                </div>
                <div className="bg-[#252a31] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[30px]" data-node-id="38:1536" data-name="Range option">
                  <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[10px] whitespace-nowrap" data-node-id="38:1537">
                    1M
                  </p>
                </div>
                <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[30px]" data-node-id="38:1538" data-name="Range option">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="38:1539">
                    3M
                  </p>
                </div>
                <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[30px]" data-node-id="38:1540" data-name="Range option">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="38:1541">
                    1Y
                  </p>
                </div>
                <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[30px]" data-node-id="38:1542" data-name="Range option">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="38:1543">
                    All
                  </p>
                </div>
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[0] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-pre" data-node-id="38:1544">
              <span className="leading-[normal] text-[#39e58c]">↗ +3.28% (+$408.71)</span>
              <span className="leading-[normal]">{`  Past Month`}</span>
            </p>
            <div className="h-[56px] overflow-clip relative shrink-0 w-full" data-node-id="38:1545" data-name="Performance chart">
              <div className="absolute h-[48px] left-0 top-[2px] w-[604px]" data-node-id="38:1550" data-name="Performance line">
                <div className="absolute inset-[-2.19%_-0.17%]">
                  <img alt="" className="block max-w-none size-full" src={imgPerformanceLine} />
                </div>
              </div>
              <div className="absolute h-[54px] left-0 top-[2px] w-[604px]" data-node-id="38:1549" data-name="Performance area">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPerformanceArea} />
              </div>
              <div className="absolute bg-[#30343b] h-px left-0 opacity-35 top-[52px] w-[604px]" data-node-id="38:1548" data-name="Grid line" />
              <div className="absolute bg-[#30343b] h-px left-0 opacity-35 top-[28px] w-[604px]" data-node-id="38:1547" data-name="Grid line" />
              <div className="absolute bg-[#30343b] h-px left-0 opacity-35 top-[4px] w-[604px]" data-node-id="38:1546" data-name="Grid line" />
            </div>
            <div className="[word-break:break-word] content-stretch flex font-['Inter:Regular'] font-normal items-start justify-between leading-[normal] not-italic overflow-clip relative shrink-0 text-[#8c929c] text-[10px] w-full whitespace-nowrap" data-node-id="38:1551" data-name="Date axis">
              <p className="relative shrink-0" data-node-id="38:1552">
                Oct 1
              </p>
              <p className="relative shrink-0" data-node-id="38:1553">
                Oct 9
              </p>
              <p className="relative shrink-0" data-node-id="38:1554">
                Oct 17
              </p>
              <p className="relative shrink-0" data-node-id="38:1555">
                Oct 29
              </p>
            </div>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[16px] h-[180px] items-start overflow-clip p-[20px] relative rounded-[12px] shrink-0 w-[508px]" data-node-id="38:1556" data-name="Portfolio allocation">
            <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic overflow-clip relative shrink-0 w-full whitespace-nowrap" data-node-id="38:1557" data-name="Allocation heading">
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#f5f5f5] text-[18px]" data-node-id="38:1558">
                Portfolio Allocation
              </p>
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#8c929c] text-[11px]" data-node-id="38:1559">
                Including cash
              </p>
            </div>
            <div className="content-stretch flex gap-[3px] h-[10px] items-start overflow-clip relative rounded-[3px] shrink-0 w-full" data-node-id="38:1560" data-name="Allocation bar">
              <div className="bg-[#c5cad2] h-[10px] relative shrink-0 " data-node-id="38:1561" data-name="Stocks" style={{ width: `${allocationPercent(allocation.stocks)}%` }} />
              <div className="bg-[#727b88] h-[10px] relative shrink-0 " data-node-id="38:1562" data-name="ETFs" style={{ width: `${allocationPercent(allocation.etfs)}%` }} />
              <div className="bg-[#353c46]  h-[10px]  relative" data-node-id="38:1563" data-name="Cash" style={{ width: `${allocationPercent(allocation.cash)}%` }} />
            </div>
            <div className="content-stretch flex gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-node-id="38:1564" data-name="Allocation breakdown">
              <div className="content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start min-w-px overflow-clip relative" data-node-id="38:1565" data-name="Asset class">
                <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="38:1566" data-name="Legend">
                  <div className="bg-[#c5cad2] relative rounded-[2px] shrink-0 size-[7px]" data-node-id="38:1567" data-name="Marker" />
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="38:1568">
                    Stocks
                  </p>
                </div>
                <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[15px] whitespace-nowrap" data-node-id="38:1569">
                  {formatCAD(String(allocation.stocks))}
                </p>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[11px] whitespace-nowrap" data-node-id="38:1570">
                  {allocationPercent(allocation.stocks)}%
                </p>
              </div>
              <div className="content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start min-w-px overflow-clip relative" data-node-id="38:1571" data-name="Asset class">
                <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="38:1572" data-name="Legend">
                  <div className="bg-[#727b88] relative rounded-[2px] shrink-0 size-[7px]" data-node-id="38:1573" data-name="Marker" />
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="38:1574">
                    ETFs
                  </p>
                </div>
                <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[15px] whitespace-nowrap" data-node-id="38:1575">
                  {formatCAD(String(allocation.etfs))}
                </p>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[11px] whitespace-nowrap" data-node-id="38:1576">
                  {allocationPercent(allocation.etfs)}%
                </p>
              </div>
              <div className="content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start min-w-px overflow-clip relative" data-node-id="38:1577" data-name="Asset class">
                <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="38:1578" data-name="Legend">
                  <div className="bg-[#353c46] relative rounded-[2px] shrink-0 size-[7px]" data-node-id="38:1579" data-name="Marker" />
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="38:1580">
                    Cash
                  </p>
                </div>
                <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[15px] whitespace-nowrap" data-node-id="38:1581">
                  {formatCAD(String(allocation.cash))}
                </p>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[11px] whitespace-nowrap" data-node-id="38:1582">
                  {allocationPercent(allocation.cash)}%
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col h-[560px] items-start overflow-clip pb-[16px] pt-[18px] px-[24px] relative rounded-[12px] shrink-0 w-full" data-node-id="38:1583" data-name="Your holdings">
          <div className="content-stretch flex h-[44px] items-start justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1584" data-name="Holdings heading">
            <div className="[word-break:break-word] content-stretch flex gap-[20px] h-[32px] items-center not-italic overflow-clip relative shrink-0 whitespace-nowrap" data-node-id="38:1585" data-name="Holdings summary">
              <p className="font-['Inter:Semi_Bold'] font-semibold leading-[normal] relative shrink-0 text-[#f5f5f5] text-[18px]" data-node-id="38:1586">
                Your Holdings (5)
              </p>
              <p className="font-['Inter:Regular'] font-normal leading-[0] relative shrink-0 text-[#b4b8c0] text-[11px]" data-node-id="38:1587">
                <span className="leading-[normal]">{`Invested assets: `}</span>
                <span className="leading-[normal] text-[#f5f5f5]">$10,346.32</span>
              </p>
              <p className="font-['Inter:Regular'] font-normal leading-[0] relative shrink-0 text-[#b4b8c0] text-[11px]" data-node-id="38:1588">
                <span className="leading-[normal]">{`Day Change: `}</span>
                <span className="leading-[normal] text-[#39e58c]">+1.42%</span>
              </p>
            </div>
            <div className="content-stretch flex gap-[8px] items-start overflow-clip relative shrink-0" data-node-id="38:1589" data-name="Portfolio actions">
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[8px] h-[32px] items-center justify-center overflow-clip px-[12px] relative rounded-[8px] shrink-0" data-node-id="38:1590" data-name="Action">
                <div className="relative shrink-0 size-[14px]" data-node-id="38:1721" data-name="download">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgDownload} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="38:1592">
                  Export
                </p>
              </div>
              <div className="bg-gradient-to-b border border-[#c5cad2] border-solid content-stretch flex from-[#e5e7eb] gap-[8px] h-[32px] items-center justify-center overflow-clip px-[12px] relative rounded-[8px] shrink-0 to-[#c5cad2]" data-node-id="38:1593" data-name="Action">
                <div className="relative shrink-0 size-[14px]" data-node-id="38:1724" data-name="arrow-left-right">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgArrowLeftRight1} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#080a0d] text-[12px] whitespace-nowrap" data-node-id="38:1595">
                  Trade
                </p>
              </div>
            </div>
          </div>
          <div className="content-stretch flex h-[48px] items-start justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1596" data-name="Holdings controls">
            <div className="content-stretch flex gap-[12px] items-start overflow-clip relative shrink-0" data-node-id="38:1597" data-name="Search and asset filters">
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[9px] h-[36px] items-center overflow-clip px-[12px] relative rounded-[8px] shrink-0 w-[280px]" data-node-id="38:1598" data-name="Search holdings">
                <div className="relative shrink-0 size-[15px]" data-node-id="38:1727" data-name="search">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearch1} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[12px] whitespace-nowrap" data-node-id="38:1600">
                  Search holdings by name or symbol
                </p>
              </div>
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[3px] h-[36px] items-start overflow-clip p-[3px] relative rounded-[8px] shrink-0" data-node-id="38:1601" data-name="Asset class filter">
                <div className="bg-[#252a31] content-stretch flex h-[30px] items-center overflow-clip px-[12px] relative rounded-[6px] shrink-0" data-node-id="38:1602" data-name="Filter option">
                  <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[11px] whitespace-nowrap" data-node-id="38:1603">
                    All (5)
                  </p>
                </div>
                <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[30px] items-center overflow-clip px-[12px] relative rounded-[6px] shrink-0" data-node-id="38:1604" data-name="Filter option">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="38:1605">
                    Stocks (3)
                  </p>
                </div>
                <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[30px] items-center overflow-clip px-[12px] relative rounded-[6px] shrink-0" data-node-id="38:1606" data-name="Filter option">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="38:1607">
                    ETFs (2)
                  </p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex gap-[8px] items-start overflow-clip relative shrink-0" data-node-id="38:1608" data-name="Sort and filter tools">
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[8px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[8px] shrink-0" data-node-id="38:1609" data-name="Action">
                <div className="relative shrink-0 size-[14px]" data-node-id="38:1730" data-name="chevron-down">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronDown} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="38:1611">
                  All accounts
                </p>
              </div>
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[8px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[8px] shrink-0" data-node-id="38:1612" data-name="Action">
                <div className="relative shrink-0 size-[14px]" data-node-id="38:1754" data-name="arrow-down-up">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgArrowDownUp} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="38:1614">
                  Default order
                </p>
              </div>
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[8px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[8px] shrink-0" data-node-id="38:1615" data-name="Action">
                <div className="relative shrink-0 size-[14px]" data-node-id="38:1733" data-name="sliders-horizontal">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlidersHorizontal} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="38:1617">
                  Filters
                </p>
              </div>
            </div>
          </div>
          <div className="[word-break:break-word] border-[#30343b] border-b border-solid content-stretch flex font-['Inter:Regular'] font-normal gap-[14px] h-[30px] items-center leading-[normal] not-italic overflow-clip relative shrink-0 text-[#8c929c] text-[10px] w-full" data-node-id="38:1618" data-name="Column headings">
            <p className="relative shrink-0 w-[300px]" data-node-id="38:1619">
              Security
            </p>
            <p className="relative shrink-0 text-right w-[78px]" data-node-id="38:1620">
              Shares
            </p>
            <p className="relative shrink-0 text-right w-[94px]" data-node-id="38:1621">
              Avg. Cost
            </p>
            <p className="relative shrink-0 text-right w-[102px]" data-node-id="38:1622">
              Current Price
            </p>
            <p className="relative shrink-0 text-right w-[98px]" data-node-id="38:1623">
              Day Change
            </p>
            <p className="relative shrink-0 text-right w-[102px]" data-node-id="38:1624">
              Total Return
            </p>
            <p className="relative shrink-0 text-right w-[130px]" data-node-id="38:1625">
              Value
            </p>
            <p className="relative shrink-0 text-right w-[82px]" data-node-id="38:1626">
              Weight
            </p>
            <p className="relative shrink-0 text-right w-[30px]" data-node-id="38:1627">{` `}</p>
          </div>
          <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="38:1628" data-name="Holdings table">
            {error && <p className="text-[#ff7777] text-[12px]">{error}</p>}
            {!portfolio && !error && <p className="text-[#8c929c] text-[12px] py-4">Loading holdings...</p>}
            {portfolio?.holdings.length === 0 && <p className="text-[#8c929c] text-[12px] py-4">No investments yet.</p>}
            {portfolio?.holdings.map((holding) => (
              <div key={holding.symbol} className="border-[#30343b] border-b border-solid content-stretch flex gap-[14px] h-[64px] items-center overflow-clip relative shrink-0 w-full">
                <div className="content-stretch flex gap-[12px] items-center overflow-clip relative shrink-0 w-[300px]">
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px overflow-clip whitespace-nowrap">
                    <p className="font-['Inter:Semi_Bold'] font-semibold text-[#f5f5f5] text-[13px]">{holding.symbol}</p>
                    <p className="font-['Inter:Regular'] text-[#b4b8c0] text-[11px]">{holding.name}</p>
                  </div>
                  <div className="bg-[#1a1d22] px-[6px] py-[3px] rounded-[4px]">
                    <p className="text-[#8c929c] text-[9px]">{holding.asset_type}</p>
                  </div>
                </div>
                <p className="text-[#b4b8c0] text-[12px] text-right w-[78px]">{holding.quantity}</p>
                <p className="text-[#8c929c] text-[12px] text-right w-[94px]">—</p>
                <p className="text-[#b4b8c0] text-[12px] text-right w-[102px]">{formatCAD(holding.price)}</p>
                <p className="text-[#8c929c] text-[12px] text-right w-[98px]">—</p>
                <p className="text-[#8c929c] text-[12px] text-right w-[102px]">—</p>
                <p className="font-['Inter:Semi_Bold'] font-semibold text-[#f5f5f5] text-[12px] text-right w-[130px]">{formatCAD(holding.market_value)}</p>
                <p className="text-[#b4b8c0] text-[12px] text-right w-[82px]">
                  {portfolio && Number(portfolio.total_value) > 0
                    ? `${(Number(holding.market_value) / Number(portfolio.total_value) * 100).toFixed(2)}%`
                    : '0.00%'}
                </p>
                <div className="w-[30px]" />
              </div>
            ))}
          </div>
          <div className="content-stretch flex h-[56px] items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="38:1709" data-name="Cash balance">
            <div className="content-stretch flex gap-[12px] items-center overflow-clip relative shrink-0" data-node-id="38:1710" data-name="Cash account">
              <div className="relative shrink-0 size-[18px]" data-node-id="38:1751" data-name="wallet">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgWallet1} />
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[12px] whitespace-nowrap" data-node-id="38:1712">
                Cash Account
              </p>
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[11px] whitespace-nowrap" data-node-id="38:1713">
                Not invested
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex gap-[14px] items-start leading-[normal] not-italic overflow-clip pr-[44px] relative shrink-0 text-[12px] text-right" data-node-id="38:1714" data-name="Cash value and allocation">
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#f5f5f5] w-[130px]" data-node-id="38:1715">
              {portfolio ? formatCAD(portfolio.cash_balance) : 'Loading...'}
            </p>
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#b4b8c0] w-[82px]" data-node-id="38:1716">
              {portfolio && Number(portfolio.total_value) > 0 ? `${(Number(portfolio.cash_balance) / Number(portfolio.total_value) * 100).toFixed(2)}%` : '0.00%'}
            </p>
            </div>
          </div>
          <div className="[word-break:break-word] content-stretch flex font-['Inter:Regular'] font-normal h-[24px] items-center justify-between leading-[normal] not-italic overflow-clip relative shrink-0 text-[#8c929c] text-[10px] w-full whitespace-nowrap" data-node-id="38:1717" data-name="Table footer">
            <p className="relative shrink-0" data-node-id="38:1718">
              Showing all {portfolio?.holdings.length ?? 0} holdings
            </p>
            <p className="relative shrink-0" data-node-id="38:1719">
              Weights based on {portfolio ? formatCAD(portfolio.total_value) : 'Loading...'} total portfolio value, including cash.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}