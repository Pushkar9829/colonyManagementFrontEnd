// Joins truthy class names.
export const cn = (...classes) => classes.flat().filter(Boolean).join(' ');
