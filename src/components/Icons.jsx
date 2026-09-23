/* Inline stroke icons — no icon dependency, so they inherit currentColor and
 * stay crisp at every density. */

function Svg({ children, size = 22, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconToday = (p) => (
  <Svg {...p}>
    <path d="M3 12h4l2.5-6 4 13L16 12h5" />
  </Svg>
);

export const IconActivity = (p) => (
  <Svg {...p}>
    <path d="M6 20V10M12 20V4M18 20v-7" />
  </Svg>
);

export const IconNutrition = (p) => (
  <Svg {...p}>
    <path d="M12 8c1.5-3.5 5-4.5 7-3 1.6 4.4-.6 11-4.2 13.4a4 4 0 0 1-5.6 0C5.6 16 3.4 9.4 5 5c1.6-1.2 4-.8 5.4.8" />
    <path d="M12 21V9" />
  </Svg>
);

export const IconSleep = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5Z" />
  </Svg>
);

export const IconProfile = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5Z" />
  </Svg>
);

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconChevron = (p) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const IconHeart = (p) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z" />
  </Svg>
);
