import { useMemo } from 'react'
import { usePublicEdit } from './PublicEditContext'
import { getConfiguredStyle, getConfiguredText } from '../lib/publicConfig'

export function EditableText({ as: Tag = 'div', className = '', children, field }) {
  const {
    isEditing,
    isAdmin,
    selectedField,
    setSelectedField,
    effectiveConfig,
    updateText,
  } = usePublicEdit()

  const configuredText = getConfiguredText(effectiveConfig, field, typeof children === 'string' ? children : '')
  const draftStyle = getConfiguredStyle(effectiveConfig, field)
  const isSelected = isEditing && isAdmin && selectedField === field

  const style = useMemo(() => {
    const out = {}
    if (draftStyle.fontSize) out.fontSize = draftStyle.fontSize
    if (draftStyle.lineHeight) out.lineHeight = draftStyle.lineHeight
    if (draftStyle.maxWidth) out.maxWidth = draftStyle.maxWidth
    return out
  }, [draftStyle])

  return (
    <Tag
      className={`${className} ${isEditing && isAdmin ? 'editable-text editable-text--active' : ''} ${isSelected ? 'editable-text--selected' : ''}`.trim()}
      data-field={field}
      style={style}
      contentEditable={isEditing && isAdmin}
      suppressContentEditableWarning
      onClick={(e) => {
        if (!isEditing || !isAdmin) return
        e.stopPropagation()
        setSelectedField(field)
      }}
      onInput={(e) => {
        if (!isEditing || !isAdmin) return
        updateText(field, e.currentTarget.textContent || '')
      }}
    >
      {configuredText || children}
    </Tag>
  )
}
