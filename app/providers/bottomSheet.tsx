'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { BottomSheetPosition } from '../types'

interface BottomSheetContextType {
  position: BottomSheetPosition
  setPosition: (position: BottomSheetPosition) => void
  sheetTop: number
  setSheetTop: (top: number) => void
}

const BottomSheetContext = createContext<BottomSheetContextType>({
  position: 'middle',
  setPosition: () => {},
  sheetTop: 0,
  setSheetTop: () => {},
})

interface BottomSheetProviderProps {
  children: ReactNode
  initialPosition?: BottomSheetPosition
}

export function BottomSheetProvider({ children }: BottomSheetProviderProps) {
  const [position, setPosition] = useState<BottomSheetPosition>('middle')
  const [sheetTop, setSheetTop] = useState<number>(0)

  return (
    <BottomSheetContext.Provider
      value={{ position, setPosition, sheetTop, setSheetTop }}
    >
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
