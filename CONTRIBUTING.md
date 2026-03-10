# Contributing to TrainTracker

Thanks for your interest in contributing to TrainTracker! This is a volunteer-built side project, so contributions from fellow transit enthusiasts are welcome and appreciated.

## Before You Contribute

**Open an issue first.** Before spending time on a pull request, please open a [GitHub issue](https://github.com/liddiard/traintracker/issues) to discuss what you'd like to change. You're welcome to submit a PR without prior discussion, but don't expect it to be merged without alignment on the feature scope and implementation approach.

This helps avoid wasted effort and ensures your contribution fits the project's direction.

## What to Work On

The best place to start is the existing [GitHub issues](https://github.com/liddiard/traintracker/issues), particularly those labeled as bugs or enhancements. These represent known needs that have already been scoped.

### Non-code contributions

Contributions beyond code are very welcome:

- **Track and station data** -- Sourcing reliable, up-to-date train and rail data is one of the hardest parts of this project. If you have better data sources or ideas for more reliable automated data updates, please open an issue.
- **Documentation** -- Corrections, clarifications, and additions to the docs are always appreciated.

### Out of scope

- **Intra-city transit** -- TrainTracker focuses on intercity rail. Supporting local transit (commuter rail, subways, buses) requires entirely different capabilities and is already well-served by apps like Google Maps, CityMapper, and Transit. See the [About page FAQ](https://traintracker.app/about) for more detail.
- **User accounts and registration** -- This doesn't exist yet. Any work in this area would require extensive discussion to ensure it's designed safely and thoughtfully. Please open an issue well in advance.

## Development Setup

See [README.md](./README.md) for getting started with local development, and [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment details.

Key notes:

- The SQLite database is created automatically on first run (requires SQLite3, which most modern OSes include).
- VAPID keys are only needed if you're working on push notification features. The app runs fine without them otherwise.

## Code Style

Linting and formatting are enforced automatically via lint-staged and Prettier on pre-commit hooks. Beyond that:

- **Use Tailwind CSS** for styling.
- **Prefer `async`/`await`** over `.then()` chains.
- **Avoid TypeScript anti-patterns** like `any` types and unnecessary explicit casting.
- **Memoize by default** -- use `useMemo` and `useCallback` for React values and functions unless there's a clear reason not to.

### Checking your work

```bash
npm run lint          # Lint and format check
npx tsc --noEmit      # Type check
```

Run both before submitting a PR.

## Pull Requests

- **Keep PRs small and focused.** One concern per PR is ideal.
- Larger PRs are acceptable for features that have been pre-aligned in a GitHub issue discussion.
- Make sure your changes pass linting and type checking (see above).

## Review Turnaround

- **Pre-discussed PRs** (aligned in a GitHub issue): expect a review within about a week.
- **Unsolicited PRs** (no prior discussion): no guaranteed timeline. This is a side project maintained in spare time.

## Questions?

Open a [GitHub issue](https://github.com/liddiard/traintracker/issues). Don't hesitate to open one even for questions or enhancement ideas -- issues aren't just for bugs.
