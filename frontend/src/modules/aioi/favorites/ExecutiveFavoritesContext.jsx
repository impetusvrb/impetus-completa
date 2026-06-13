/**
 * AIOI-P6.7 — Executive Favorites Context (UI EXPERIENCE ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveFavoritesContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   favoritesReady: boolean,
 *   addFavorite: (moduleId: string) => void,
 *   removeFavorite: (moduleId: string) => void,
 *   isFavorite: (moduleId: string) => boolean,
 *   listFavorites: () => string[],
 *   resetFavorites: () => void
 * } | null}
 */
export function useExecutiveFavorites() {
  return useContext(ExecutiveFavoritesContext);
}

export default ExecutiveFavoritesContext;
