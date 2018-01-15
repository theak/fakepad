export function deepCopyArr(src) {
  if (src.length === 0) return src;
  if (typeof(src[0]) !== 'object') return src.slice();
  else return src.map(deepCopyArr);
}
