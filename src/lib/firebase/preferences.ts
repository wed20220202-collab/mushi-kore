import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";

export type ThemePreference = "system" | "light" | "dark";
export type LocationPreference = "ask" | "never";

export interface UserPreferences {
  theme: ThemePreference;
  location: LocationPreference;
  keepLocalCopy: boolean;
}

export const defaultPreferences: UserPreferences = {
  theme: "system",
  location: "ask",
  keepLocalCopy: false,
};

const LOCAL_KEY = "mushi-kore-preferences";

export function readLocalPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as Partial<UserPreferences>;
    return {
      theme: value.theme === "light" || value.theme === "dark" ? value.theme : "system",
      location: value.location === "never" ? "never" : "ask",
      keepLocalCopy: value.keepLocalCopy === true,
    };
  } catch {
    return defaultPreferences;
  }
}

export function applyPreferences(preferences: UserPreferences) {
  if (typeof document === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(preferences));
  document.documentElement.dataset.theme = preferences.theme;
}

export async function loadUserPreferences(uid: string) {
  const local = readLocalPreferences();
  if (!firestore) return local;
  const snapshot = await getDoc(doc(firestore, "users", uid, "settings", "preferences"));
  if (!snapshot.exists()) return local;
  const value = snapshot.data() as Partial<UserPreferences>;
  const preferences: UserPreferences = {
    theme: value.theme === "light" || value.theme === "dark" ? value.theme : "system",
    location: value.location === "never" ? "never" : "ask",
    keepLocalCopy: value.keepLocalCopy === true,
  };
  applyPreferences(preferences);
  return preferences;
}

export async function saveUserPreferences(uid: string, preferences: UserPreferences) {
  applyPreferences(preferences);
  if (!firestore) return;
  await setDoc(doc(firestore, "users", uid, "settings", "preferences"), {
    ...preferences,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
