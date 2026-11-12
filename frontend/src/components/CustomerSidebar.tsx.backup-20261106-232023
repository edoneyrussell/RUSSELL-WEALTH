import { logout } from "../auth";
import { useEffect, useState } from "react";

const assets = "/assets";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: "50fa9.svg" },
  { label: "Portfolio", href: "/portfolio", icon: "70fb9.svg" },
  { label: "Trade", href: "/markets", icon: "74de4.svg" },
  { label: "Watchlist", href: "/dashboard#watchlist", icon: "18ed1.svg" },
  { label: "Transactions", href: "/transactions", icon: "ca3db.svg" },
  { label: "Add Funds", href: "/deposit", icon: "add-funds-money.svg" },
];

const support = [
  { label: "Help & Support", href: "/help", icon: "2bd20.svg" },
];

function go(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) return;

  event.preventDefault();

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
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = () => {
      fetch("/api/me", { credentials: "same-origin" })
        .then(r => r.ok ? r.json() : null)
        .then(data => setProfilePhoto(data?.profile_photo ?? null))
        .catch(() => {});
    };
    loadProfile();
    window.addEventListener("rw-profile-updated", loadProfile);
    return () => window.removeEventListener("rw-profile-updated", loadProfile);
  }, []);

  return (
    <aside
      data-name="Unified Customer Sidebar"
      className="rw-unified-sidebar flex w-[208px] shrink-0 flex-col gap-[30px] border-r border-[#30343b] bg-[#0b0d11] px-[16px] pb-[24px] pt-[26px]"
    >
      <div
        className="relative h-[64px] w-[176px] shrink-0 cursor-pointer overflow-hidden"
        onClick={() => window.location.reload()}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.location.reload();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Refresh Russell Wealth"
      >
        <img
          alt="Russell Wealth"
          src={`${assets}/c8aca.png`}
          className="pointer-events-none absolute left-[-20.2px] top-[-17.3px] h-[86.7px] w-[216.4px] max-w-none object-cover"
        />
      </div>

      <nav
        aria-label="Customer navigation"
        className="rw-motion-nav relative flex flex-col gap-[10px]"
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
          className="flex items-center gap-[10px]"
        >
          <div className="flex size-[36px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#526780] bg-[#252a31] text-[11px] font-semibold text-[#c5cad2]">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="size-full object-cover" />
            ) : "ER"}
          </div>
          <div className="flex min-w-0 flex-col gap-[4px]">
            <span className="text-[12px] font-semibold text-[#f5f5f5]">
              Edoney Russell
            </span>
            <span className="text-[10px] text-[#8c929c]">
              Personal account
            </span>
          </div>
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



type SocEntry = {
  label: string;
  icon: string;
  href?: string;
  action?: "Alerts" | "Logs & Telemetry";
};

const socGroups: { heading: string; entries: SocEntry[] }[] = [
  {
    heading: "SOC OPERATIONS",
    entries: [
      { label: "SOC Dashboard", href: "/security", icon: "651b9.svg" },
      { label: "Alerts", action: "Alerts", icon: "7412e.svg" },
      { label: "Incidents", href: "/security/incidents/INC-2026-0142", icon: "82d8b.svg" },
      { label: "Threat Hunting", icon: "82d8b.svg" },
      { label: "Investigations", icon: "82d8b.svg" },
      { label: "Logs & Telemetry", action: "Logs & Telemetry", icon: "0df54.svg" },
      { label: "Threat Intelligence", icon: "651b9.svg" },
    ],
  },
  {
    heading: "SECURITY OPERATIONS",
    entries: [
      { label: "Endpoints", icon: "651b9.svg" },
      { label: "Network", icon: "651b9.svg" },
      { label: "Cloud Security", icon: "651b9.svg" },
      { label: "Identity & Access", icon: "651b9.svg" },
      { label: "Vulnerability Mgmt", icon: "651b9.svg" },
      { label: "Compliance", icon: "651b9.svg" },
    ],
  },
];

function triggerSocAction(label: string) {
  const dashboard = document.querySelector(".soc-dashboard");

  if (!dashboard) {
    goToSocDashboard();
    return;
  }

  const candidates = Array.from(
    dashboard.querySelectorAll("button, [role='button']")
  );

  const match = candidates.find(
    element => element.textContent?.trim() === label
  );

  if (match instanceof HTMLElement) {
    match.click();
  }
}

function goToSocDashboard() {
  window.history.pushState({}, "", "/security");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function SocSidebar() {
  const [hovered, setHovered] = useState<string | null>(null);
  const path = window.location.pathname;

  const current = path.startsWith("/security/incidents/")
    ? "Incidents"
    : path === "/security"
      ? "SOC Dashboard"
      : path === "/admin/settings"
        ? "Admin Settings"
        : "";

  const nav = socGroups.flatMap(group => group.entries);
  const highlighted = hovered ?? current;
  const selectedIndex = nav.findIndex(item => item.label === highlighted);

  return (
    <aside
      data-name="Unified SOC Sidebar"
      className="rw-unified-sidebar rw-soc-shared-sidebar flex w-[208px] shrink-0 flex-col border-r border-[#30343b] bg-[#0b0d11] px-[16px] pb-[24px] pt-[26px]"
    >
      <div
        className="relative h-[64px] w-[176px] shrink-0 cursor-pointer overflow-hidden"
        role="button"
        tabIndex={0}
        aria-label="Russell Wealth SOC Dashboard"
        onClick={goToSocDashboard}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToSocDashboard();
          }
        }}
      >
        <img
          alt="Russell Wealth"
          src={`${assets}/c8aca.png`}
          className="pointer-events-none absolute left-[-20.2px] top-[-17.3px] h-[86.7px] w-[216.4px] max-w-none object-cover"
        />
      </div>

      <nav
        className="rw-soc-scroll-nav"
        aria-label="SOC navigation"
        onMouseLeave={() => setHovered(null)}
      >
        {socGroups.map((group, groupIndex) => (
          <section key={group.heading} className="rw-soc-nav-section">
            <p className="rw-soc-nav-heading">{group.heading}</p>

            {group.entries.map(entry => {
              const active = entry.label === current;
              const interactive = Boolean(entry.href || entry.action);
              const classes =
                "rw-soc-nav-entry " +
                (active ? "rw-soc-nav-active " : "") +
                (highlighted === entry.label
                  ? "rw-soc-nav-highlight " : "");

              const contents = (
                <>
                  <img
                    alt=""
                    src={`${assets}/${entry.icon}`}
                    className="size-[18px] shrink-0"
                  />
                  <span className="min-w-0 text-[12px] leading-[1.3]">
                    {entry.label}
                  </span>
                </>
              );

              return (
                <div
                  key={entry.label}
                  onMouseEnter={() =>
                    interactive && setHovered(entry.label)
                  }
                >
                  {entry.href ? (
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
                      onClick={() => triggerSocAction(entry.action!)}
                    >
                      {contents}
                    </button>
                  ) : (
                    <span
                      className={classes + " rw-soc-nav-unavailable"}
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

        <div className="flex shrink-0 flex-col gap-[18px] rounded-[12px] border border-[#30343b] bg-[#14171c] p-[12px]">
          <a
            href="/admin/settings"
            onClick={e => go(e, "/admin/settings")}
            className="flex items-center gap-[10px]"
          >
            <div className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#252a31] text-[11px] font-semibold text-[#c5cad2]">
              ER
            </div>
            <div className="flex min-w-0 flex-col gap-[4px]">
              <span className="text-[12px] font-semibold text-[#f5f5f5]">
                Edoney Russell
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
