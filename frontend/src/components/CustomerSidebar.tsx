import { useAccountProfile } from "../hooks/useAccountProfile";
import { customerNavigation as items, supportNavigation as support, securityNavigation, customerSettings, adminSettings } from "../content/navigationContent";
import { logout } from "../auth";
import { useEffect, useState } from "react";

const assets = "/assets";

function go(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) return;

  event.preventDefault();

  if (href === '/security') {
    goToSocDashboard();
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }

  if (window.location.pathname !== href.split("#")[0] ||
      window.location.pathname + window.location.hash !== href) {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  const hash = href.split("#")[1];

  if (hash) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({
          behavior: "smooth"
        });
      });
    });
  } else {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

function NavItem({
  label, href, icon
}: {
  label: string;
  href: string;
  icon: string;
}) {
  const current = window.location.pathname;
  const active = href.includes("#")
    ? current === href.split("#")[0] &&
      window.location.hash === "#" + href.split("#")[1]
    : current === href &&
      !(href === "/dashboard" && window.location.hash);

  return (
    <a
      href={href}
      title={label}
      onClick={e => go(e, href)}
      aria-current={active ? "page" : undefined}
      className={
        "rw-unified-nav-item flex h-[48px] w-full shrink-0 items-center " +
        "gap-[12px] rounded-[8px] px-[14px] transition-colors duration-200 " +
        (active
          ? "bg-[#1a1d22] text-[#f5f5f5]"
          : "text-[#b4b8c0] hover:bg-[#1a1d22]")
      }
    >
      <img
        alt=""
        src={`${assets}/${icon}`}
        className="rw-customer-sidebar size-[20px] shrink-0"
      />
      <span className={
        "whitespace-nowrap text-[13px] " +
        (active ? "font-semibold" : "font-normal")
      }>
        {label}
      </span>
    </a>
  );
}

export default function CustomerSidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { profileName, profilePhoto } = useAccountProfile();

  return (
    <aside
      data-name="Unified Customer Sidebar"
      className="rw-unified-sidebar flex w-[208px] shrink-0 flex-col gap-[30px] border-r border-[#30343b] bg-[#0b0d11] px-[16px] pb-[24px] pt-[26px]"
    >
      <button
        type="button"
        className="rw-brand-refresh relative h-[64px] w-[176px] shrink-0 cursor-pointer overflow-hidden"
        aria-label="Refresh Russell Wealth"
        onClick={() => window.location.reload()}
      >
        <img
          alt="Russell Wealth"
          src={`${assets}/c8aca.png`}
          className="pointer-events-none absolute left-[-20.2px] top-[-17.3px] h-[86.7px] w-[216.4px] max-w-none object-cover"
        />
      </button>

      <nav
        aria-label="Customer navigation"
        className="rw-customer-nav rw-motion-nav relative flex flex-col gap-[10px]"
        onMouseLeave={() => setHoveredItem(null)}
      >
        <span
          className="rw-moving-indicator"
          style={{
            transform: `translateY(${
              Math.max(
                0,
                items.findIndex(item =>
                  item.label === (
                    hoveredItem ??
                    items.find(candidate =>
                      candidate.href ===
                      window.location.pathname + window.location.hash
                    )?.label ??
                    "Dashboard"
                  )
                )
              ) * 58
            }px)`
          }}
        />
        {items.map(item => (
          <div
            key={item.label}
            onMouseEnter={() => setHoveredItem(item.label)}
          >
            <NavItem {...item} />
          </div>
        ))}
      </nav>

      <div className="min-h-0 flex-1" />

      <nav aria-label="Support navigation" className="flex flex-col gap-[8px]">
        {support.map(item => <NavItem key={item.label} {...item} />)}
      </nav>

      <div className="flex shrink-0 flex-col gap-[18px] rounded-[12px] border border-[#30343b] bg-[#14171c] p-[12px]">
        <a
          href="/customer/settings"
          onClick={e => go(e, "/customer/settings")}
          className="flex flex-col items-start gap-[9px]"
        >
          {/* RW_CUSTOMER_ACCOUNT_LABEL_V1 */}
          <span className="flex w-full items-center justify-between text-[12px] font-normal text-[#b4b8c0] transition-colors hover:text-[#f5f5f5]">
            <span>{customerSettings.label}</span>
            <span aria-hidden="true">›</span>
          </span>
          <span className="h-px w-full bg-[#30343b]" />
          <span className="flex items-center gap-[10px]">
          <div className="flex size-[36px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#526780] bg-[#252a31] text-[11px] font-semibold text-[#c5cad2]">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="size-full object-cover" />
            ) : (profileName ? profileName.trim().split(" ").filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase() : "?")}
          </div>
          <div className="flex min-w-0 flex-col gap-[4px]">
            <span className="text-[12px] font-semibold text-[#f5f5f5]">
              {profileName || "Account"}
            </span>
            <span className="text-[10px] text-[#8c929c]">
              Personal account
            </span>
          </div>
                  </span>
        </a>

        <button
          type="button"
          onClick={() => { void logout(); }}
          className="flex w-full items-center justify-between text-[12px] text-[#b4b8c0] hover:text-[#f5f5f5]"
        >
          <span>Log out</span>
          <img alt="" src={`${assets}/edbc5.svg`} className="size-[16px]" />
        </button>
      </div>
    </aside>
  );
}



