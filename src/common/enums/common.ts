export type EnumValues<T> = T[keyof T];

export function getValues<T extends Record<string, any>>(obj: T): [T[keyof T]] {
  return Object.values(obj) as [(typeof obj)[keyof T]];
}
