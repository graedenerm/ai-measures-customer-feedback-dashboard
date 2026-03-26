'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const EVALUATOR_KEY = 'evaluator_name'

interface EvaluatorContextValue {
  evaluatorName: string
  setEvaluatorName: (name: string) => void
}

const EvaluatorContext = createContext<EvaluatorContextValue>({
  evaluatorName: '',
  setEvaluatorName: () => {},
})

export function EvaluatorProvider({ children }: { children: React.ReactNode }) {
  const [evaluatorName, setEvaluatorNameState] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EVALUATOR_KEY)
      if (stored) setEvaluatorNameState(stored)
    } catch {
      // localStorage may not be available (SSR)
    }
  }, [])

  const setEvaluatorName = (name: string) => {
    setEvaluatorNameState(name)
    try {
      localStorage.setItem(EVALUATOR_KEY, name)
    } catch {
      // ignore
    }
  }

  return (
    <EvaluatorContext.Provider value={{ evaluatorName, setEvaluatorName }}>
      {children}
    </EvaluatorContext.Provider>
  )
}

export function useEvaluator() {
  return useContext(EvaluatorContext)
}
