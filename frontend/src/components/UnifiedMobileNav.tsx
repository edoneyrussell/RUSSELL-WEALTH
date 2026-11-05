import { useEffect, useState } from "react";

const customerItems = [
  { label: "Dashboard", href: "/dashboard", icon: "50fa9.svg" },
  { label: "Portfolio", href: "/portfolio", icon: "70fb9.svg" },
  { label: "Trade", href: "/markets", icon: "74de4.svg" },
  { label: "Transactions", href: "/transactions", icon: "ca3db.svg" },
];

const securityLinks = [
  { label: "SOC Dashboard", href: "/security" },
  { label: "Incidents", href: "/security/incidents/INC-2026-0142" },
  { label: "Admin Settings", href: "/admin/settings" },
];

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
    };

    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  const navigate = (href: string) => {
    if (
      window.location.pathname + window.location.hash !== href
    ) {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    setCurrent(href);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return current === "/dashboard" ||
        current.startsWith("/dashboard#");
    }
    return current.split("#")[0] === href;
  };

  if (security) {
    return (
      <div
        className="rw-unified-mobile-nav"
        style={{
          position: "fixed",
          right: 16,
          top: 64,
          zIndex: 9999,
          fontFamily: "Inter, sans-serif",
        }}
      >
        <button
          type="button"
          aria-label="Open security navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          style={{
            background: "#14171c",
            color: "#f5f5f5",
            border: "1px solid #30343b",
            borderRadius: 10,
            padding: "11px 15px",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          {open ? "✕" : "☰"}
        </button>

        {open && (
          <nav
            aria-label="Security mobile navigation"
            style={{
              position: "absolute",
              right: 0,
              top: 52,
              width: 230,
              background: "#14171c",
              border: "1px solid #30343b",
              borderRadius: 12,
              padding: 8,
              boxShadow: "0 16px 40px rgba(0,0,0,.55)",
            }}
          >
            {securityLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={e => {
                  e.preventDefault();
                  navigate(link.href);
                }}
                style={{
                  display: "block",
                  padding: "13px 14px",
                  borderRadius: 8,
                  color: isActive(link.href) ? "#fff" : "#b4b8c0",
                  background: isActive(link.href)
                    ? "#252a31"
                    : "transparent",
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    );
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open mobile navigation"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className="rw-mobile-menu-trigger"
        >
          ☰
        </button>
      )}

      {open && (
        <div className="rw-mobile-bottom-navigation">
          <nav
            aria-label="Customer mobile navigation"
            className="rw-mobile-bottom-pill"
          >
            {customerItems.map(item => {
              const active = isActive(item.href);

              return (
                <button
                  key={item.label}
                  type="button"
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigate(item.href)}
                  className={
                    "rw-mobile-bottom-item" +
                    (active ? " is-active" : "")
                  }
                >
                  <span className="rw-mobile-bottom-active">
                    <img
                      src={`/assets/${item.icon}`}
                      alt=""
                      className="rw-mobile-bottom-icon"
                    />
                  </span>
                  <span className="rw-mobile-bottom-label">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            aria-label="Add funds"
            onClick={() => navigate("/deposit")}
            className="rw-mobile-bottom-add"
          >
            <img src="/assets/add-funds-money.svg" alt="" />
          </button>
        </div>
      )}
    </>
  );
}
