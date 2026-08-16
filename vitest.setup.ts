import "@testing-library/jest-dom/vitest";

// No `matchMedia` / `IntersectionObserver` / clipboard stubs here on purpose.
// None of the primitives this wave tests (Tabs, Disclosure, FilterGroup,
// CopyButton, CodeBlock, Button) touch those APIs — `SiteNav` and
// `useActiveSection` do, but they belong to a different owner and are out of
// scope for this suite. jsdom's *absence* of `navigator.clipboard` is in fact
// exactly the fallback path CopyButton needs to be tested against and is
// exercised directly (unstubbed) in `tests/ui/CopyButton.test.tsx`. Add a
// stub here only when a component this file's setup actually serves needs
// one — and if it's `matchMedia`, make sure it lets a test control `matches`
// rather than hardcoding `false`, since that would silently hide
// reduced-motion behaviour instead of testing it.
