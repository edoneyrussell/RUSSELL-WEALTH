import { useEffect, useState } from "react";
import "../persistent-nav.css";

type Tab = "home" | "about" | "platform" | "security";

const tabs: { label: string; key: Tab }[] = [
  { label: "Home", key: "home" },
  { label: "About", key: "about" },
  { label: "Platform", key: "platform" },
  { label: "Security", key: "security" },
];

function findSection(key: Tab): HTMLElement | null {
  if (key === "home") {
    return document.querySelector<HTMLElement>(
      '[data-name="Landing hero"]'
    );
  }

  if (key === "platform") {
    return document.getElementById("rw-platform") ||
      document.querySelector<HTMLElement>(
        '[data-name="Customer platform"], [data-name="Platform section"]'
      );
  }

  if (key === "security") {
    return document.getElementById("rw-security") ||
      document.querySelector<HTMLElement>(
        '[data-name="Security showcase"], [data-name="Security section"]'
      );
  }

  return null;
}

export default function RWPersistentNav() {
  const [active, setActive] = useState<Tab>(
    window.location.pathname === "/about" ? "about" : "home"
  );

  useEffect(() => {
    const update = () => {
      if (window.location.pathname === "/about") {
        setActive("about");
        return;
      }

      const platform = findSection("platform");
      const security = findSection("security");

      let current: Tab = "home";

      if (platform && platform.getBoundingClientRect().top <= 160) {
        current = "platform";
      }

      if (security && security.getBoundingClientRect().top <= 160) {
        current = "security";
      }

      setActive(current);
    };

    const restoreHash = () => {
      if (window.location.pathname !== "/") return;

      const hash = window.location.hash;
      const key =
        hash === "#rw-platform" || hash === "#platform"
          ? "platform"
          : hash === "#rw-security" || hash === "#security"
            ? "security"
            : null;

      if (!key) return;

      let attempts = 0;

      const scroll = () => {
        const target = findSection(key);

        if (target) {
          target.scrollIntoView({
            behavior: "instant",
            block: "start",
          });
          setActive(key);
        } else if (++attempts < 60) {
          requestAnimationFrame(scroll);
        }
      };

      requestAnimationFrame(scroll);
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("hashchange", restoreHash);

    restoreHash();
    update();

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("hashchange", restoreHash);
    };
  }, []);

  const navigate = (key: Tab) => {
    if (key === "about") {
      window.location.href = "/about";
      return;
    }

    if (window.location.pathname !== "/") {
      window.location.href =
        key === "home" ? "/" : `/#rw-${key}`;
      return;
    }

    if (key === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActive("home");
      return;
    }

    const target = findSection(key);

    if (!target) {
      console.error(
        `Russell Wealth: ${key} section not found`
      );
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setActive(key);
  };

  return (
    <nav className="rw-persistent-nav" aria-label="Main navigation">
      {tabs.map(({ label, key }) => (
        <button
          key={key}
          type="button"
          onClick={() => navigate(key)}
          className={active === key ? "rw-tab-active" : ""}
          aria-current={active === key ? "location" : undefined}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
