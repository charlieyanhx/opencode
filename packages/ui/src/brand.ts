/**
 * Prefix for names a browser exposes in developer tools: storage keys, DOM ids, events and highlight names.
 * PP builds use their own so those tools show no upstream name; other builds keep the upstream names they persist.
 */
export const BRAND = import.meta.env.VITE_PP_ENABLED === "true" ? "pp" : "opencode"
