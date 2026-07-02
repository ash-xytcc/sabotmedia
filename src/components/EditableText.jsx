import { useMemo } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { getConfiguredStyle, getConfiguredText } from '../lib/publicConfig'
import { useResolvedConfig } from '../lib/useResolvedConfig'

export function EditableText({ as: Tag = 'div', className = '', children, field }) {
  const {
    isEditing,
    isAdmin,
    selectedField,
    setSelectedField,
    updateText,
  } = usePublicEdit()

  const resolvedConfig = useResolvedConfig()

  const configuredText = getConfiguredText(
    resolvedConfig,
    field,
    typeof children === 'string' ? children : ''
  )

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

  return (
    <Tag
      className={`${className} ${isEditing && isAdmin ? 'editable-text editable-text--active' : ''} ${isSelected ? 'editable-text--selected' : ''}`.trim()}
      data-field={field}
      style={style}
      contentEditable={isEditing && isAdmin}
      suppressContentEditableWarning
      spellCheck={isEditing && isAdmin}
      tabIndex={isEditing && isAdmin ? 0 : undefined}
      title={isEditing && isAdmin ? 'Click and type to edit' : undefined}
      onClick={(e) => {
        if (!isEditing || !isAdmin) return
        e.stopPropagation()
        setSelectedField(field)
      }}
      onFocus={() => {
        if (!isEditing || !isAdmin) return
        setSelectedField(field)
      }}
      onInput={(e) => {
        if (!isEditing || !isAdmin) return
        updateText(field, e.currentTarget.innerText || e.currentTarget.textContent || '')
      }}
    >
      {configuredText || children}
    </Tag>
  )
}
