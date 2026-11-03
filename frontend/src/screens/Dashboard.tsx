import MarketSearch from '../components/MarketSearch'
import HoldingsList from '../components/HoldingsList';
import { useTrading } from '../hooks/useTrading';
import { usePortfolio, formatCAD } from '../hooks/usePortfolio';
import { logout } from '../auth';
const assetPathPrefix = "/assets";
const imgOriginalLogoArtwork = `${assetPathPrefix}/c8aca.png`;
const imgLayoutDashboard = `${assetPathPrefix}/50fa9.svg`;
const imgChartPie = `${assetPathPrefix}/70fb9.svg`;
const imgArrowLeftRight = `${assetPathPrefix}/74de4.svg`;
const imgStar = `${assetPathPrefix}/18ed1.svg`;
const imgReceiptText = `${assetPathPrefix}/ca3db.svg`;
const imgSettings = `${assetPathPrefix}/e1d1e.svg`;
const imgCircleHelp = `${assetPathPrefix}/2bd20.svg`;
const imgLogOut = `${assetPathPrefix}/edbc5.svg`;
const imgSearch = `${assetPathPrefix}/b5c77.svg`;
const imgNotifications = `${assetPathPrefix}/3ccc6.svg`;
const imgInfo = `${assetPathPrefix}/65948.svg`;
const imgTrendingUp = `${assetPathPrefix}/1cd55.svg`;
const imgLayers = `${assetPathPrefix}/a9977.svg`;
const imgWallet = `${assetPathPrefix}/347d7.svg`;
const imgPerformanceLine = `${assetPathPrefix}/89095.svg`;
const imgPerformanceArea = `${assetPathPrefix}/cca8c.svg`;
const imgApple = `${assetPathPrefix}/a4ae5.svg`;
const imgSearch1 = `${assetPathPrefix}/d51ae.svg`;
const imgChevronDown = `${assetPathPrefix}/7881d.svg`;
const imgBriefcaseBusiness = `${assetPathPrefix}/f8f2c.svg`;
const imgWallet1 = `${assetPathPrefix}/872c1.svg`;
const imgArrowLeftRight1 = `${assetPathPrefix}/2af72.svg`;
const imgLandmark = `${assetPathPrefix}/86536.svg`;
const imgBanknoteArrowUp = `${assetPathPrefix}/bcccb.svg`;

