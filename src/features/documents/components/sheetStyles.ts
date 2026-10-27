/** Grid wrapper for `Box` cells; the negative margins collapse the double borders. */
export const boxGrid = {
  2: 'grid grid-cols-2 [&>*]:-ml-px [&>*]:-mt-px',
  3: 'grid grid-cols-3 [&>*]:-ml-px [&>*]:-mt-px',
  4: 'grid grid-cols-4 [&>*]:-ml-px [&>*]:-mt-px',
} as const;
