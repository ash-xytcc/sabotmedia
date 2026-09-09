const contentRoot = new URL('../../src/content/', import.meta.url).href

export async function load(url, context, nextLoad) {
  if (url.startsWith(contentRoot) && url.endsWith('.json')) {
    return nextLoad(url, {
      ...context,
      importAttributes: { ...context.importAttributes, type: 'json' },
    })
  }
  return nextLoad(url, context)
}
