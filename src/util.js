export function deepCopyArr(src) {
  if (src.length === 0) return src;
  if (typeof(src[0]) !== 'object') return src.slice();
  else return src.map(deepCopyArr);
}

export function range(start, end, interval) {
  const out = [];
  if (!interval) interval = 1;
  for (var i = start; i < end; i += interval) out.push(i);
  return out;
}