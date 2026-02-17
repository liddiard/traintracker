'use client'

import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import { BottomSheetPosition } from '../types'

interface BottomSheetContextType {
  position: BottomSheetPosition
  setPosition: (position: BottomSheetPosition) => void
}

const BottomSheetContext = createContext<BottomSheetContextType>({
  position: 'middle',
  setPosition: () => {},
})

interface BottomSheetProviderProps {
  children: ReactNode
  initialPosition?: BottomSheetPosition
}

export function BottomSheetProvider({ children }: BottomSheetProviderProps) {
  const [position, setPosition] = useState<BottomSheetPosition>('middle')

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ position, setPosition }),
    [position, setPosition],
  )

  return (
    <BottomSheetContext.Provider value={value}>
      {children}
    </BottomSheetContext.Provider>
  )
}

export function useBottomSheet() {
  const context = useContext(BottomSheetContext)
  if (context === undefined) {
    throw new Error('useBottomSheet must be used within a BottomSheetProvider')
  }
  return context
}
