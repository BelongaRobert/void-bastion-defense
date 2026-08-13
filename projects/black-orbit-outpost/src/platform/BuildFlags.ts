/** Release builds hide cheats; Vite sets import.meta.env.DEV in `npm run dev`. */
export function isDevBuild(): boolean {
  try {
    return !!import.meta.env?.DEV;
  } catch {
    return false;
  }
}
