/**
 * Formats a string into a URL-friendly slug
 * @param text The text to convert to a slug
 * @returns A URL-friendly slug
 */
export const formatSlug = (text: string): string => {
  if (!text) return '';

  // Convert to lowercase
  let slug = text.toLowerCase();

  // Replace non-alphanumeric characters with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');

  // Remove leading and trailing hyphens
  slug = slug.replace(/^-|-$/g, '');

  return slug;
};

/**
 * Creates a combined slug from provider and game name
 * @param provider The provider name
 * @param gameName The game name
 * @returns A combined slug in format "name-provider"
 */
export const createGameSlug = (provider: string, gameName: string): string => {
  const providerSlug = formatSlug(provider);
  const gameNameSlug = formatSlug(gameName);

  return `${gameNameSlug}-${providerSlug}`;
};
