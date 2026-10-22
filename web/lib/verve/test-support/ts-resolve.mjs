export async function resolve(specifier, context, nextResolve) {
  if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
    try { return await nextResolve(specifier + '.ts', context) } catch { /* cai no padrão */ }
  }
  return nextResolve(specifier, context)
}
