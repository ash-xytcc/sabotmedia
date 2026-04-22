import { useMemo } from 'react'
import { usePublicEdit } from '../components/PublicEditContext'
import { resolvePublicConfig } from './publicConfig'

export function useResolvedConfig() {
  const { effectiveConfig } = usePublicEdit()

  return useMemo(() => {
    return resolvePublicConfig(effectiveConfig || { text: {}, styles: {}, blocks: {} })
  }, [effectiveConfig])
}
