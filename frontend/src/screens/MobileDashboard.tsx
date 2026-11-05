import HoldingsList from '../components/HoldingsList';
import { useTrading } from '../hooks/useTrading';
import { usePortfolio, formatCAD } from '../hooks/usePortfolio';
import { logout } from '../auth';
const assetPathPrefix = "/assets";
const imgOriginalLogoArtwork = `${assetPathPrefix}/c8aca.png`;
const imgIosSignal = `${assetPathPrefix}/7ea91.svg`;
const imgIosWifiSignal = `${assetPathPrefix}/26ba8.svg`;
const imgIosBatteryFull = `${assetPathPrefix}/b6411.svg`;
const imgNotifications = `${assetPathPrefix}/5d7f5.svg`;
const imgIcon = `${assetPathPrefix}/95b08.svg`;
const imgChevronDown = `${assetPathPrefix}/91cab.svg`;
const imgPerformanceLine = `${assetPathPrefix}/c429d.svg`;
const imgPerformanceArea = `${assetPathPrefix}/5a421.svg`;
const imgIcon1 = `${assetPathPrefix}/1c973.svg`;
const imgSearch = `${assetPathPrefix}/8559d.svg`;
const imgChevronDown1 = `${assetPathPrefix}/be170.svg`;
const imgArrowRight = `${assetPathPrefix}/c47e2.svg`;
const imgBriefcaseBusiness = `${assetPathPrefix}/3882f.svg`;
const imgWallet = `${assetPathPrefix}/204b0.svg`;
const imgArrowLeftRight = `${assetPathPrefix}/85a86.svg`;
const imgLandmark = `${assetPathPrefix}/9f609.svg`;
const imgBanknoteArrowUp = `${assetPathPrefix}/c197e.svg`;
const imgSettings = `${assetPathPrefix}/0f5bf.svg`;
const imgCircleHelp = `${assetPathPrefix}/862dd.svg`;
const imgIcon2 = `${assetPathPrefix}/d3345.svg`;
const imgIcon3 = `${assetPathPrefix}/15450.svg`;
const imgIcon4 = `${assetPathPrefix}/1209c.svg`;
const imgIcon5 = `${assetPathPrefix}/8fc10.svg`;
const imgIcon6 = `${assetPathPrefix}/21358.svg`;

