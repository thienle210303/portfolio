import "@testing-library/jest-dom/vitest";

// No `matchMedia` / `IntersectionObserver` stubs here on purpose. None of the
// primitives this wave tests (Tabs, Disclosure, FilterGroup, CopyButton,
// CodeBlock, Button) touch those APIs — `SiteNav` and `useActiveSection` do,
// but they belong to a different owner and are out of scope for this suite.
// Add a stub here only when a component this file's setup actually serves
// needs one — and if it's `matchMedia`, make sure it lets a test control
// `matches` rather than hardcoding `false`, since that would silently hide
// reduced-motion behaviour instead of testing it.
//
// Also deliberately no `navigator.clipboard` stub: `tests/ui/CopyButton.test.tsx`
// sets `navigator.clipboard` to exactly the state each of its tests needs,
// explicitly, every time — never relying on jsdom's own default. That default
// turns out not to be a stable "absent" baseline in this project:
// `@testing-library/user-event`'s `setup()` installs its own real, working
// clipboard stub as a side effect (to back its `copy()`/`paste()`/`cut()`
// helpers), so "clipboard is unavailable" stops being true from the first
// `userEvent.setup()` call onward in a file, regardless of the fresh-jsdom
// starting point. See the comment at the top of CopyButton.test.tsx.
