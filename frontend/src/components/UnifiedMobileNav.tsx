import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

type NavItem = {
  label: string;
  href: string;
  action?: "Alerts" | "Logs";
};

const customerItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Trade & Explore", href: "/markets" },
  { label: "Watchlist", href: "/dashboard#watchlist" },
  { label: "Transactions", href: "/transactions" },
  { label: "Add Funds", href: "/deposit" },
  { label: "Settings", href: "/customer/settings" },
];

const securityItems: NavItem[] = [
  { label: "SOC Dashboard", href: "/security" },
  { label: "Alerts", href: "/security", action: "Alerts" },
  { label: "Incidents", href: "/security/incidents" },
  { label: "Investigations", href: "/security/investigations" },
  { label: "Logs", href: "/security", action: "Logs" },
  { label: "Network", href: "/security/network" },
  { label: "Cloud Security", href: "/security/cloud" },
  { label: "Admin Settings", href: "/admin/settings" },
];

function NavIcon({ label }: { label: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg width="23" height="23" viewBox="0 0 24 24" {...common}>
      {label === "Dashboard" || label === "SOC Dashboard" ? (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </>
      ) : label === "Portfolio" ? (
        <>
          <path d="M12 3a9 9 0 1 0 9 9h-9z" />
          <path d="M15 3.5a9 9 0 0 1 5.5 5.5H15z" />
        </>
      ) : label === "Trade & Explore" ? (
        <>
          <path d="M4 20V5M4 20h17" />
          <path d="M8 15v-4M12 15V7M16 15V4M20 15v-7" />
        </>
      ) : label === "Watchlist" ? (
        <>
          <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : label === "Transactions" || label === "Logs" ? (
        <>
          <path d="M4 7h15l-4-4" />
          <path d="M20 17H5l4 4" />
          <path d="M19 7l-4 4M5 17l4-4" />
        </>
      ) : label === "Add Funds" ? (
        <>
          <rect x="3" y="5" width="18" height="15" rx="2" />
          <path d="M3 9h18M16 14h2" />
        </>
      ) : label === "Settings" || label === "Admin Settings" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.9.2l-.1.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.9-.3l-.2.1-2.9-1.7.1-.2a1.7 1.7 0 0 0-.2-1.9l-.1-.1v-3.4l.2-.1a1.7 1.7 0 0 0 .3-1.9l-.1-.2 1.7-2.9.2.1a1.7 1.7 0 0 0 1.9-.2l.1-.1h3.4l.1.2a1.7 1.7 0 0 0 1.9.3l.2-.1 2.9 1.7-.1.2a1.7 1.7 0 0 0 .2 1.9l.1.1z" />
        </>
      ) : label === "Alerts" || label === "Incidents" ? (
        <>
          <path d="M12 3 22 20H2z" />
          <path d="M12 9v5M12 17h.01" />
        </>
      ) : label === "Investigations" ? (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </>
      ) : label === "Network" ? (
        <>
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="5" cy="18" r="2.5" />
          <circle cx="19" cy="18" r="2.5" />
          <path d="m11 7-5 9M13 7l5 9M7.5 18h9" />
        </>
      ) : (
        <>
          <path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
          <path d="m9 12 2 2 4-4" />
        </>
      )}
    </svg>
  );
}

export default function UnifiedMobileNav({
  security = false,
}: {
  security?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(
    window.location.pathname + window.location.hash
  );

  useEffect(() => {
    const update = () => {
      setCurrent(window.location.pathname + window.location.hash);
      setOpen(false);
    };

    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);

    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navigate = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    event.preventDefault();

    if (window.location.pathname + window.location.hash !== href) {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    setCurrent(href);
    setOpen(false);

    if (!href.includes("#")) {
      window.scrollTo({ top: 0, behavior: "auto" });
    } else {
      const id = href.split("#")[1];
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: "smooth",
        });
      });
    }
  };

  const handleAction = (item: NavItem) => {
    if (!item.action) return;

    if (window.location.pathname !== "/security") {
      sessionStorage.setItem("rw-soc-pending-action", item.action);
      window.history.pushState({}, "", "/security");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else {
      sessionStorage.removeItem("rw-soc-pending-action");
      window.dispatchEvent(
        new Event(
          item.action === "Alerts"
            ? "rw-open-security-alerts"
            : "rw-open-security-logs"
        )
      );
    }

    setOpen(false);
  };

  const items = security ? securityItems : customerItems;
  const activePath = current.split("#")[0];

  return (
    <div className="rw-unified-mobile-nav">
      <button
        type="button"
        className="rw-mobile-menu-trigger"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="25" height="25" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="rw-mobile-nav-backdrop"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />

          <nav
            className="rw-mobile-nav-drawer"
            aria-label={security ? "SOC navigation" : "Customer navigation"}
            aria-modal="true"
            role="dialog"
          >
            <header className="rw-mobile-nav-header">
              <div>
                <div className="rw-mobile-nav-brand">RUSSELL WEALTH</div>
                <div className="rw-mobile-nav-subtitle">
                  {security ? "SECURITY OPERATIONS" : "PRIVATE CLIENT"}
                </div>
              </div>

              <button
                type="button"
                className="rw-mobile-nav-close"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="rw-mobile-nav-divider" />

            <div className="rw-mobile-nav-section">
              {security ? "SOC OPERATIONS" : "YOUR ACCOUNT"}
            </div>

            <div className="rw-mobile-nav-items">
              {items.map(item => {
                const selected = item.href.includes("#")
                  ? current === item.href
                  : activePath === item.href;

                const funding = item.label === "Add Funds";

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    onClick={event => {
                      if (item.action) {
                        event.preventDefault();
                        handleAction(item);
                        return;
                      }

                      navigate(event, item.href);
                    }}
                    className={[
                      "rw-mobile-nav-item",
                      selected ? "is-active" : "",
                      funding ? "is-funding" : "",
                    ].join(" ")}
                  >
                    <span className="rw-mobile-nav-item-icon">
                      <NavIcon label={item.label} />
                    </span>

                    <span>{item.label}</span>

                    {selected && (
                      <span className="rw-mobile-nav-active-indicator" />
                    )}
                  </a>
                );
              })}
            </div>

            {!security && (
              <>
                <div className="rw-mobile-nav-divider rw-mobile-nav-lower-divider" />
                <a
                  href="/help"
                  className="rw-mobile-nav-item rw-mobile-nav-help"
                  onClick={event => navigate(event, "/help")}
                >
                  <span className="rw-mobile-nav-item-icon">
                    <NavIcon label="Cloud Security" />
                  </span>
                  Help & Support
                </a>
              </>
            )}

            <footer className="rw-mobile-nav-footer">
              <span>Russell Wealth</span>
              <span className="rw-mobile-nav-version">V1.0</span>
            </footer>
          </nav>
        </>
      )}
    </div>
  );
}
