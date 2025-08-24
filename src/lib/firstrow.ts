export function firstRow<T>(data: T[] | null | undefined): T | null {
  return (Array.isArray(data) && data.length > 0) ? data[0] : null;
}
