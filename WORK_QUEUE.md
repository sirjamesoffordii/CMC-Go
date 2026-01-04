# Work Queue

## Completed Tickets

- **Filter state persistence for People tab** - PR TBD (staging branch)
  - Implemented URL query parameter persistence for all filters
  - Filters persist across navigation and page refreshes
  - Commit: 099d622

- **Add 'Needs' filter to People tab** - PR #31 (https://github.com/sirjamesoffordii/CMC-Go/pull/31)
  - Added "Has active needs" filter to People page
  - Filter allows showing only people with at least one active need
  - Commit: 6e21dd5

- **Define + Enforce "Active Needs" Semantics** - PR #30 (https://github.com/sirjamesoffordii/CMC-Go/pull/30)
  - Added explicit Active Need definition to Follow-Up filter
  - Commit: bff9ad3


- **Fix URL filter parameter initialization crash** - PR #38 (staging), PR #39 (main)
  - Fixed TypeError: number 0 is not iterable when visiting /people without query params
  - Replaced eager getInitialFiltersFromURL() with lazy useState initialization
  - URL parameters now parsed only once on mount
  - Staging PR: https://github.com/sirjamesoffordii/CMC-Go/pull/38
  - Staging Commit: 1d6c11a
  - Main PR: https://github.com/sirjamesoffordii/CMC-Go/pull/39
  - Main Commit: d600c31
  - Verified on staging (clean URL + params URL)
