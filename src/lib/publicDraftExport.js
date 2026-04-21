export function buildPublicConfigPayload(input) {
  const text = input?.text || {}
  const styles = input?.styles || {}

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    publicSite: {
      text,
      styles,
    },
  }
}

export function buildChangedOnlyPayload(input) {
  const text = input?.text || {}
  const styles = input?.styles || {}

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    changedOnly: true,
    publicSite: {
      text,
      styles,
    },
  }
}