export default function RussellWealthDashboard() {
  const trading = useTrading();

  const { portfolio, error } = usePortfolio();

  return (
    <div className="bg-[#080a0d] content-stretch flex items-start justify-end relative size-full" data-node-id="10:1587" data-name="Russell Wealth dashboard">
      <div className="bg-[#0b0d11] border-[#30343b] border-r border-solid content-stretch flex flex-col gap-[30px] h-[1080px] items-start overflow-clip pb-[24px] pt-[26px] px-[16px] relative shrink-0 w-[208px]" data-node-id="10:1588" data-name="Sidebar">
        <div className="h-[64px] overflow-clip relative shrink-0 w-[176px]" data-node-id="10:1589" data-name="Russell Wealth logo">
          <div className="absolute h-[86.7px] left-[-20.2px] top-[-17.3px] w-[216.4px]" data-node-id="10:1590" data-name="Original logo artwork">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgOriginalLogoArtwork} />
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[10px] items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1591" data-name="Main navigation">
          <div className="bg-[#1a1d22] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="10:1592" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="10:1851" data-name="layout-dashboard">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLayoutDashboard} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[13px] whitespace-nowrap" data-node-id="10:1594">
              Dashboard
            </p>
          </div>
          <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="10:1595" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="10:1854" data-name="chart-pie">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChartPie} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="10:1597">
              Portfolio
            </p>
          </div>
          <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="10:1598" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="10:1857" data-name="arrow-left-right">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgArrowLeftRight} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="10:1600">
              Trade
            </p>
          </div>
          <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="10:1601" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="10:1860" data-name="star">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStar} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="10:1603">
              Watchlist
            </p>
          </div>
          <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[48px] items-center overflow-clip px-[14px] relative rounded-[8px] shrink-0 w-full" data-node-id="10:1604" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="10:1863" data-name="receipt-text">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgReceiptText} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="10:1606">
              Transactions
            </p>
          </div>
        </div>
        <div className="flex-[1_0_0] min-h-px relative w-full" data-node-id="10:1607" data-name="Sidebar space" />
        <div className="content-stretch flex flex-col gap-[8px] items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1608" data-name="Support navigation">
          <div className="content-stretch flex gap-[12px] h-[42px] items-center overflow-clip px-[14px] relative shrink-0 w-full" data-node-id="10:1609" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="10:1866" data-name="settings">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSettings} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="10:1611">
              Settings
            </p>
          </div>
          <div className="content-stretch flex gap-[12px] h-[42px] items-center overflow-clip px-[14px] relative shrink-0 w-full" data-node-id="10:1612" data-name="Navigation item">
            <div className="relative shrink-0 size-[20px]" data-node-id="10:1869" data-name="circle-help">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCircleHelp} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-nowrap" data-node-id="10:1614">{`Help & Support`}</p>
          </div>
        </div>
        <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[18px] items-start overflow-clip p-[12px] relative rounded-[12px] shrink-0 w-full" data-node-id="10:1615" data-name="Member profile">
          <div className="content-stretch flex gap-[10px] items-center overflow-clip relative shrink-0" data-node-id="10:1616" data-name="Member">
            <div className="bg-[#252a31] content-stretch flex items-center justify-center overflow-clip relative rounded-[100px] shrink-0 size-[32px]" data-node-id="10:1617" data-name="Avatar">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#c5cad2] text-[11px] whitespace-nowrap" data-node-id="10:1618">
                ER
              </p>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[normal] not-italic overflow-clip relative shrink-0 whitespace-nowrap" data-node-id="10:1619" data-name="Identity">
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#f5f5f5] text-[12px]" data-node-id="10:1620">
                Edoney Russell
              </p>
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#8c929c] text-[10px]" data-node-id="10:1621">
                Personal account
              </p>
            </div>
          </div>
          <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="10:1622" data-name="Sign out" onClick={logout} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); logout(); } }}>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="10:1623">
              Log out
            </p>
            <div className="relative shrink-0 size-[16px]" data-node-id="10:1872" data-name="log-out">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLogOut} />
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-[1_0_0] flex-col gap-[24px] items-start min-w-px overflow-clip p-[28px] relative" data-node-id="10:1625" data-name="Dashboard content">
        <div className="content-stretch flex h-[76px] items-start justify-between overflow-clip relative shrink-0 w-full" data-node-id="10:1626" data-name="Dashboard header">
          <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-node-id="10:1627" data-name="Welcome">
            <p className="font-['Lora:Bold'] font-bold relative shrink-0 text-[#f5f5f5] text-[32px]" data-node-id="10:1628">
              Welcome Back, Edoney
            </p>
            <p className="font-['Inter:Regular'] font-normal not-italic relative shrink-0 text-[#b4b8c0] text-[16px]" data-node-id="10:1629">
              Here’s your investment overview.
            </p>
          </div>
          <div className="content-stretch flex gap-[16px] items-center overflow-clip relative shrink-0" data-node-id="10:1630" data-name="Header tools">
            <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[12px] h-[46px] items-center overflow-clip px-[16px] relative rounded-[8px] shrink-0 w-[360px]" data-node-id="10:1631" data-name="Search"
              role="button"
              tabIndex={0}
              onClick={() => window.dispatchEvent(new Event('russellwealth:open-market-search'))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  window.dispatchEvent(new Event('russellwealth:open-market-search'))
                }
              }}>
              <div className="relative shrink-0 size-[18px]" data-node-id="10:1875" data-name="search">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearch} />
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[14px] whitespace-nowrap" data-node-id="10:1633">
                Search stocks, ETFs, or symbols...
              </p>
            </div>
            <MarketSearch triggerOnly />
            <div className="h-[46px] relative shrink-0 w-[42px]" data-node-id="10:1634" data-name="Notifications">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgNotifications} />
            </div>
          </div>
        </div>
        <div className="content-stretch flex gap-[24px] items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1637" data-name="Portfolio summary">
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[136px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="10:1638" data-name="Metric card">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="10:1639" data-name="Metric heading">
              <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="10:1640" data-name="Label and information">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[14px] whitespace-nowrap" data-node-id="10:1641">
                  Portfolio Value
                </p>
                <div className="relative shrink-0 size-[13px]" data-node-id="10:1881" data-name="info">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgInfo} />
                </div>
              </div>
              <div className="relative shrink-0 size-[24px]" data-node-id="10:1884" data-name="trending-up">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgTrendingUp} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[28px] tracking-[-0.7px] whitespace-nowrap" data-node-id="10:1644">
              {error ? 'Unavailable' : portfolio ? formatCAD(portfolio.total_value) : 'Loading...'}
            </p>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#39e58c] text-[13px] whitespace-nowrap" data-node-id="10:1645">
              +3.28% (+$408.71)
            </p>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[136px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="10:1646" data-name="Metric card">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="10:1647" data-name="Metric heading">
              <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="10:1648" data-name="Label and information">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[14px] whitespace-nowrap" data-node-id="10:1649">{`Today’s P&L`}</p>
                <div className="relative shrink-0 size-[13px]" data-node-id="10:1887" data-name="info">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgInfo} />
                </div>
              </div>
              <div className="relative shrink-0 size-[24px]" data-node-id="10:1890" data-name="trending-up">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgTrendingUp} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#39e58c] text-[28px] tracking-[-0.7px] whitespace-nowrap" data-node-id="10:1652">
              +$176.24
            </p>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#39e58c] text-[13px] whitespace-nowrap" data-node-id="10:1653">
              +1.39%
            </p>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[136px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="10:1654" data-name="Metric card">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="10:1655" data-name="Metric heading">
              <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="10:1656" data-name="Label and information">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[14px] whitespace-nowrap" data-node-id="10:1657">
                  Total Return
                </p>
                <div className="relative shrink-0 size-[13px]" data-node-id="10:1893" data-name="info">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgInfo} />
                </div>
              </div>
              <div className="relative shrink-0 size-[24px]" data-node-id="10:1896" data-name="layers">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLayers} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#39e58c] text-[28px] tracking-[-0.7px] whitespace-nowrap" data-node-id="10:1660">
              +$2,146.32
            </p>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#39e58c] text-[13px] whitespace-nowrap" data-node-id="10:1661">
              +20.06%
            </p>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[136px] items-start min-w-px overflow-clip p-[20px] relative rounded-[12px]" data-node-id="10:1662" data-name="Metric card">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="10:1663" data-name="Metric heading">
              <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="10:1664" data-name="Label and information">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[14px] whitespace-nowrap" data-node-id="10:1665">
                  Cash Balance
                </p>
                <div className="relative shrink-0 size-[13px]" data-node-id="10:1899" data-name="info">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgInfo} />
                </div>
              </div>
              <div className="relative shrink-0 size-[24px]" data-node-id="10:1902" data-name="wallet">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgWallet} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[28px] tracking-[-0.7px] whitespace-nowrap" data-node-id="10:1668">
              {error ? 'Unavailable' : portfolio ? formatCAD(portfolio.cash_balance) : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="content-stretch flex gap-[24px] items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1669" data-name="Investments and trading">
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[24px] items-start min-w-px overflow-clip relative" data-node-id="10:1670" data-name="Portfolio overview">
            <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[12px] h-[360px] items-start overflow-clip p-[24px] relative rounded-[12px] shrink-0 w-full" data-node-id="10:1671" data-name="Portfolio performance">
              <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="10:1672" data-name="Performance controls">
                <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[18px] whitespace-nowrap" data-node-id="10:1673">
                  Portfolio Performance
                </p>
                <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[4px] items-start overflow-clip p-[3px] relative rounded-[8px] shrink-0" data-node-id="10:1674" data-name="Time range">
                  <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[26px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[39px]" data-node-id="10:1675" data-name="Range option">
                    <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="10:1676">
                      1D
                    </p>
                  </div>
                  <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[26px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[39px]" data-node-id="10:1677" data-name="Range option">
                    <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="10:1678">
                      1W
                    </p>
                  </div>
                  <div className="bg-[#252a31] content-stretch flex h-[26px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[39px]" data-node-id="10:1679" data-name="Range option">
                    <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[11px] whitespace-nowrap" data-node-id="10:1680">
                      1M
                    </p>
                  </div>
                  <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[26px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[39px]" data-node-id="10:1681" data-name="Range option">
                    <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="10:1682">
                      3M
                    </p>
                  </div>
                  <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[26px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[39px]" data-node-id="10:1683" data-name="Range option">
                    <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="10:1684">
                      1Y
                    </p>
                  </div>
                  <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[26px] items-center justify-center overflow-clip relative rounded-[6px] shrink-0 w-[39px]" data-node-id="10:1685" data-name="Range option">
                    <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="10:1686">
                      All
                    </p>
                  </div>
                </div>
              </div>
              <div className="[word-break:break-word] content-stretch flex flex-col gap-[5px] items-start not-italic overflow-clip relative shrink-0" data-node-id="10:1687" data-name="Current performance">
                <p className="font-['Inter:Semi_Bold'] font-semibold leading-[normal] relative shrink-0 text-[#f5f5f5] text-[30px] tracking-[-0.6px] whitespace-nowrap" data-node-id="10:1688">
                  $12,846.32
                </p>
                <p className="font-['Inter:Regular'] font-normal leading-[0] relative shrink-0 text-[#b4b8c0] text-[13px] whitespace-pre" data-node-id="10:1689">
                  <span className="leading-[normal] text-[#39e58c]">↗ +3.28% (+$408.71)</span>
                  <span className="leading-[normal]">{`  Past Month`}</span>
                </p>
              </div>
              <div className="content-stretch flex gap-[16px] h-[183px] items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1690" data-name="Chart and value axis">
                <div className="flex-[1_0_0] h-[183px] min-w-px overflow-clip relative" data-node-id="10:1691" data-name="Performance chart">
                  <div className="absolute h-[116px] left-0 top-[48px] w-[888px]" data-node-id="10:1697" data-name="Performance line">
                    <div className="absolute inset-[-0.91%_-0.12%]">
                      <img alt="" className="block max-w-none size-full" src={imgPerformanceLine} />
                    </div>
                  </div>
                  <div className="absolute h-[131px] left-0 top-[48px] w-[888px]" data-node-id="10:1696" data-name="Performance area">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPerformanceArea} />
                  </div>
                  <div className="absolute bg-[#30343b] h-px left-0 opacity-35 top-[154px] w-[888px]" data-node-id="10:1695" data-name="Grid line" />
                  <div className="absolute bg-[#30343b] h-px left-0 opacity-35 top-[108px] w-[888px]" data-node-id="10:1694" data-name="Grid line" />
                  <div className="absolute bg-[#30343b] h-px left-0 opacity-35 top-[62px] w-[888px]" data-node-id="10:1693" data-name="Grid line" />
                  <div className="absolute bg-[#30343b] h-px left-0 opacity-35 top-[16px] w-[888px]" data-node-id="10:1692" data-name="Grid line" />
                </div>
                <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Regular'] font-normal h-[183px] items-start justify-between leading-[normal] not-italic overflow-clip pb-[5px] relative shrink-0 text-[#8c929c] text-[10px] w-[44px] whitespace-nowrap" data-node-id="10:1698" data-name="Value axis">
                  <p className="relative shrink-0" data-node-id="10:1699">
                    13,200
                  </p>
                  <p className="relative shrink-0" data-node-id="10:1700">
                    12,800
                  </p>
                  <p className="relative shrink-0" data-node-id="10:1701">
                    12,400
                  </p>
                  <p className="relative shrink-0" data-node-id="10:1702">
                    12,000
                  </p>
                  <p className="relative shrink-0" data-node-id="10:1703">
                    11,600
                  </p>
                </div>
              </div>
              <div className="[word-break:break-word] content-stretch flex font-['Inter:Regular'] font-normal items-start justify-between leading-[normal] not-italic overflow-clip pr-[60px] relative shrink-0 text-[#8c929c] text-[10px] w-full whitespace-nowrap" data-node-id="10:1704" data-name="Date axis">
                <p className="relative shrink-0" data-node-id="10:1705">
                  Oct 1
                </p>
                <p className="relative shrink-0" data-node-id="10:1706">
                  Oct 5
                </p>
                <p className="relative shrink-0" data-node-id="10:1707">
                  Oct 9
                </p>
                <p className="relative shrink-0" data-node-id="10:1708">
                  Oct 13
                </p>
                <p className="relative shrink-0" data-node-id="10:1709">
                  Oct 17
                </p>
                <p className="relative shrink-0" data-node-id="10:1710">
                  Oct 21
                </p>
                <p className="relative shrink-0" data-node-id="10:1711">
                  Oct 25
                </p>
                <p className="relative shrink-0" data-node-id="10:1712">
                  Oct 29
                </p>
              </div>
            </div>
            <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[12px] h-[352px] items-start overflow-clip pb-[16px] pt-[20px] px-[24px] relative rounded-[12px] shrink-0 w-full" data-node-id="10:1713" data-name="Your holdings">
              <div className="[word-break:break-word] content-stretch flex items-center justify-between not-italic overflow-clip relative shrink-0 w-full whitespace-nowrap" data-node-id="10:1714" data-name="Holdings heading">
                <p className="font-['Inter:Semi_Bold'] font-semibold leading-[normal] relative shrink-0 text-[#f5f5f5] text-[18px]" data-node-id="10:1715">
                  Your Holdings ({portfolio?.holdings.length ?? 0})
                </p>
                <div className="content-stretch flex font-['Inter:Regular'] font-normal gap-[16px] items-start leading-[0] overflow-clip relative shrink-0 text-[#b4b8c0] text-[11px]" data-node-id="10:1716" data-name="Holdings totals">
                  <p className="relative shrink-0" data-node-id="10:1717">
                    <span className="leading-[normal]">{`Total Value: `}</span>
                    <span className="leading-[normal] text-[#f5f5f5]">{portfolio ? formatCAD(portfolio.invested_value) : 'Loading...'}</span>
                  </p>
                  <p className="relative shrink-0" data-node-id="10:1718">
                    <span className="leading-[normal]">{`Day Change: `}</span>
                    <span className="leading-[normal] text-[#39e58c]">—</span>
                  </p>
                </div>
              </div>
              <div className="[word-break:break-word] border-[#30343b] border-b border-solid content-stretch flex font-['Inter:Regular'] font-normal gap-[10px] h-[26px] items-center leading-[normal] not-italic overflow-clip relative shrink-0 text-[#8c929c] text-[10px] w-full" data-node-id="10:1719" data-name="Table headings">
                <p className="relative shrink-0 w-[94px]" data-node-id="10:1720">
                  Symbol
                </p>
                <p className="relative shrink-0 w-[171px]" data-node-id="10:1721">
                  Company
                </p>
                <p className="relative shrink-0 w-[52px]" data-node-id="10:1722">
                  Shares
                </p>
                <p className="relative shrink-0 w-[76px]" data-node-id="10:1723">
                  Avg. Cost
                </p>
                <p className="relative shrink-0 w-[82px]" data-node-id="10:1724">
                  Current Price
                </p>
                <p className="relative shrink-0 w-[78px]" data-node-id="10:1725">
                  Day Change
                </p>
                <p className="relative shrink-0 w-[82px]" data-node-id="10:1726">
                  Total Return
                </p>
                <p className="relative shrink-0 text-right w-[95px]" data-node-id="10:1727">
                  Value
                </p>
              </div>
              <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1728" data-name="Holdings table">
                <HoldingsList />




              </div>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[20px] items-start overflow-clip relative shrink-0 w-[300px]" data-node-id="10:1800" data-name="Trading and accounts">
            <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[13px] items-start overflow-clip p-[18px] relative rounded-[12px] shrink-0 w-full" data-node-id="10:1801" data-name="Trade ticket">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[18px] whitespace-nowrap" data-node-id="10:1802">
                Trade
              </p>
              <div className="bg-[#101216] content-stretch flex h-[35px] items-start overflow-clip p-[2px] relative rounded-[6px] shrink-0 w-full" data-node-id="10:1803" data-name="Trade direction">
                <div role="button" tabIndex={0} onClick={() => trading.setDirection("BUY")} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trading.setDirection("BUY"); } }} className={`flex flex-1 h-full items-center justify-center rounded-[6px] cursor-pointer transition-colors duration-150 ${trading.direction === "BUY" ? "bg-[#c5cad2]" : "bg-[#101216]"}`} data-node-id="10:1804" data-name="Buy tab">
                  <p className={`[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0  text-[12px] whitespace-nowrap ${trading.direction === "BUY" ? "text-[#08090a]" : "text-[#b4b8c0]"}`} data-node-id="10:1805">
                    Buy
                  </p>
                </div>
                <div role="button" tabIndex={0} onClick={() => trading.setDirection("SELL")} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trading.setDirection("SELL"); } }} className={`flex flex-1 h-full items-center justify-center rounded-[6px] cursor-pointer transition-colors duration-150 ${trading.direction === "SELL" ? "bg-[#c5cad2]" : "bg-[#101216]"}`} data-node-id="10:1806" data-name="Sell tab">
                  <p className={`[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0  text-[12px] whitespace-nowrap ${trading.direction === "SELL" ? "text-[#08090a]" : "text-[#b4b8c0]"}`} data-node-id="10:1807">
                    Sell
                  </p>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[7px] items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1808" data-name="Symbol field">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="10:1809">
                  Symbol
                </p>
                <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[8px] h-[36px] items-center overflow-clip px-[12px] relative rounded-[6px] shrink-0 w-full" data-node-id="10:1810" data-name="Symbol input">
                  <div className="relative shrink-0 size-[15px]" data-node-id="10:1908" data-name="search">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearch1} />
                  </div>
                  <input aria-label="Symbol" value={trading.symbol} onChange={e => trading.setSymbol(e.target.value.toUpperCase())} placeholder="VDY, XEG, RY, SHOP" className="bg-transparent outline-none w-full min-w-0 text-[#f5f5f5] text-[12px]" />
                </div>
              </div>
              <div className="content-stretch flex gap-[12px] items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1813" data-name="Order details">
                <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-start min-w-px overflow-clip relative" data-node-id="10:1814" data-name="Order type">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="10:1815">
                    Order Type
                  </p>
                  <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex h-[36px] items-center justify-between overflow-clip px-[10px] relative rounded-[6px] shrink-0 w-full" data-node-id="10:1816" data-name="Type selector">
                    <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[12px] whitespace-nowrap" data-node-id="10:1817">
                      Market
                    </p>
                    <div className="relative shrink-0 size-[13px]" data-node-id="10:1911" data-name="chevron-down">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronDown} />
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-col gap-[7px] items-start overflow-clip relative shrink-0 w-[88px]" data-node-id="10:1819" data-name="Quantity">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-nowrap" data-node-id="10:1820">
                    Quantity
                  </p>
                  <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex h-[36px] items-center overflow-clip px-[10px] relative rounded-[6px] shrink-0 w-full" data-node-id="10:1821" data-name="Quantity input">
                    <input aria-label="Quantity" type="number" min="1" step="1" value={trading.quantity} onChange={e => trading.setQuantity(e.target.value)} className="bg-transparent outline-none w-full min-w-0 text-[#f5f5f5] text-[12px]" />
                  </div>
                </div>
              </div>
              <div role="button" tabIndex={0} onClick={trading.submitTrade} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trading.submitTrade(); } }} className="bg-gradient-to-b border border-[#c5cad2] border-solid content-stretch flex from-[#e5e7eb] h-[42px] items-center justify-center overflow-clip px-[16px] relative rounded-[8px] shrink-0 to-[#c5cad2] w-full" data-node-id="10:1823" data-name="Action">
                <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#080a0d] text-[13px] whitespace-nowrap" data-node-id="10:1824">
                  {trading.submitting ? "Processing..." : trading.direction === "BUY" ? "Buy Shares" : "Sell Shares"}
                </p>
              </div>
            </div>
            <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[16px] items-start overflow-clip p-[18px] relative rounded-[12px] shrink-0 w-full" data-node-id="10:1825" data-name="Accounts">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[18px] whitespace-nowrap" data-node-id="10:1826">
                Accounts
              </p>
              <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0 w-full" data-node-id="10:1827" data-name="Account">
                <div className="relative shrink-0 size-[17px]" data-node-id="10:1914" data-name="briefcase-business">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBriefcaseBusiness} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[11px]" data-node-id="10:1829">
                  Investment Account
                </p>
                <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[11px] whitespace-nowrap" data-node-id="10:1830">
                  {portfolio ? formatCAD(portfolio.invested_value) : "Loading..."}
                </p>
              </div>
              <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0 w-full" data-node-id="10:1831" data-name="Account">
                <div className="relative shrink-0 size-[17px]" data-node-id="10:1917" data-name="wallet">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgWallet1} />
                </div>
                <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[11px]" data-node-id="10:1833">
                  Cash Account
                </p>
                <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[11px] whitespace-nowrap" data-node-id="10:1834">
                  {portfolio ? formatCAD(portfolio.cash_balance) : "Loading..."}
                </p>
              </div>
              <div className="[word-break:break-word] border-[#30343b] border-solid border-t content-stretch flex items-start justify-between leading-[normal] not-italic overflow-clip pt-[13px] relative shrink-0 w-full whitespace-nowrap" data-node-id="10:1835" data-name="Total balance">
                <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#b4b8c0] text-[12px]" data-node-id="10:1836">
                  Total Balance
                </p>
                <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#f5f5f5] text-[13px]" data-node-id="10:1837">
                  {portfolio ? formatCAD(portfolio.total_value) : "Loading..."}
                </p>
              </div>
            </div>
            <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[16px] items-start overflow-clip p-[18px] relative rounded-[12px] shrink-0 w-full" data-node-id="10:1838" data-name="Quick actions">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[18px] whitespace-nowrap" data-node-id="10:1839">
                Quick Actions
              </p>
              <div className="content-stretch flex gap-[9px] items-start overflow-clip relative shrink-0 w-full" data-node-id="10:1840" data-name="Account actions">
                <div className="bg-[#1a1d22] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[85px] items-center min-w-px overflow-clip px-[4px] py-[12px] relative rounded-[8px]" data-node-id="10:1841" data-name="Quick action">
                  <div className="relative shrink-0 size-[22px]" data-node-id="10:1920" data-name="arrow-left-right">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgArrowLeftRight1} />
                  </div>
                  <div className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[#f5f5f5] text-[10px] text-center w-[min-content]" data-node-id="10:1843">
                    <p className="leading-[1.3] mb-0">Transfer</p>
                    <p className="leading-[1.3]">Funds</p>
                  </div>
                </div>
                <div className="bg-[#1a1d22] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[85px] items-center min-w-px overflow-clip px-[4px] py-[12px] relative rounded-[8px]" data-node-id="10:1844" data-name="Quick action">
                  <div className="relative shrink-0 size-[22px]" data-node-id="10:1923" data-name="landmark">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLandmark} />
                  </div>
                  <div className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[#f5f5f5] text-[10px] text-center w-[min-content]" data-node-id="10:1846">
                    <p className="leading-[1.3] mb-0">Deposit</p>
                    <p className="leading-[1.3]">Funds</p>
                  </div>
                </div>
                <div className="bg-[#1a1d22] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[9px] h-[85px] items-center min-w-px overflow-clip px-[4px] py-[12px] relative rounded-[8px]" data-node-id="10:1847" data-name="Quick action">
                  <div className="relative shrink-0 size-[22px]" data-node-id="10:1926" data-name="banknote-arrow-up">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBanknoteArrowUp} />
                  </div>
                  <div className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[#f5f5f5] text-[10px] text-center w-[min-content]" data-node-id="10:1849">
                    <p className="leading-[1.3] mb-0">Withdraw</p>
                    <p className="leading-[1.3]">Funds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