const socGroups = [{ heading: "SOC OPERATIONS", entries: securityNavigation }];

// RW_SOC_ARROW_NAV_V2
// Up/Down immediately activate the previous/next SOC tab.
// Uses existing sidebar click handlers to preserve navigation behavior.
if (typeof window !== "undefined") {
  const globalWindow = window as Window & {
    __rwSocArrowHandler?: (event: KeyboardEvent) => void;
  };

  if (globalWindow.__rwSocArrowHandler) {
    window.removeEventListener(
      "keydown",
      globalWindow.__rwSocArrowHandler
    );
  }

  const handler = (event: KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target as HTMLElement | null;

    if (
      target?.closest(
        'input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"]'
      )
    ) return;

    const sidebar = document.querySelector(".rw-soc-shared-sidebar");
    if (!sidebar) return;

    const entries = Array.from(
      sidebar.querySelectorAll<HTMLElement>(".rw-soc-nav-entry")
    ).filter((entry) => entry.getClientRects().length > 0);

    if (!entries.length) return;

    const focused = document.activeElement as HTMLElement | null;

    let current = entries.findIndex(
      (entry) => entry === focused || entry.contains(focused)
    );

    if (current < 0) {
      current = entries.findIndex(
        (entry) =>
          entry.classList.contains("rw-soc-nav-active") ||
          entry.classList.contains("rw-soc-nav-highlight")
      );
    }

    if (current < 0) current = 0;

    const next = event.key === "ArrowDown"
      ? Math.min(current + 1, entries.length - 1)
      : Math.max(current - 1, 0);

    if (next === current) return;

    event.preventDefault();

    const entry = entries[next];

    entry.scrollIntoView({
      behavior: "auto",
      block: "nearest",
    });

    const clickable = entry.matches("a, button, [role='button']")
      ? entry
      : entry.querySelector<HTMLElement>("a, button, [role='button']");

    (clickable ?? entry).click();
  };

  globalWindow.__rwSocArrowHandler = handler;
  window.addEventListener("keydown", handler);
}

function triggerSocAction(label: string) {
  if (label !== "Alerts" && label !== "Logs") return;

  if (window.location.pathname !== "/security") {
    sessionStorage.setItem("rw-soc-pending-action", label);
    goToSocDashboard(true);
    return;
  }

  sessionStorage.removeItem("rw-soc-pending-action");

  window.dispatchEvent(
    new Event(
      label === "Alerts"
        ? "rw-open-security-alerts"
        : "rw-open-security-logs"
    )
  );
}

function goToSocDashboard(preservePendingAction = false) {
  if (!preservePendingAction) {
    sessionStorage.removeItem("rw-soc-pending-action");
  }

  if (window.location.pathname === "/security") {
    if (!preservePendingAction) {
      window.dispatchEvent(new Event("rw-close-security-panels"));
    }
    return;
  }

  window.history.pushState({}, "", "/security");
  window.dispatchEvent(new PopStateEvent("popstate"));
}


