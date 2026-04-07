import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EvaluatorProvider } from '@/lib/evaluator-context'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Energie-Bewertungsportal',
  description: 'Energie-Insights & Maßnahmen bewerten',
}

export const viewport: Viewport = {
  themeColor: '#00095B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <EvaluatorProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </EvaluatorProvider>
      </body>
    </html>
  )
}
