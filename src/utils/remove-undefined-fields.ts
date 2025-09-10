export const removeUndefinedFields = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const keys = Object.keys(obj);
  keys.forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
};
