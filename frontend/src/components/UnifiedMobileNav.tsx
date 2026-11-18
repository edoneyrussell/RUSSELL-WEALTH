import { useAccountProfile } from "../hooks/useAccountProfile";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { customerNavigation, securityNavigation, customerSettings, adminSettings, supportNavigation, type NavigationItem } from "../content/navigationContent";
import { logout } from "../auth";

const customerItems = [...customerNavigation, customerSettings];
const securityItems = [...securityNavigation, adminSettings];

export default function UnifiedMobileNav({
  security = false,
  settingsPlacement = false,
}: {
  security?: boolean;
  settingsPlacement?: boolean;
}) {
  const { profileName, profilePhoto, initials } = useAccountProfile();
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [current, setCurrent] = useState(
    window.location.pathname + window.location.hash
  );

  useEffect(() => {
    const update = () => {
      setCurrent(window.location.pathname + window.location.hash);
      if (window.location.pathname !== "/security") setActivePanel(null);
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
    const updatePanel = (event: Event) => {
      setActivePanel((event as CustomEvent<{ panel: string | null }>).detail?.panel ?? null);
    };
    window.addEventListener("rw-soc-active-panel", updatePanel);
    return () => window.removeEventListener("rw-soc-active-panel", updatePanel);
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", close);
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      window.removeEventListener("keydown", close);
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

    if (href === '/security') {
      sessionStorage.removeItem('rw-soc-pending-action');
      window.dispatchEvent(new Event('rw-close-security-panels'));
    }

    if (window.location.pathname + window.location.hash !== href) {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    setCurrent(href);
    setOpen(false);

    if (!href.includes("#")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const id = href.split("#")[1];
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: "smooth",
        });
      });
    }
  };

  const handleAction = (item: NavigationItem) => {
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

  return (
    <div className={
      "rw-unified-mobile-nav" +
      (settingsPlacement ? " is-settings-placement" : "")
    }>
      <button
        type="button"
        className="rw-mobile-fullnav-trigger"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {open ? (
          <span className="rw-mobile-trigger-close">×</span>
        ) : (
          <span className="rw-mobile-trigger-lines">
            <span />
            <span />
            <span />
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="rw-mobile-fullnav-backdrop"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />

          <section
            className="rw-mobile-fullnav-panel"
            role="dialog"
            aria-modal="true"
            aria-label={security ? "SOC navigation" : "Customer navigation"}
          >
            <header className="rw-mobile-fullnav-header">
              <div>
                <button type="button" className="rw-mobile-fullnav-brand" aria-label="Refresh Russell Wealth" onClick={() => window.location.reload()}>
                  RUSSELL WEALTH
                </button>
                <div className="rw-mobile-fullnav-subtitle">
                  {security ? "SECURITY OPERATIONS" : "PRIVATE CLIENT"}
                </div>
              </div>

              <button
                type="button"
                className="rw-mobile-fullnav-close"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="flex items-center gap-3 px-5 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#252a31] text-sm">
                {profilePhoto ? <img src={profilePhoto} alt={profileName || 'Profile'} className="size-full object-cover" /> : initials}
              </div>
              <span className="text-sm text-[#e7edf4]">{profileName || 'Account'}</span>
            </div>
            <div className="rw-mobile-fullnav-divider" />

            <p className="rw-mobile-fullnav-section">
              {security ? "SOC OPERATIONS" : "YOUR ACCOUNT"}
            </p>

            <nav className="rw-mobile-fullnav-items">
              {items.map(item => {
                const selected = item.action
                  ? current === "/security" && activePanel === item.action
                  : current === item.href && (item.href !== "/security" || !activePanel);

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    className={
                      "rw-mobile-fullnav-item" +
                      (selected ? " is-active" : "") +
                      (item.label === "Add Funds" ? " is-funding" : "")
                    }
                    onClick={event => {
                      if (item.action) {
                        event.preventDefault();
                        handleAction(item);
                      } else {
                        navigate(event, item.href);
                      }
                    }}
                  >
                    <span className="rw-mobile-fullnav-icon">
                      {item.icon.endsWith(".svg") ? <img src={`/assets/${item.icon}`} alt="" className="size-[20px]" /> : item.icon}
                    </span>
                    <span>{item.label}</span>
                    <span className="rw-mobile-fullnav-arrow">›</span>
                  </a>
                );
              })}
            </nav>

            {!security && (
              <a
                href={supportNavigation[0].href}
                className="rw-mobile-fullnav-help"
                onClick={event => navigate(event, supportNavigation[0].href)}
              >
                {supportNavigation[0].label} <span>›</span>
              </a>
            )}

            <footer className="rw-mobile-fullnav-footer">
              <span>Russell Wealth</span>
              <span>V1.0</span>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}
