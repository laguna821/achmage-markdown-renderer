export const normalizePathSeparators = (value: string): string => value.replace(/\\/g, '/');

export const getExtension = (value: string): string => {
  const normalized = normalizePathSeparators(value);
  const lastSlash = normalized.lastIndexOf('/');
  const lastDot = normalized.lastIndexOf('.');
  if (lastDot <= lastSlash) {
    return '';
  }

  return normalized.slice(lastDot);
};

export const stripExtension = (value: string): string => {
  const extension = getExtension(value);
  return extension ? value.slice(0, -extension.length) : value;
};

export const getBasename = (value: string): string => {
  const normalized = normalizePathSeparators(value);
  const fileName = normalized.split('/').pop() ?? normalized;
  return stripExtension(fileName);
};

export const getDirname = (value: string): string => {
  const normalized = normalizePathSeparators(value);
  const parts = normalized.split('/');
  parts.pop();
  return parts.join('/') || '.';
};
