import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { CallController } from './call-controller'

const CallControllerContext = createContext<CallController | null>(null)

type CallControllerProviderProps = {
  children: ReactNode
  controller: CallController
}

export function CallControllerProvider({
  children,
  controller,
}: CallControllerProviderProps) {
  return (
    <CallControllerContext.Provider value={controller}>{children}</CallControllerContext.Provider>
  )
}

export function useCallController() {
  const controller = useContext(CallControllerContext)

  if (!controller) {
    throw new Error('Call controller not found.')
  }

  return controller
}
