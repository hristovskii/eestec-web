/** "Tallinn, Estonia": the text of the place filter and of the line under a title. */
export const placeLabel = (city: string, country: string): string =>
  [city.trim(), country.trim()].filter(Boolean).join(', ');

export const samePlace = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();
