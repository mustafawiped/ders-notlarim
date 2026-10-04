import { useState, type ReactNode } from 'react'
import { Icon } from './icons'

interface MarkdownViewProps {
  content: string
  className?: string
  onToggleCheckbox?: (lineIndex: number) => void
}

/**
 * Format inline markdown tokens: bold, italic, strikethrough, highlight, inline code.
 */
function renderInline(text: string): ReactNode[] {
  // Regex to match inline tokens:
  // `code`, **bold**, *italic*, ~~strike~~, ==mark==
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|==[^=]+==)/g
  const parts = text.split(regex)

  return parts.map((part, i) => {
    if (!part) return null
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="inline-code">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i}>{renderInline(part.slice(2, -2))}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={i}>{renderInline(part.slice(1, -1))}</em>
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return <del key={i}>{renderInline(part.slice(2, -2))}</del>
    }
    if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
      return <mark key={i} className="note-mark">{renderInline(part.slice(2, -2))}</mark>
    }
    return <span key={i}>{part}</span>
  })
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || 'kod'}</span>
        <button className="md-code-copy" onClick={copy} type="button" title="Kopyala">
          <Icon name={copied ? 'check' : 'copy'} size={13} />
          <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
        </button>
      </div>
      <pre className="md-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function MarkdownView({ content, className, onToggleCheckbox }: MarkdownViewProps) {
  const lines = content.split('\n')
  const elements: ReactNode[] = []

  let inCodeBlock = false
  let codeBuffer: string[] = []
  let codeLang = ''

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // Code block open/close
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <CodeBlock
            key={`code-${i}`}
            code={codeBuffer.join('\n')}
            lang={codeLang}
          />,
        )
        codeBuffer = []
        codeLang = ''
        inCodeBlock = false
      } else {
        // Start of code block
        inCodeBlock = true
        codeLang = trimmed.slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine)
      continue
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="md-h3">
          {renderInline(trimmed.slice(4))}
        </h3>,
      )
      continue
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="md-h2">
          {renderInline(trimmed.slice(3))}
        </h2>,
      )
      continue
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="md-h1">
          {renderInline(trimmed.slice(2))}
        </h1>,
      )
      continue
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="md-blockquote">
          {renderInline(trimmed.slice(2))}
        </blockquote>,
      )
      continue
    }

    // Checklist
    if (/^-\s*\[([ xX])\]\s+/.test(trimmed)) {
      const isChecked = /^-\s*\[[xX]\]\s+/.test(trimmed)
      const textAfter = trimmed.replace(/^-\s*\[([ xX])\]\s+/, '')
      elements.push(
        <div
          key={i}
          className={`md-checklist-item ${isChecked ? 'checked' : ''}`}
          onClick={() => onToggleCheckbox?.(i)}
        >
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="md-checkbox"
          />
          <span>{renderInline(textAfter)}</span>
        </div>,
      )
      continue
    }

    // Unordered bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={i} className="md-li">
          {renderInline(trimmed.slice(2))}
        </li>,
      )
      continue
    }

    // Empty line
    if (!trimmed) {
      elements.push(<div key={i} className="md-spacer" />)
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="md-p">
        {renderInline(rawLine)}
      </p>,
    )
  }

  // If unclosed code block at end of text
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <CodeBlock
        key="code-unclosed"
        code={codeBuffer.join('\n')}
        lang={codeLang}
      />,
    )
  }

  return <div className={`md-content ${className ?? ''}`}>{elements}</div>
}
