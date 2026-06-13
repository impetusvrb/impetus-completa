/**
 * AIOI-P6.7 — Executive Favorites Provider (UI EXPERIENCE ONLY)
 *
 * Atalhos pessoais certificados — sem navegação automática, sem permissões.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExecutiveFavoritesContext } from './ExecutiveFavoritesContext.jsx';
import ExecutiveFavoritesIndicators from './ExecutiveFavoritesIndicators.jsx';
import {
  addFavorite as addFavoriteToList,
  buildFavoritesMetadata,
  isFavorite as checkIsFavorite,
  listFavorites as listFavoritesFromModel,
  loadExecutiveFavorites,
  removeFavorite as removeFavoriteFromList,
  resetExecutiveFavorites,
  resolveFavoritesStorage,
  saveExecutiveFavorites
} from './ExecutiveFavoritesService.js';
import styles from './ExecutiveFavorites.module.css';

/**
 * @param {{
 *   children?: React.ReactNode,
 *   storageAdapter?: { getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }
 * }} props
 */
export function ExecutiveFavoritesProvider({ children, storageAdapter }) {
  const storage = useMemo(() => resolveFavoritesStorage(storageAdapter), [storageAdapter]);
  const [model, setModel] = useState(() => loadExecutiveFavorites(storage));
  const [favoritesReady, setFavoritesReady] = useState(false);

  useEffect(() => {
    setModel(loadExecutiveFavorites(storage));
    setFavoritesReady(true);
  }, [storage]);

  const metadata = useMemo(() => buildFavoritesMetadata(model.favorites), [model.favorites]);

  const addFavorite = useCallback(
    (moduleId) => {
      setModel((prev) => {
        const nextFavorites = addFavoriteToList(prev.favorites, moduleId);
        return saveExecutiveFavorites({ ...prev, favorites: nextFavorites }, storage);
      });
    },
    [storage]
  );

  const removeFavorite = useCallback(
    (moduleId) => {
      setModel((prev) => {
        const nextFavorites = removeFavoriteFromList(prev.favorites, moduleId);
        return saveExecutiveFavorites({ ...prev, favorites: nextFavorites }, storage);
      });
    },
    [storage]
  );

  const isFavorite = useCallback(
    (moduleId) => checkIsFavorite(model.favorites, moduleId),
    [model.favorites]
  );

  const listFavorites = useCallback(
    () => listFavoritesFromModel(model.favorites),
    [model.favorites]
  );

  const resetFavorites = useCallback(() => {
    const defaults = resetExecutiveFavorites(storage);
    setModel(defaults);
  }, [storage]);

  const contextValue = useMemo(
    () => ({
      metadata,
      favoritesReady,
      addFavorite,
      removeFavorite,
      isFavorite,
      listFavorites,
      resetFavorites,
      readOnly: true
    }),
    [metadata, favoritesReady, addFavorite, removeFavorite, isFavorite, listFavorites, resetFavorites]
  );

  return (
    <ExecutiveFavoritesContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-favorites-provider"
        data-favorites-ready={favoritesReady ? 'true' : 'false'}
        aria-label="Executive Favorites Provider"
      >
        <ExecutiveFavoritesIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveFavoritesContext.Provider>
  );
}

export default ExecutiveFavoritesProvider;
