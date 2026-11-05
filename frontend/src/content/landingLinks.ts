// Russell Wealth — shared landing navigation

export const landingLinks = {
  home: "/",
  about: "/about",
  platform: "/#rw-platform",
  security: "/#rw-security",

  github: "https://github.com/edoneyrussell",

  linkedin:
    "https://www.linkedin.com/in/edoney-russell-ba5287247/",
} as const;

export const landingSections = {
  home: '[data-name="Landing hero"]',
  platform: '[data-rw-anchor="rw-platform"]',
  security: '[data-rw-anchor="rw-security"]',
} as const;
