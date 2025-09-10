// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function copyMetadata(from: any, to: any): void {
  const metadataKeys = Reflect.getMetadataKeys(from);
  metadataKeys.map((key): void => {
    const value = Reflect.getMetadata(key, from);
    Reflect.defineMetadata(key, value, to);
    return key;
  });
}
