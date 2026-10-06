export function formatProjectName(name: string): string {
  return name.trim().replace(/(^|[\s\-–—/([{])([\p{L}\p{N}])/gu, (_, prefix, character) =>
    `${prefix}${character.toLocaleUpperCase()}`,
  );
}