export default function RussellWealthMobileDashboard() {
  const trading = useTrading();

  const { portfolio, error } = usePortfolio();

  return (
    <div className="bg-[#08090a] content-stretch flex flex-col items-start relative size-full" data-node-id="74:1887" data-name="Russell Wealth mobile dashboard">
      <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="74:1888" data-name="Dashboard header">
        <div className="content-stretch flex h-[54px] items-center justify-between overflow-clip pt-[4px] px-[28px] relative shrink-0 w-full" data-node-id="74:1889" data-name="Status bar">
          <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[15px] whitespace-nowrap" data-node-id="74:1890">
            9:41
          </p>
          <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="74:1891" data-name="Device status">
            <div className="relative shrink-0 size-[17px]" data-node-id="74:2176" data-name="ios-signal">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIosSignal} />
            </div>
            <div className="relative shrink-0 size-[17px]" data-node-id="74:2179" data-name="ios-wifi-signal">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIosWifiSignal} />
            </div>
            <div className="h-[17px] relative shrink-0 w-[25px]" data-node-id="74:2182" data-name="ios-battery-full">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIosBatteryFull} />
            </div>
          </div>
        </div>
        <div className="content-stretch flex h-[68px] items-center justify-between overflow-clip px-[20px] relative shrink-0 w-full" data-node-id="74:1895" data-name="Brand and account">
          <div className="h-[52px] relative shrink-0 w-[160px]" data-node-id="74:1896" data-name="Finalized Russell Wealth logo">
            <div className="absolute h-[78.8px] left-[-18.37px] top-[-15.7px] w-[196.75px]" data-node-id="74:1897" data-name="Original logo artwork">
              <a href="/" aria-label="Russell Wealth — refresh homepage" className="contents cursor-pointer"><img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgOriginalLogoArtwork} /></a>
            </div>
          </div>
          <div className="content-stretch flex gap-[12px] items-center overflow-clip relative shrink-0" data-node-id="74:1898" data-name="Account tools">
            <div className="h-[36px] relative shrink-0 w-[32px]" data-node-id="74:1899" data-name="Notifications">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgNotifications} />
            </div>
            <div className="bg-[#252a31] border border-[#30343b] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[100px] shrink-0 size-[34px]" data-node-id="74:1902" data-name="Edoney Russell profile">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#c5cad2] text-[11px] whitespace-nowrap" data-node-id="74:1903">
                ER
              </p>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[7px] items-start overflow-clip pb-[20px] pt-[16px] px-[20px] relative shrink-0 w-full" data-node-id="74:1904" data-name="Welcome">
          <p className="[word-break:break-word] font-['Cinzel:Bold'] font-bold leading-[normal] relative shrink-0 text-[#f5f5f5] text-[22px] w-full" data-node-id="74:1905">
            Welcome Back, Edoney
          </p>
          <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] w-full" data-node-id="74:1906">
            Here’s your investment overview.
          </p>
          <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[9px] h-[42px] items-center overflow-clip px-[12px] relative rounded-[8px] shrink-0 w-full" data-node-id="74:1907" data-name="Search">
            <div className="relative shrink-0 size-[15px]" data-node-id="74:1908" data-name="Icon">
              <div className="absolute inset-[0_11.11%_11.11%_0]">
                <img alt="" className="block max-w-none size-full" src={imgIcon} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[11px] whitespace-nowrap" data-node-id="74:1909">
              Search stocks, ETFs, or symbols...
            </p>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col gap-[24px] items-start overflow-clip pb-[24px] px-[20px] relative shrink-0 w-full" data-node-id="74:1910" data-name="Investment overview">
        <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:1911" data-name="Portfolio overview">
          <div className="content-stretch flex flex-col gap-[10px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:1912" data-name="Portfolio performance">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="74:1913" data-name="Portfolio heading">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="74:1914">
                Portfolio Value
              </p>
              <div className="content-stretch flex gap-[5px] items-center overflow-clip relative shrink-0" data-node-id="74:1915" data-name="Account selector">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="74:1916">
                  Personal account
                </p>
                <div className="relative shrink-0 size-[12px]" data-node-id="74:2185" data-name="chevron-down">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronDown} />
                </div>
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[40px] tracking-[-1.5px] whitespace-nowrap" data-node-id="74:1918">
              {error ? 'Unavailable' : portfolio ? formatCAD(portfolio.total_value) : 'Loading...'}
            </p>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[0] not-italic relative shrink-0 text-[#b4b8c0] text-[11px] whitespace-pre" data-node-id="74:1919">
              <span className="leading-[normal] text-[#39e58c]">↗ +3.28% (+$408.71)</span>
              <span className="leading-[normal]">{`  Past Month`}</span>
            </p>
            <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="74:1920">
              Portfolio Performance
            </p>
            <div className="content-stretch flex gap-[10px] h-[138px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:1921" data-name="Chart and value axis">
              <div className="flex-[1_0_0] h-[138px] min-w-px overflow-clip relative" data-node-id="74:1922" data-name="Portfolio performance chart">
                <div className="absolute h-[93px] left-0 top-[30px] w-[305px]" data-node-id="74:1929" data-name="Performance line">
                  <div className="absolute inset-[-0.97%_-0.3%]">
                    <img alt="" className="block max-w-none size-full" src={imgPerformanceLine} />
                  </div>
                </div>
                <div className="absolute h-[105px] left-0 top-[30px] w-[305px]" data-node-id="74:1928" data-name="Performance area">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPerformanceArea} />
                </div>
                <div className="absolute bg-[rgba(48,52,59,0.4)] h-px left-0 top-[132px] w-[305px]" data-node-id="74:1927" data-name="Grid line" />
                <div className="absolute bg-[rgba(48,52,59,0.4)] h-px left-0 top-[100px] w-[305px]" data-node-id="74:1926" data-name="Grid line" />
                <div className="absolute bg-[rgba(48,52,59,0.4)] h-px left-0 top-[68px] w-[305px]" data-node-id="74:1925" data-name="Grid line" />
                <div className="absolute bg-[rgba(48,52,59,0.4)] h-px left-0 top-[36px] w-[305px]" data-node-id="74:1924" data-name="Grid line" />
                <div className="absolute bg-[rgba(48,52,59,0.4)] h-px left-0 top-[4px] w-[305px]" data-node-id="74:1923" data-name="Grid line" />
              </div>
              <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Regular'] font-normal h-[138px] items-start justify-between leading-[normal] not-italic overflow-clip relative shrink-0 text-[#8c929c] text-[8px] w-[38px] whitespace-nowrap" data-node-id="74:1930" data-name="Value axis">
                <p className="relative shrink-0" data-node-id="74:1931">
                  13,200
                </p>
                <p className="relative shrink-0" data-node-id="74:1932">
                  12,800
                </p>
                <p className="relative shrink-0" data-node-id="74:1933">
                  12,400
                </p>
                <p className="relative shrink-0" data-node-id="74:1934">
                  12,000
                </p>
                <p className="relative shrink-0" data-node-id="74:1935">
                  11,600
                </p>
              </div>
            </div>
            <div className="[word-break:break-word] content-stretch flex font-['Inter:Regular'] font-normal items-start justify-between leading-[normal] not-italic overflow-clip pr-[48px] relative shrink-0 text-[#8c929c] text-[7px] w-full whitespace-nowrap" data-node-id="74:1936" data-name="Date axis">
              <p className="relative shrink-0" data-node-id="74:1937">
                Oct 1
              </p>
              <p className="relative shrink-0" data-node-id="74:1938">
                Oct 5
              </p>
              <p className="relative shrink-0" data-node-id="74:1939">
                Oct 9
              </p>
              <p className="relative shrink-0" data-node-id="74:1940">
                Oct 13
              </p>
              <p className="relative shrink-0" data-node-id="74:1941">
                Oct 17
              </p>
              <p className="relative shrink-0" data-node-id="74:1942">
                Oct 21
              </p>
              <p className="relative shrink-0" data-node-id="74:1943">
                Oct 25
              </p>
              <p className="relative shrink-0" data-node-id="74:1944">
                Oct 29
              </p>
            </div>
            <div className="bg-[#101216] content-stretch flex h-[34px] items-start overflow-clip p-[3px] relative rounded-[8px] shrink-0 w-full" data-node-id="74:1945" data-name="Time range">
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-[1_0_0] h-full items-center justify-center min-w-px overflow-clip relative rounded-[6px]" data-node-id="74:1946" data-name="Range option">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[10px] whitespace-nowrap" data-node-id="74:1947">
                  1D
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-[1_0_0] h-full items-center justify-center min-w-px overflow-clip relative rounded-[6px]" data-node-id="74:1948" data-name="Range option">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[10px] whitespace-nowrap" data-node-id="74:1949">
                  1W
                </p>
              </div>
              <div className="bg-[#252a31] content-stretch flex flex-[1_0_0] h-full items-center justify-center min-w-px overflow-clip relative rounded-[6px]" data-node-id="74:1950" data-name="Range option">
                <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[10px] whitespace-nowrap" data-node-id="74:1951">
                  1M
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-[1_0_0] h-full items-center justify-center min-w-px overflow-clip relative rounded-[6px]" data-node-id="74:1952" data-name="Range option">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[10px] whitespace-nowrap" data-node-id="74:1953">
                  3M
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-[1_0_0] h-full items-center justify-center min-w-px overflow-clip relative rounded-[6px]" data-node-id="74:1954" data-name="Range option">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[10px] whitespace-nowrap" data-node-id="74:1955">
                  1Y
                </p>
              </div>
              <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-[1_0_0] h-full items-center justify-center min-w-px overflow-clip relative rounded-[6px]" data-node-id="74:1956" data-name="Range option">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[10px] whitespace-nowrap" data-node-id="74:1957">
                  All
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex gap-[16px] items-start overflow-clip p-[16px] relative rounded-[12px] shrink-0 w-full" data-node-id="74:1958" data-name="Portfolio summary">
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start leading-[normal] min-w-px not-italic overflow-clip relative whitespace-nowrap" data-node-id="74:1959" data-name="Summary metric">
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#b4b8c0] text-[11px]" data-node-id="74:1960">{`Today’s P&L`}</p>
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#39e58c] text-[18px] tracking-[-0.5px]" data-node-id="74:1961">
                +$176.24
              </p>
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#39e58c] text-[11px]" data-node-id="74:1962">
                +1.39%
              </p>
            </div>
            <div className="bg-[#30343b] h-[58px] relative shrink-0 w-px" data-node-id="74:1963" data-name="Metric divider" />
            <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start leading-[normal] min-w-px not-italic overflow-clip relative whitespace-nowrap" data-node-id="74:1964" data-name="Summary metric">
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#b4b8c0] text-[11px]" data-node-id="74:1965">
                Total Return
              </p>
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#39e58c] text-[18px] tracking-[-0.5px]" data-node-id="74:1966">
                +$2,146.32
              </p>
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#39e58c] text-[11px]" data-node-id="74:1967">
                +20.06%
              </p>
            </div>
          </div>
          <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="74:1968" data-name="Cash balance">
            <div className="content-stretch flex gap-[7px] items-center overflow-clip relative shrink-0" data-node-id="74:1969" data-name="Cash label">
              <div className="relative shrink-0 size-[15px]" data-node-id="74:1970" data-name="Icon">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon1} />
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[12px] whitespace-nowrap" data-node-id="74:1971">
                Cash Balance
              </p>
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[14px] whitespace-nowrap" data-node-id="74:1972">
              {error ? 'Unavailable' : portfolio ? formatCAD(portfolio.cash_balance) : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[12px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:1973" data-name="Your holdings">
          <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="74:1974" data-name="Section heading">
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[17px] whitespace-nowrap" data-node-id="74:1975">
              Your Holdings ({portfolio?.holdings.length ?? 0})
            </p>
          </div>
          <div className="[word-break:break-word] content-stretch flex items-start justify-between leading-[normal] not-italic overflow-clip relative shrink-0 w-full whitespace-nowrap" data-node-id="74:1976" data-name="Holdings totals">
            <div className="content-stretch flex flex-col gap-[5px] items-start overflow-clip relative shrink-0" data-node-id="74:1977" data-name="Total value">
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#8c929c] text-[10px]" data-node-id="74:1978">
                Total Value
              </p>
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#f5f5f5] text-[19px]" data-node-id="74:1979">
                {portfolio ? formatCAD(portfolio.invested_value) : 'Loading...'}
              </p>
            </div>
            <div className="content-stretch flex flex-col gap-[5px] items-end overflow-clip relative shrink-0" data-node-id="74:1980" data-name="Day change">
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#8c929c] text-[10px]" data-node-id="74:1981">
                Day Change
              </p>
              <p className="font-['Inter:Medium'] font-medium relative shrink-0 text-[#39e58c] text-[14px]" data-node-id="74:1982">
                —
              </p>
            </div>
          </div>
          <div className="[word-break:break-word] border-[#30343b] border-solid border-t content-stretch flex flex-col items-start leading-[normal] not-italic overflow-clip relative shrink-0 w-full" data-node-id="74:1983" data-name="Holdings register">
            <HoldingsList mobile={true} />




          </div>
        </div>
        <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[14px] items-start overflow-clip p-[16px] relative rounded-[12px] shrink-0 w-full" data-node-id="74:2089" data-name="Trade ticket">
          <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="74:2090" data-name="Section heading">
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[17px] whitespace-nowrap" data-node-id="74:2091">
              Trade
            </p>
          </div>
          <div className="bg-[#101216] content-stretch flex h-[36px] items-start overflow-clip p-[3px] relative rounded-[8px] shrink-0 w-full" data-node-id="74:2092" data-name="Trade direction">
            <div role="button" tabIndex={0} onClick={() => trading.setDirection("BUY")} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trading.setDirection("BUY"); } }} className={`flex flex-1 h-full items-center justify-center rounded-[6px] cursor-pointer transition-colors duration-150 ${trading.direction === "BUY" ? "bg-[#c5cad2]" : "bg-[#101216]"}`} data-node-id="74:2093" data-name="Direction tab">
              <p className={`[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0  text-[12px] whitespace-nowrap ${trading.direction === "BUY" ? "text-[#08090a]" : "text-[#b4b8c0]"}`} data-node-id="74:2094">
                Buy
              </p>
            </div>
            <div role="button" tabIndex={0} onClick={() => trading.setDirection("SELL")} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trading.setDirection("SELL"); } }} className={`flex flex-1 h-full items-center justify-center rounded-[6px] cursor-pointer transition-colors duration-150 ${trading.direction === "SELL" ? "bg-[#c5cad2]" : "bg-[#101216]"}`} data-node-id="74:2095" data-name="Direction tab">
              <p className={`[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0  text-[12px] whitespace-nowrap ${trading.direction === "SELL" ? "text-[#08090a]" : "text-[#b4b8c0]"}`} data-node-id="74:2096">
                Sell
              </p>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[7px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:2097" data-name="Symbol field">
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="74:2098">
              Symbol
            </p>
            <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex gap-[8px] h-[42px] items-center overflow-clip px-[12px] relative rounded-[8px] shrink-0 w-full" data-node-id="74:2099" data-name="Symbol input">
              <div className="relative shrink-0 size-[15px]" data-node-id="74:2188" data-name="search">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearch} />
              </div>
              <input aria-label="Symbol" value={trading.symbol} onChange={e => trading.setSymbol(e.target.value.toUpperCase())} placeholder="VDY, XEG, RY, SHOP" className="bg-transparent outline-none w-full min-w-0 text-[#f5f5f5] text-[12px]" />
            </div>
          </div>
          <div className="content-stretch flex gap-[12px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:2102" data-name="Order details">
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-start min-w-px overflow-clip relative" data-node-id="74:2103" data-name="Order type">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="74:2104">
                Order Type
              </p>
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex h-[42px] items-center justify-between overflow-clip px-[12px] relative rounded-[8px] shrink-0 w-full" data-node-id="74:2105" data-name="Order type selector">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[12px] whitespace-nowrap" data-node-id="74:2106">
                  Market
                </p>
                <div className="relative shrink-0 size-[14px]" data-node-id="74:2191" data-name="chevron-down">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronDown1} />
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[7px] items-start overflow-clip relative shrink-0 w-[96px]" data-node-id="74:2108" data-name="Quantity">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="74:2109">
                Quantity
              </p>
              <div className="bg-[#101216] border border-[#30343b] border-solid content-stretch flex h-[42px] items-center overflow-clip px-[12px] relative rounded-[8px] shrink-0 w-full" data-node-id="74:2110" data-name="Quantity input">
                <input aria-label="Quantity" type="number" min="1" step="1" value={trading.quantity} onChange={e => trading.setQuantity(e.target.value)} className="bg-transparent outline-none w-full min-w-0 text-[#f5f5f5] text-[12px]" />
              </div>
            </div>
          </div>
          <div role="button" tabIndex={0} onClick={trading.submitTrade} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trading.submitTrade(); } }} className="bg-gradient-to-b content-stretch flex from-[#e3e6eb] gap-[10px] h-[46px] items-center justify-center overflow-clip relative rounded-[100px] shrink-0 to-[#9ea5af] via-[#c5cad2] via-[48%] w-full" data-node-id="74:2112" data-name="Primary action">
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#08090a] text-[13px] whitespace-nowrap" data-node-id="74:2113">
              {trading.submitting ? "Processing..." : trading.direction === "BUY" ? "Buy Shares" : "Sell Shares"}
            </p>
            <div className="relative shrink-0 size-[17px]" data-node-id="74:2194" data-name="arrow-right">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgArrowRight} />
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[24px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:2115" data-name="Accounts and actions">
          <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-col gap-[18px] items-start overflow-clip p-[16px] relative rounded-[12px] shrink-0 w-full" data-node-id="74:2116" data-name="Accounts">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="74:2117" data-name="Section heading">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[17px] whitespace-nowrap" data-node-id="74:2118">
                Accounts
              </p>
            </div>
            <div className="content-stretch flex gap-[9px] items-center overflow-clip relative shrink-0 w-full" data-node-id="74:2119" data-name="Account">
              <div className="relative shrink-0 size-[16px]" data-node-id="74:2197" data-name="briefcase-business">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBriefcaseBusiness} />
              </div>
              <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[11px]" data-node-id="74:2121">
                Investment Account
              </p>
              <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[12px] whitespace-nowrap" data-node-id="74:2122">
                {portfolio ? formatCAD(portfolio.invested_value) : "Loading..."}
              </p>
            </div>
            <div className="content-stretch flex gap-[9px] items-center overflow-clip relative shrink-0 w-full" data-node-id="74:2123" data-name="Account">
              <div className="relative shrink-0 size-[16px]" data-node-id="74:2200" data-name="wallet">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgWallet} />
              </div>
              <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[#b4b8c0] text-[11px]" data-node-id="74:2125">
                Cash Account
              </p>
              <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[12px] whitespace-nowrap" data-node-id="74:2126">
                {portfolio ? formatCAD(portfolio.cash_balance) : "Loading..."}
              </p>
            </div>
            <div className="[word-break:break-word] border-[#30343b] border-solid border-t content-stretch flex items-center justify-between leading-[normal] not-italic overflow-clip pt-[14px] relative shrink-0 w-full whitespace-nowrap" data-node-id="74:2127" data-name="Total balance">
              <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#b4b8c0] text-[12px]" data-node-id="74:2128">
                Total Balance
              </p>
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#f5f5f5] text-[15px]" data-node-id="74:2129">
                {portfolio ? formatCAD(portfolio.total_value) : "Loading..."}
              </p>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[14px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:2130" data-name="Quick actions">
            <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="74:2131" data-name="Section heading">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[17px] whitespace-nowrap" data-node-id="74:2132">
                Quick Actions
              </p>
            </div>
            <div className="content-stretch flex gap-[9px] items-start overflow-clip relative shrink-0 w-full" data-node-id="74:2133" data-name="Account actions">
              <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[10px] h-[76px] items-center justify-center min-w-px overflow-clip relative rounded-[8px]" data-node-id="74:2134" data-name="Quick action">
                <div className="relative shrink-0 size-[20px]" data-node-id="74:2203" data-name="arrow-left-right">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgArrowLeftRight} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[10px] whitespace-nowrap" data-node-id="74:2136">
                  Transfer Funds
                </p>
              </div>
              <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[10px] h-[76px] items-center justify-center min-w-px overflow-clip relative rounded-[8px]" data-node-id="74:2137" data-name="Quick action">
                <div className="relative shrink-0 size-[20px]" data-node-id="74:2206" data-name="landmark">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLandmark} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[10px] whitespace-nowrap" data-node-id="74:2139">
                  Deposit Funds
                </p>
              </div>
              <div className="bg-[#14171c] border border-[#30343b] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[10px] h-[76px] items-center justify-center min-w-px overflow-clip relative rounded-[8px]" data-node-id="74:2140" data-name="Quick action">
                <div className="relative shrink-0 size-[20px]" data-node-id="74:2209" data-name="banknote-arrow-up">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgBanknoteArrowUp} />
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[10px] whitespace-nowrap" data-node-id="74:2142">
                  Withdraw Funds
                </p>
              </div>
            </div>
          </div>
          <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="74:2143" data-name="Support navigation">
            <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="74:2144" data-name="Settings">
              <div className="relative shrink-0 size-[14px]" data-node-id="74:2212" data-name="settings">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSettings} />
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="74:2146">
                Settings
              </p>
            </div>
            <div className="content-stretch flex gap-[6px] items-center overflow-clip relative shrink-0" data-node-id="74:2147" data-name="Help and support">
              <div className="relative shrink-0 size-[14px]" data-node-id="74:2215" data-name="circle-help">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCircleHelp} />
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap" data-node-id="74:2149">{`Help & Support`}</p>
            </div>
            <button type="button" onClick={logout} className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#b4b8c0] text-[10px] whitespace-nowrap cursor-pointer" data-node-id="74:2150">
              Log out
            </button>
          </div>
        </div>
      </div>
      <div className="bg-[#101216] border-[#30343b] border-solid border-t content-stretch flex flex-col items-start overflow-clip relative shrink-0 w-full" data-node-id="74:2151" data-name="Bottom navigation and safe area">
        <div className="content-stretch flex items-start overflow-clip pb-[12px] pt-[14px] px-[10px] relative shrink-0 w-full" data-node-id="74:2152" data-name="Main navigation">
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-center min-w-px overflow-clip relative" data-node-id="74:2153" data-name="Navigation item">
            <div className="relative shrink-0 size-[19px]" data-node-id="74:2154" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f5f5f5] text-[8px] whitespace-nowrap" data-node-id="74:2155">
              Dashboard
            </p>
            <div className="bg-[#c5cad2] h-[2px] relative rounded-[2px] shrink-0 w-[16px]" data-node-id="74:2156" data-name="Active indicator" />
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-center min-w-px overflow-clip relative" data-node-id="74:2157" data-name="Navigation item">
            <div className="relative shrink-0 size-[19px]" data-node-id="74:2158" data-name="Icon">
              <div className="absolute inset-[0_0_50.1%_50.11%]">
                <img alt="" className="block max-w-none size-full" src={imgIcon3} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[8px] whitespace-nowrap" data-node-id="74:2159">
              Portfolio
            </p>
            <div className="bg-[rgba(0,0,0,0)] h-[2px] relative rounded-[2px] shrink-0 w-[16px]" data-node-id="74:2160" data-name="Active indicator" />
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-center min-w-px overflow-clip relative" data-node-id="74:2161" data-name="Navigation item">
            <div className="relative shrink-0 size-[19px]" data-node-id="74:2162" data-name="Icon">
              <div className="absolute inset-[-3.95%_-5.94%]">
                <img alt="" className="block max-w-none size-full" src={imgIcon4} />
              </div>
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[8px] whitespace-nowrap" data-node-id="74:2163">
              Trade
            </p>
            <div className="bg-[rgba(0,0,0,0)] h-[2px] relative rounded-[2px] shrink-0 w-[16px]" data-node-id="74:2164" data-name="Active indicator" />
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-center min-w-px overflow-clip relative" data-node-id="74:2165" data-name="Navigation item">
            <div className="relative shrink-0 size-[19px]" data-node-id="74:2166" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon5} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[8px] whitespace-nowrap" data-node-id="74:2167">
              Watchlist
            </p>
            <div className="bg-[rgba(0,0,0,0)] h-[2px] relative rounded-[2px] shrink-0 w-[16px]" data-node-id="74:2168" data-name="Active indicator" />
          </div>
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[7px] items-center min-w-px overflow-clip relative" data-node-id="74:2169" data-name="Navigation item">
            <div className="relative shrink-0 size-[19px]" data-node-id="74:2170" data-name="Icon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon6} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#8c929c] text-[8px] whitespace-nowrap" data-node-id="74:2171">
              Transactions
            </p>
            <div className="bg-[rgba(0,0,0,0)] h-[2px] relative rounded-[2px] shrink-0 w-[16px]" data-node-id="74:2172" data-name="Active indicator" />
          </div>
        </div>
        <div className="content-stretch flex h-[28px] items-center justify-center overflow-clip relative shrink-0 w-full" data-node-id="74:2173" data-name="Home safe area">
          <div className="bg-[#f5f5f5] h-[5px] relative rounded-[8px] shrink-0 w-[134px]" data-node-id="74:2174" data-name="Home indicator" />
        </div>
      </div>
    </div>
  );
}
