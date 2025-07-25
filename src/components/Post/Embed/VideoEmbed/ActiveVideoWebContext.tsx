import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {useWindowDimensions} from 'react-native'

import {isNative, isWeb} from '#/platform/detection'

const Context = React.createContext<{
  activeViewId: string | null
  setActiveView: (viewId: string) => void
  sendViewPosition: (viewId: string, y: number) => void
} | null>(null)

export function Provider({children}: {children: React.ReactNode}) {
  if (!isWeb) {
    throw new Error('ActiveVideoWebContext may only be used on web.')
  }

  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const activeViewLocationRef = useRef(Infinity)
  const {height: windowHeight} = useWindowDimensions()

  const allVideoPositionsRef = useRef<Map<string, number>>(new Map())

  // minimising re-renders by using refs
  const manuallySetRef = useRef(false)
  const activeViewIdRef = useRef(activeViewId)
  useEffect(() => {
    activeViewIdRef.current = activeViewId
  }, [activeViewId])

  //APiligrim
  //Periodic check to ensure the most centered video in safe zone is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (manuallySetRef.current) return

      const viewportCenter = windowHeight / 2
      const safeZoneSize = windowHeight * 0.35

      let bestVideoInSafeZone: string | null = null
      let bestDistanceInSafeZone = Infinity

      allVideoPositionsRef.current.forEach((position, viewId) => {
        const distanceFromCenter = Math.abs(position - viewportCenter)

        if (distanceFromCenter < safeZoneSize) {
          if (distanceFromCenter < bestDistanceInSafeZone) {
            bestDistanceInSafeZone = distanceFromCenter
            bestVideoInSafeZone = viewId
          }
        }
      })

      if (
        bestVideoInSafeZone &&
        bestVideoInSafeZone !== activeViewIdRef.current
      ) {
        setActiveViewId(bestVideoInSafeZone)
        activeViewLocationRef.current =
          allVideoPositionsRef.current.get(bestVideoInSafeZone) || Infinity
        manuallySetRef.current = false
      }
    }, 100)

    return () => clearInterval(interval)
  }, [windowHeight])

  const setActiveView = useCallback(
    (viewId: string) => {
      setActiveViewId(viewId)
      manuallySetRef.current = true
      // we don't know the exact position, but it's definitely on screen
      // so just guess that it's in the middle. Any value is fine
      // so long as it's not offscreen
      activeViewLocationRef.current = windowHeight / 2
    },
    [windowHeight],
  )

  const sendViewPosition = useCallback(
    (viewId: string, y: number) => {
      if (isNative) return

      allVideoPositionsRef.current.set(viewId, y)

      const viewportCenter = windowHeight / 2
      const safeZoneSize = windowHeight * 0.35

      let bestVideoInSafeZone: string | null = null
      let bestDistanceInSafeZone = Infinity

      allVideoPositionsRef.current.forEach((position, id) => {
        const distanceFromCenter = Math.abs(position - viewportCenter)

        if (distanceFromCenter < safeZoneSize) {
          if (distanceFromCenter < bestDistanceInSafeZone) {
            bestDistanceInSafeZone = distanceFromCenter
            bestVideoInSafeZone = id
          }
        }
      })

      if (
        bestVideoInSafeZone &&
        bestVideoInSafeZone !== activeViewIdRef.current
      ) {
        setActiveViewId(bestVideoInSafeZone)
        activeViewLocationRef.current =
          allVideoPositionsRef.current.get(bestVideoInSafeZone) || y
        manuallySetRef.current = false
        return
      }

      if (viewId === activeViewIdRef.current) {
        activeViewLocationRef.current = y
      } else {
        // APiligrim
        // Check if new video is in the safe zone around viewport center

        const viewportCenter = windowHeight / 2
        const safeZoneSize = windowHeight * 0.35

        const newVideoInSafeZone = Math.abs(y - viewportCenter) < safeZoneSize
        const currentVideoInSafeZone =
          Math.abs(activeViewLocationRef.current - viewportCenter) <
          safeZoneSize

        if (newVideoInSafeZone && !currentVideoInSafeZone) {
          setActiveViewId(viewId)
          activeViewLocationRef.current = y
          manuallySetRef.current = false
          return
        }

        //APiligrim
        // If both videos are in safe zone, always prefer the one closest to center
        // This ensures the most centered video stays active
        if (newVideoInSafeZone && currentVideoInSafeZone) {
          if (
            distanceToCenter(y) <
            distanceToCenter(activeViewLocationRef.current)
          ) {
            setActiveViewId(viewId)
            activeViewLocationRef.current = y
            manuallySetRef.current = false
          }
          return
        }

        // APiligrim
        // Normal logic for videos outside safe zone
        if (
          distanceToCenter(y) < distanceToCenter(activeViewLocationRef.current)
        ) {
          // if the old view was manually set, only usurp if the old view is offscreen
          if (
            manuallySetRef.current &&
            withinViewport(activeViewLocationRef.current)
          ) {
            return
          }

          setActiveViewId(viewId)
          activeViewLocationRef.current = y
          manuallySetRef.current = false
        }
      }

      function distanceToCenter(yPos: number) {
        return Math.abs(yPos - windowHeight / 2)
      }

      function withinViewport(yPos: number) {
        return yPos > 0 && yPos < windowHeight
      }
    },
    [windowHeight],
  )

  const value = useMemo(
    () => ({
      activeViewId,
      setActiveView,
      sendViewPosition,
    }),
    [activeViewId, setActiveView, sendViewPosition],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useActiveVideoWeb() {
  const context = React.useContext(Context)
  if (!context) {
    throw new Error(
      'useActiveVideoWeb must be used within a ActiveVideoWebProvider',
    )
  }

  const {activeViewId, setActiveView, sendViewPosition} = context
  const id = useId()

  return {
    active: activeViewId === id,
    setActive: () => {
      setActiveView(id)
    },
    currentActiveView: activeViewId,
    sendPosition: (y: number) => sendViewPosition(id, y),
  }
}
