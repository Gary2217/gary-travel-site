const STORAGE_KEY = "gary_travel_favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavorite(tripId: string): boolean {
  return getFavorites().includes(tripId);
}

export function toggleFavorite(tripId: string): boolean {
  const current = getFavorites();
  const exists = current.includes(tripId);

  const next = exists
    ? current.filter((id) => id !== tripId)
    : [...current, tripId];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return !exists;
}
