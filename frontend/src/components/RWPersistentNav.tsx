
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
  const root = document.querySelector(
    ".rw-mobile-landing, .rw-desktop-landing"
  );

  if (!root) return null;

  if (key === "home") {
    return root.querySelector('[data-name="Landing hero"]');
  }

  const id = root.querySelector<HTMLElement>(
    `#rw-${key}, #${key}`
  );

  if (id) return id;

  const names =
    key === "platform"
      ? ["Platform", "Platform headline"]
      : ["Security", "Security headline"];

  for (const name of names) {
    const element = root.querySelector<HTMLElement>(
      `[data-name="${name}"]`
    );

    if (element) return element;
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

      const threshold = 160;
      let current: Tab = "home";

      if (
        platform &&
        platform.getBoundingClientRect().top <= threshold
      ) {
        current = "platform";
      }

      if (
        security &&
        security.getBoundingClientRect().top <= threshold
      ) {
        current = "security";
      }

      setActive(current);
    };

    const restoreHash = () => {
      if (window.location.pathname !== "/") return;

      const key = window.location.hash.replace("#rw-", "") as Tab;

      if (key !== "platform" && key !== "security") return;

      let attempts = 0;

      const scroll = () => {
        const target = findSection(key);

        if (target) {
          target.scrollIntoView({
            behavior: "instant",
            block: "start",
          });
          setActive(key);
        } else if (++attempts < 20) {
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

    const target = findSection(key);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setActive(key);
    }
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
