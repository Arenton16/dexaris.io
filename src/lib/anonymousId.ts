const ANON_ID_KEY = 'dexaris_anon_id';

export function getAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (e.g. storage blocked) — return a session-only ID
    return crypto.randomUUID();
  }
}
