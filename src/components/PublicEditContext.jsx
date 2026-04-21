import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clearStoredPublicConfig, getStoredPublicConfig, mergePublicConfig, setStoredPublicConfig } from '../lib/publicConfig'
import { loadPublicConfigPayload, savePublicConfigPayload } from '../lib/publicConfigApi'
import { buildPublicConfigPayload } from '../lib/publicDraftExport'

const STORAGE_KEY = 'sabot-public-edit-draft-v2'
const PublicEditContext = createContext(null)

export function PublicEditProvider({ children }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isAdmin] = useState(true)
  const [selectedField, setSelectedField] = useState(null)

  const [savedConfig, setSavedConfig] = useState(() => getStoredPublicConfig() || { text: {}, styles: {}, blocks: {} })
  const [draft, setDraft] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : { text: {}, styles: {} }
    } catch {
      return { text: {}, styles: {} }
    }
  })

  const [loadState, setLoadState] = useState('idle')
  const [saveState, setSaveState] = useState('idle')
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // ignore
    }
  }, [draft])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setLoadState('loading')
        setLoadError('')
        const data = await loadPublicConfigPayload()
        const config = data?.config || { text: {}, styles: {}, blocks: {} }

        if (cancelled) return
        setSavedConfig(config)
        setStoredPublicConfig(config)
        setLoadState('loaded')
      } catch (error) {
        if (cancelled) return
        setLoadState('error')
        setLoadError(String(error?.message || error))
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  const changedFields = useMemo(() => {
    const textFields = Object.keys(draft?.text || {})
    const styleFields = Object.keys(draft?.styles || {})
    return [...new Set([...textFields, ...styleFields])].sort()
  }, [draft])

  const effectiveConfig = useMemo(
    () => mergePublicConfig(savedConfig || { text: {}, styles: {}, blocks: {} }, draft || { text: {}, styles: {} }),
    [savedConfig, draft]
  )

  const value = useMemo(() => ({
    isEditing,
    isAdmin,
    selectedField,
    setSelectedField,
    draft,
    savedConfig,
    effectiveConfig,
    changedFields,
    loadState,
    saveState,
    loadError,
    saveError,
    setSavedConfig,
    toggleEditing: () => {
      setIsEditing((v) => {
        const next = !v
        if (!next) setSelectedField(null)
        return next
      })
    },
    updateText(field, value) {
      setDraft((prev) => ({
        ...prev,
        text: {
          ...prev.text,
          [field]: value,
        },
      }))
    },
    updateStyle(field, patch) {
      setDraft((prev) => ({
        ...prev,
        styles: {
          ...prev.styles,
          [field]: {
            ...(prev.styles?.[field] || {}),
            ...patch,
          },
        },
      }))
    },
    resetField(field) {
      setDraft((prev) => {
        const nextText = { ...(prev.text || {}) }
        const nextStyles = { ...(prev.styles || {}) }
        delete nextText[field]
        delete nextStyles[field]
        return { text: nextText, styles: nextStyles }
      })
    },
    applyDraftLocally() {
      const next = mergePublicConfig(savedConfig || { text: {}, styles: {}, blocks: {} }, draft || { text: {}, styles: {} })
      setSavedConfig(next)
      setStoredPublicConfig(next)
      setDraft({ text: {}, styles: {} })
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    },
    async saveDraftToBackend() {
      try {
        setSaveState('saving')
        setSaveError('')

        const next = mergePublicConfig(savedConfig || { text: {}, styles: {}, blocks: {} }, draft || { text: {}, styles: {} })
        const payload = buildPublicConfigPayload(next)
        const data = await savePublicConfigPayload(payload)
        const saved = data?.received?.publicSite || next

        setSavedConfig(saved)
        setStoredPublicConfig(saved)
        setDraft({ text: {}, styles: {} })
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }

        setSaveState('saved')
        window.setTimeout(() => setSaveState('idle'), 1500)
      } catch (error) {
        setSaveState('error')
        setSaveError(String(error?.message || error))
      }
    },
    clearDraft() {
      const empty = { text: {}, styles: {} }
      setDraft(empty)
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    },
    clearSavedConfig() {
      setSavedConfig({ text: {}, styles: {}, blocks: {} })
      clearStoredPublicConfig()
    },
    exportDraft() {
      return JSON.stringify(draft, null, 2)
    },
  }), [isEditing, isAdmin, selectedField, draft, savedConfig, effectiveConfig, changedFields, loadState, saveState, loadError, saveError])

  return (
    <PublicEditContext.Provider value={value}>
      {children}
    </PublicEditContext.Provider>
  )
}

export function usePublicEdit() {
  const ctx = useContext(PublicEditContext)
  if (!ctx) throw new Error('usePublicEdit must be used inside PublicEditProvider')
  return ctx
}
