import { useEffect, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";

type NavItem = {
  label: string;
  href: string;
  action?: "Alerts" | "Logs";
};

const customerItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Trade", href: "/markets" },
  { label: "Watchlist", href: "/dashboard#watchlist" },
  { label: "Transactions", href: "/transactions" },
  { label: "Add Funds", href: "/deposit" },
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

const wrapperStyle: CSSProperties = {
  position: "fixed",
  top: "max(14px, env(safe-area-inset-top))",
  right: 16,
  zIndex: 9999,
};

const buttonStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 10,
  border: "1px solid #30343b",
  background: "#14171c",
  color: "#f5f5f5",
  fontSize: 23,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

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

  const items: NavItem[] = security ? securityItems : customerItems;

  return (
    <div className="rw-unified-mobile-nav" style={wrapperStyle}>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            background: "transparent",
            border: 0,
            zIndex: 0,
          }}
        />
      )}

      <button
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        style={{ ...buttonStyle, position: "relative", zIndex: 2 }}
      >
        {open ? "×" : "☰"}
      </button>

      {open && (
        <nav
          aria-label={security ? "SOC navigation" : "Customer navigation"}
          style={{
            position: "absolute",
            zIndex: 2,
            top: 55,
            right: 0,
            width: 255,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "75dvh",
            overflowY: "auto",
            padding: 10,
            border: "1px solid #303b49",
            borderRadius: 14,
            background: "#10151d",
            boxShadow: "0 18px 45px rgba(0,0,0,.6)",
          }}
        >
          <p style={{
            color: "#8795a6",
            fontSize: 10,
            letterSpacing: "0.16em",
            fontWeight: 600,
            padding: "10px 12px",
          }}>
            RUSSELL WEALTH
          </p>

          {items.map(item => {
            const selected = item.href === "/dashboard"
              ? current.split("#")[0] === "/dashboard"
              : current.split("#")[0] === item.href;

            const funding = item.label === "Add Funds";

            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                onClick={event => {
                  if (item.action) {
                    event.preventDefault();

                    if (window.location.pathname !== "/security") {
                      sessionStorage.setItem(
                        "rw-soc-pending-action",
                        item.action
                      );
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
                    return;
                  }

                  navigate(event, item.href);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 48,
                  padding: "12px 13px",
                  marginBottom: 3,
                  borderRadius: 9,
                  textDecoration: "none",
                  color: selected || funding ? "#ffffff" : "#b4c0ce",
                  background: selected
                    ? "#243345"
                    : funding ? "#172b28" : "transparent",
                  border: selected
                    ? "1px solid #344b63"
                    : "1px solid transparent",
                  fontSize: 13,
                  fontWeight: selected || funding ? 600 : 500,
                }}
              >
                {item.label}
                {selected && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#e5edf6",
                  }} />
                )}
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
