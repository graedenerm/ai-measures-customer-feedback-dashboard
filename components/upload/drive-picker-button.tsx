'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gapi = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Google = any

declare global {
  interface Window {
    gapi?: Gapi
    google?: Google
  }
}

interface Props {
  onContent: (content: string, fileName: string) => void
  disabled?: boolean
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = reject
    document.body.appendChild(s)
  })
}

export function DrivePickerButton({ onContent, disabled }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const tokenClientRef = useRef<Google>(null)
  const accessTokenRef = useRef<string | null>(null)
  const pickerReadyRef = useRef(false)

  // Load Google scripts once on mount
  useEffect(() => {
    if (!API_KEY || !CLIENT_ID) return
    setStatus('loading')

    Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client'),
    ])
      .then(() => {
        window.gapi!.load('picker', () => {
          pickerReadyRef.current = true
        })
        tokenClientRef.current = window.google!.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: { access_token: string }) => {
            accessTokenRef.current = tokenResponse.access_token
            openPicker(tokenResponse.access_token)
          },
        })
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const openPicker = useCallback((token: string) => {
    if (!pickerReadyRef.current || !window.google) return

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes('application/json')
      .setIncludeFolders(true)

    new window.google.picker.PickerBuilder()
      .setTitle('Select a JSON file')
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY!)
      .setCallback(async (data: { action: string; docs: Array<{ id: string; name: string }> }) => {
        if (data.action !== window.google!.picker.Action.PICKED) return
        const file = data.docs[0]
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) return
        const text = await res.text()
        onContent(text, file.name)
      })
      .build()
      .setVisible(true)
  }, [onContent])

  const handleClick = () => {
    if (!tokenClientRef.current) return
    if (accessTokenRef.current) {
      openPicker(accessTokenRef.current)
    } else {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' })
    }
  }

  if (!API_KEY || !CLIENT_ID) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || status === 'loading' || status === 'error'}
      onClick={handleClick}
      title={status === 'error' ? 'Failed to load Google Drive' : 'Select from Google Drive'}
    >
      {status === 'loading' ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <GoogleDriveIcon />
      )}
      From Drive
    </Button>
  )
}

function GoogleDriveIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  )
}
