---
applyTo: "client/**/*.tsx"
---

# React Component Standards for CMC Go

## Component Structure

- Use functional components with TypeScript
- Define props interface above component: `interface ComponentNameProps { ... }`
- Export components as named exports: `export function ComponentName() { ... }`
- Use PascalCase for component files and names

## Hooks

- Use custom hooks from `client/src/hooks/` for shared logic
- Follow the `use` prefix convention: `useAuth`, `useDistricts`, etc.
- Destructure tRPC hooks: `const { data, isLoading, error } = trpc.router.procedure.useQuery()`

## State Management

- Prefer React Query (via tRPC) for server state
- Use Zustand stores from `client/src/contexts/` for complex client state
- Keep component state minimal with `useState`

## Styling

- Use Tailwind CSS utility classes
- Follow existing shadcn/ui component patterns in `client/src/components/ui/`
- Avoid inline styles except for dynamic values

## Map-Specific Components

- District paths use `id` from `client/public/map.svg` (case-sensitive match to `districts.id`)
- Handle district selection via context from `client/src/contexts/`

## Type Safety

- Import types from `shared/types.ts` for cross-boundary types
- Use `const.ts` values for status enums: `Yes`, `Maybe`, `No`, `Not Invited`
- Never use `any` - use `unknown` and type guards instead

## Performance

- Memoize expensive computations with `useMemo`
- Use `useCallback` for event handlers passed as props
- Lazy load routes with `React.lazy()` and `Suspense`

## Error Handling

- Wrap async operations in try/catch
- Use error boundaries for component-level errors
- Display user-friendly error messages via toast notifications
