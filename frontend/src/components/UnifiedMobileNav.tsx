import { useEffect, useState } from "react";

const customerItems = [
  { label: "Dashboard", href: "/dashboard", icon: "50fa9.svg" },
  { label: "Portfolio", href: "/portfolio", icon: "70fb9.svg" },
  { label: "Trade", href: "/markets", icon: "74de4.svg" },
  { label: "Watchlist", href: "/dashboard#watchlist", icon: "18ed1.svg" },
  { label: "Transactions", href: "/transactions", icon: "ca3db.svg" },
  { label: "Add Funds", href: "/deposit", icon: "add-funds-money.svg" },
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

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const updateScroll = () => {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const nav = document.querySelector(".rw-mobile-bottom-navigation");

        if (nav && Math.abs(currentY - lastY) > 3) {
          nav.classList.toggle("rw-nav-scrolling-down", currentY > lastY);
          nav.classList.toggle("rw-nav-scrolling-up", currentY < lastY);
        }

        lastY = currentY;
        frame = 0;
      });
    };

    window.addEventListener("scroll", updateScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
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

    if (
      window.location.pathname !== href.split("#")[0] ||
      window.location.pathname + window.location.hash !== href
    ) {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    setCurrent(href);

    if (href === "/deposit") {
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
                onClick={e => navigate(e, link.href)}
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
    <div className="rw-mobile-bottom-navigation">
      <nav
        aria-label="Customer mobile navigation"
        className="rw-mobile-bottom-pill"
      >
        {customerItems.map(item => {
          const active = isActive(item.href);

          return (
            <a
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={event => navigate(event, item.href)}
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
            </a>
          );
        })}
      </nav>
    </div>
  );
}
