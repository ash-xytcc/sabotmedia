import { useEffect, useMemo, useRef } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { getConfiguredStyle, getConfiguredText } from '../lib/publicConfig'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { escapeHtml, insertPlainTextAsEditableHtml, plainTextToEditableHtml, sanitizeEditableHtml } from '../lib/editableHtml'

function defaultToHtml(children, multiline) {
  if (typeof children === 'string') return multiline ? plainTextToEditableHtml(children) : escapeHtml(children)
  return ''
}

export function EditableText({ as: Tag = 'div', className = '', children, field, multiline = false }) {
  const {
    isEditing,
    isAdmin,
    selectedField,
    setSelectedField,
    updateText,
  } = usePublicEdit()
  const elementRef = useRef(null)
  const isFocusedRef = useRef(false)
  const lastHtmlRef = useRef('')
  const resolvedConfig = useResolvedConfig()

  const fallbackHtml = useMemo(() => defaultToHtml(children, multiline), [children, multiline])
  const configuredHtml = sanitizeEditableHtml(getConfiguredText(resolvedConfig, field, fallbackHtml), { multiline })
  const draftStyle = getConfiguredStyle(resolvedConfig, field)
  const isSelected = isEditing && isAdmin && selectedField === field

  const style = useMemo(() => {
    const out = {}
    if (draftStyle.fontSize) out.fontSize = draftStyle.fontSize
    if (draftStyle.lineHeight) out.lineHeight = draftStyle.lineHeight
    if (draftStyle.maxWidth) out.maxWidth = draftStyle.maxWidth
    if (draftStyle.letterSpacing) out.letterSpacing = draftStyle.letterSpacing
    if (draftStyle.textTransform) out.textTransform = draftStyle.textTransform
    return out
  }, [draftStyle])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    if (isEditing && isFocusedRef.current) return
    if (element.innerHTML !== configuredHtml) {
      element.innerHTML = configuredHtml
      lastHtmlRef.current = configuredHtml
    }
  }, [configuredHtml, isEditing])

  function commitCurrentHtml() {
    const element = elementRef.current
    if (!element) return
    const nextHtml = sanitizeEditableHtml(element.innerHTML, { multiline })
    if (nextHtml !== element.innerHTML) {
      element.innerHTML = nextHtml
    }
    if (nextHtml !== lastHtmlRef.current) {
      lastHtmlRef.current = nextHtml
      updateText(field, nextHtml)
    }
  }

  return (
    <Tag
      ref={elementRef}
      className={`${className} ${isEditing && isAdmin ? 'editable-text editable-text--active' : ''} ${isSelected ? 'editable-text--selected' : ''}`.trim()}
      data-field={field}
      style={style}
      contentEditable={isEditing && isAdmin}
      suppressContentEditableWarning
      spellCheck={isEditing && isAdmin}
      tabIndex={isEditing && isAdmin ? 0 : undefined}
      title={isEditing && isAdmin ? 'Click and type to edit' : undefined}
      onClick={(event) => {
        if (!isEditing || !isAdmin) return
        event.stopPropagation()
        setSelectedField(field)
      }}
      onFocus={() => {
        if (!isEditing || !isAdmin) return
        isFocusedRef.current = true
        setSelectedField(field)
      }}
      onBlur={() => {
        if (!isEditing || !isAdmin) return
        isFocusedRef.current = false
        commitCurrentHtml()
      }}
      onPaste={(event) => {
        if (!isEditing || !isAdmin) return
        const text = event.clipboardData?.getData('text/plain')
        if (!text) return
        event.preventDefault()
        if (multiline) {
          insertPlainTextAsEditableHtml(text)
        } else {
          document.execCommand?.('insertText', false, text.replace(/\s+/g, ' ').trim())
        }
      }}
      dangerouslySetInnerHTML={{ __html: configuredHtml }}
    />
  )
}
