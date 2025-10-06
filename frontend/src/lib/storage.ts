/**
 * LocalStorage utility for user data persistence
 */

import type { LocalUserData } from "./types";

const STORAGE_KEY = "sat_prep_user";

/**
 * Save user data to localStorage
 */
export function saveUserToStorage(userId: string): void {
  const userData: LocalUserData = {
    user_id: userId,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error("Failed to save user to localStorage:", error);
  }
}

/**
 * Get user data from localStorage
 */
export function getUserFromStorage(): LocalUserData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const userData: LocalUserData = JSON.parse(data);

    // Update last active time
    userData.last_active = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));

    return userData;
  } catch (error) {
    console.error("Failed to get user from localStorage:", error);
    return null;
  }
}

/**
 * Clear user data from localStorage
 */
export function clearUserFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear user from localStorage:", error);
  }
}

/**
 * Check if user exists in localStorage
 */
export function hasStoredUser(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Get just the user ID from storage (convenience function)
 */
export function getUserId(): string | null {
  const userData = getUserFromStorage();
  return userData?.user_id || null;
}
