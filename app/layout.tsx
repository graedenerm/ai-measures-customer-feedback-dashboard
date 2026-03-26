import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EvaluatorProvider } from '@/lib/evaluator-context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Energie-Bewertungsportal',
  description: 'Energie-Insights & Maßnahmen bewerten',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={inter.variable}>
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
