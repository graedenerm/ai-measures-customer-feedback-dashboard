'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MetricRating, type MetricValue } from './metric-rating'
import { submitEvaluation } from '@/actions/evaluations'

interface RatingDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemType: 'insight' | 'measure'
  itemId: string
  itemTitle: string
  onSuccess?: () => void
}

const EVALUATOR_KEY = 'evaluator_name'

function toDbValue(v: MetricValue | null): number | null {
  if (v === null || v === 'na') return null
  return v
}

export function RatingDrawer({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemTitle,
  onSuccess,
}: RatingDrawerProps) {
  const [evaluatorName, setEvaluatorName] = useState('')
  const [comprehensibility, setComprehensibility] = useState<MetricValue | null>(null)
  const [relevance, setRelevance] = useState<MetricValue | null>(null)
  const [plausibility, setPlausibility] = useState<MetricValue | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem(EVALUATOR_KEY)
        if (stored) setEvaluatorName(stored)
      } catch {
        // localStorage may not be available
      }
      setComprehensibility(null)
      setRelevance(null)
      setPlausibility(null)
      setNotes('')
      setError(null)
      setSuccess(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!evaluatorName.trim()) {
      setError('Please enter your name.')
      return
    }
    if (comprehensibility === null || relevance === null || plausibility === null) {
      setError('Please rate all three criteria.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      localStorage.setItem(EVALUATOR_KEY, evaluatorName.trim())
    } catch {
      // ignore
    }

    const result = await submitEvaluation({
      itemType,
      itemId,
      evaluatorName: evaluatorName.trim(),
      impression: 'neutral',
      comprehensibility: toDbValue(comprehensibility),
      relevance: toDbValue(relevance),
      plausibility: toDbValue(plausibility),
      notes: notes.trim() || undefined,
    })

    setLoading(false)

    if (result.success) {
      setSuccess(true)
      onSuccess?.()
      setTimeout(() => {
        onOpenChange(false)
      }, 1200)
    } else {
      setError(result.error ?? 'Submission failed.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-base leading-snug">
            Rate {itemType === 'insight' ? 'Insight' : 'Measure'}
          </SheetTitle>
          <SheetDescription className="line-clamp-2">
            {itemTitle}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 py-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evaluator-name">Your Name</Label>
            <Input
              id="evaluator-name"
              placeholder="Enter your name"
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
            />
          </div>

          <MetricRating
            label="Comprehensibility"
            description="How clearly and understandably is the finding explained?"
            value={comprehensibility}
            onChange={setComprehensibility}
          />
          <MetricRating
            label="Relevance"
            description="How relevant and actionable is this finding for the customer?"
            value={relevance}
            onChange={setRelevance}
          />
          <MetricRating
            label="Plausibility"
            description="Does this sound sensible and well-reasoned?"
            value={plausibility}
            onChange={setPlausibility}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eval-notes">Notes (optional)</Label>
            <Textarea
              id="eval-notes"
              placeholder="Any additional comments or observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Evaluation submitted successfully!
            </p>
          )}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || success}>
            {loading ? 'Submitting…' : 'Submit Rating'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
