# CresQ

A strength-first training app: plan a split, log sessions, and see every lift progress.

Built with Expo SDK 57, expo-router, React Native and TypeScript.

## Run it

```bash
npm install
npm run web        # in the browser on port 8081
npx expo start     # on your phone with Expo Go
```

## Where things live

| Path | What it holds |
|---|---|
| `src/app` | Screens and routes (file-based, expo-router) |
| `src/components` | Shared UI: buttons, cards, charts, tab bar |
| `src/db` | Local storage, seed data and every derived number |
| `src/store` | Hooks for auth, the split and the running workout |
| `constants/theme.ts` | Design tokens, named like the Figma variables |
| `assets` | Fonts, brand marks and photos used by the app |

Data is stored on the device for now. Raise `DB_VERSION` in `src/db/types.ts` to reseed during development.