function SocSidebar() {
  const { profileName, profilePhoto, initials } = useAccountProfile();
  const [activePanel, setActivePanel] = useState<string | null>(null);

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ panel: string | null }>).detail;
      setActivePanel(detail?.panel ?? null);
    };

    const handleRouteChange = () => {
      if (window.location.pathname !== "/security") {
        setActivePanel(null);
      }
    };

    window.addEventListener("rw-soc-active-panel", update);
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("rw-soc-active-panel", update);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  const path = window.location.pathname;

  const current = activePanel && path === "/security"
    ? activePanel
    : path === "/security/sessions"
      ? "Active Sessions"
    : path === "/security/network"
      ? "Network"
      : path === "/security/access"
        ? "Access"
      : (path === "/security/incidents" || path.startsWith("/security/incidents/"))
    ? "Incidents"
    : path === "/security"
      ? "SOC Dashboard"
      : path === "/admin/settings"
        ? "Admin Settings"
        : "";

  const nav = socGroups.flatMap(group => group.entries);
  const highlighted = current;
  const selectedIndex = nav.findIndex(item => item.label === highlighted);

  return (
    <aside
      data-name="Unified SOC Sidebar"
      className="rw-unified-sidebar rw-soc-shared-sidebar flex w-[208px] min-w-[208px] max-w-[208px] shrink-0 flex-col border-r border-[#30343b] bg-[#0b0d11] px-[16px] pb-[24px] pt-[26px]"
    >
      <button
        type="button"
        className="rw-brand-refresh relative h-[64px] w-[176px] shrink-0 cursor-pointer overflow-hidden"
        aria-label="Refresh Russell Wealth"
        onClick={() => window.location.reload()}
      >
        <img
          alt="Russell Wealth"
          src={`${assets}/c8aca.png`}
          className="pointer-events-none absolute left-[-20.2px] top-[-17.3px] h-[86.7px] w-[216.4px] max-w-none object-cover"
        />
      </button>

      <nav
        className="rw-soc-scroll-nav"
        aria-label="SOC navigation"
        
      >
        {socGroups.map((group, groupIndex) => (
          <section key={group.heading} className="rw-soc-nav-section">
            <p className="rw-soc-nav-heading">{group.heading}</p>

            {group.entries.map(entry => {
              const active = entry.label === current;
              const classes =
                "rw-soc-nav-entry " +
                (active ? "rw-soc-nav-active " : "") +
                (highlighted === entry.label
                  ? "rw-soc-nav-highlight " : "");

              const contents = (
                <>
                  {entry.icon === "cloud" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-[18px] shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                    </svg>
                  ) : (
                    <img
                      alt=""
                      src={`${assets}/${entry.icon}`}
                      className="size-[18px] shrink-0"
                    />
                  )}
                  <span className="min-w-0 text-[12px] leading-[1.3]">
                    {entry.label}
                  </span>
                </>
              );

              return (
                <div
                  key={entry.label}
                  
                >
                  {entry.href && !entry.action ? (
                    <a
                      href={entry.href}
                      className={classes}
                      aria-current={active ? "page" : undefined}
                      onClick={e => go(e, entry.href!)}
                    >
                      {contents}
                    </a>
                  ) : entry.action ? (
                    <button
                      type="button"
                      className={classes}
                      onClick={() => {
                        triggerSocAction(entry.action!);
                      }}
                    >
                      {contents}
                    </button>
                  ) : (
                    <span
                      className={classes}
                      title="Page not implemented yet"
                      aria-disabled="true"
                    >
                      {contents}
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </nav>

      
      <div className="rw-soc-sidebar-footer">
        {/* RW_ACCOUNT_SETTINGS_LABEL_V1 */}
        <a
          href="/admin/settings"
          onClick={e => go(e, "/admin/settings")}
          className="mb-2 flex w-full items-center justify-between rounded-lg border border-[#344454] bg-[#1B2530] px-3 py-2.5 text-[12px] font-semibold text-[#DCE7F2] transition-colors hover:border-[#559CFA] hover:bg-[#25364A]"
        >
          <span>{adminSettings.label}</span>
          <span aria-hidden="true" className="text-[#8FA9C4]">›</span>
        </a>


        <div className="flex shrink-0 flex-col gap-[18px] rounded-[12px] border border-[#30343b] bg-[#14171c] p-[12px]">
          <a
            href="/admin/settings"
            onClick={e => go(e, "/admin/settings")}
            className="flex items-center gap-[10px]"
          >
            <div className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#252a31] text-[11px] font-semibold text-[#c5cad2]">
              {profilePhoto ? <img src={profilePhoto} alt={profileName || 'Profile'} className="size-full rounded-full object-cover" /> : initials}
            </div>
            <div className="flex min-w-0 flex-col gap-[4px]">
              <span className="text-[12px] font-semibold text-[#f5f5f5]">
                {profileName || 'Administrator'}
              </span>
              <span className="text-[10px] text-[#8c929c]">
                SOC Administrator
              </span>
            </div>
          </a>

          <button
            type="button"
            onClick={() => { void logout(); }}
            className="flex w-full items-center justify-between text-[12px] text-[#b4b8c0] hover:text-[#f5f5f5]"
          >
            <span>Log out</span>
            <img
              alt=""
              src={`${assets}/edbc5.svg`}
              className="size-[16px]"
            />
          </button>
        </div>
      </div>
    </aside>
  );
}

export { SocSidebar };
