'use client'

import { useState } from 'react'

interface ExpandableTextProps {
  text: string
  limit?: number
}

export function ExpandableText({ text, limit = 60 }: ExpandableTextProps) {
  const [open, setOpen] = useState(false)
  const needsToggle = text.length > limit

  const body = needsToggle && !open ? text.slice(0, limit) + '…' : text

  return (
    <p style={{ fontSize: '11px', color: '#737373', lineHeight: 1.4, wordBreak: 'break-word' }}>
      {body}
      {needsToggle && (
        <>
          {' '}
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="font-semibold transition-opacity hover:opacity-70"
            style={{ color: '#1A2FEE', fontSize: '11px' }}
          >
            {open ? 'weniger' : 'mehr'}
          </button>
        </>
      )}
    </p>
  )
}
