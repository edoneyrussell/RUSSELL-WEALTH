
import { useEffect, useState } from "react";
import "../landing-spotlight-headline.css";

type Props = {
  rootClass: string;
};

export default function RWLandingEffects({ rootClass }: Props) {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      "." + rootClass
    );
    if (!root) return;

    const hero = root.querySelector<HTMLElement>(
      '[data-name="Landing hero"]'
    );
    if (!hero) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const mobile = rootClass === "rw-mobile-landing";

    // Target the actual Figma headline paragraphs.
    const headline = mobile
      ? root.querySelector<HTMLElement>(
          '[data-node-id="68:1005"]'
        )
      : root.querySelector<HTMLElement>(
          '[data-name="Hero headline"]'
        );

    const lines = headline
      ? Array.from(headline.querySelectorAll<HTMLElement>("p"))
      : [];

    if (!reduced) {
      lines.forEach((line, index) => {
        line.classList.add("rw-hero-line");
        line.style.setProperty(
          "--rw-line-delay",
          `${250 + index * 350}ms`
        );
      });

      requestAnimationFrame(() => {
        lines.forEach((line) =>
          line.classList.add("rw-hero-line-visible")
        );
      });
    }

    // Spotlight uses the hero itself as its positioning reference.
    const spotlight = document.createElement("div");
    spotlight.className = "rw-spotlight-fixed";
    spotlight.setAttribute("aria-hidden", "true");
    hero.appendChild(spotlight);

    const move = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      spotlight.style.setProperty(
        "--rw-x",
        `${event.clientX - rect.left}px`
      );
      spotlight.style.setProperty(
        "--rw-y",
        `${event.clientY - rect.top}px`
      );
      spotlight.classList.add("rw-spotlight-on");
    };

    const leave = () => {
      spotlight.classList.remove("rw-spotlight-on");
    };

    if (!reduced) {
      hero.addEventListener("pointermove", move);
      hero.addEventListener("pointerdown", move);
      hero.addEventListener("pointerleave", leave);
    }

    const updateScroll = () => {
      const max =
        document.documentElement.scrollHeight -
        window.innerHeight;

      setProgress(
        max > 0 ? Math.min(100, window.scrollY / max * 100) : 0
      );
      setShowTop(window.scrollY > 450);
    };

    if (mobile) {
      window.addEventListener("scroll", updateScroll, {
        passive: true
      });
      window.addEventListener("resize", updateScroll);
      updateScroll();
    }

    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerdown", move);
      hero.removeEventListener("pointerleave", leave);

      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);

      spotlight.remove();

      lines.forEach((line) => {
        line.classList.remove(
          "rw-hero-line",
          "rw-hero-line-visible"
        );
        line.style.removeProperty("--rw-line-delay");
      });
    };
  }, [rootClass]);

  const mobile = rootClass === "rw-mobile-landing";

  return mobile ? (
    <>
      <div className="rw-landing-progress" aria-hidden="true">
        <div style={{ width: `${progress}%` }} />
      </div>

      {showTop && (
        <button
          type="button"
          className="rw-landing-top"
          aria-label="Back to top"
          onClick={() =>
            document.querySelector(
              '.rw-mobile-landing [data-name="Landing hero"]'
            )?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            })
          }
        >
          ↑
        </button>
      )}
    </>
  ) : null;
}
