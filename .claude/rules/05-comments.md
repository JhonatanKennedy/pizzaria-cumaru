# Comments

Code is read far more often than it is written, and a comment that restates the code doubles the reading without adding information. **Comments are only written when strictly needed** — when the code alone cannot carry the information.

## The rule in one sentence

If a reader can derive it from the code, don't comment it. If you comment it, say the *why*, never the *what*.

```tsx
// ❌ — restates the code, adds nothing
const visibleLinks = NAV_LINKS.filter((link) => link.roles.includes(user.role)); // filters the links to the user's role

// ❌ — narrates a line instead of explaining the decision
navigate(roleHomePath(user.role), { replace: true }); // redirects to the role home screen

// ✅ — no comment; the code reads as a sentence on its own
const visibleLinks = NAV_LINKS.filter((link) => link.roles.includes(user.role));
```

## When a comment IS strictly needed

1. **The why of a non-obvious decision.** A reader can see *what* the code does; only you know *why* it must be that way — when the reason is invisible (business rule, workaround, constraint), one line of comment earns its place.

```ts
// ✅ — real case: logout must end the local session even when the
// backend call fails (token may already be expired or denylisted)
await revokeToken().catch(() => undefined);
clearSession();
```

2. **A non-obvious invariant the types can't express.** If two values must stay in sync, or a fallback exists for a reason, say so — briefly.

3. **An empty or swallowed operation**, so the next reader knows it is deliberate, not a bug — see the logout example above.

## What never justifies a comment

- **Section banners** (`// —————— UI ——————`): split the file instead.
- **Todos about the current task**: that's what the task list, PR description or [08-conventions.md](08-conventions.md) debt section is for.
- **Attribution or history**: git blame has it.
- **JSDoc on every function**: public API types + names should tell the story; document only when the contract has a caveat.

## Mechanics

- One or two lines, English, same case rules as prose.
- Keep the comment on its own line above the code it explains, not trailing on the same line.
- Prefer naming over commenting: a well-named helper (`isUserRole`, `toErrorMessage`) removes the need for the comment that would explain the inline code.

```tsx
// ❌ — a comment where a name does the job
// if the user is not authenticated, go to login
if (!user) {
  return <Navigate to="/login" replace />;
}

// ✅ — the same logic as a self-documenting guard (require-role.tsx, as-is)
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  ...
}
```
