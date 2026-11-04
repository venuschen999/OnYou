// App paths in one place (AGENTS.md §3 layout; docs/agent-memory/auth.md A8.2).
export const ROUTES = {
  home: "/dashboard",
  focus: "/focus",
  history: "/history",
  settings: "/settings",
  login: "/login",
  signup: "/signup",
} as const;

// Routes behind login. src/proxy.ts repeats these in `config.matcher`, which
// Next.js requires to be a static literal.
export const PROTECTED_ROUTES: readonly string[] = [
  ROUTES.home,
  ROUTES.focus,
  ROUTES.history,
  ROUTES.settings,
];
