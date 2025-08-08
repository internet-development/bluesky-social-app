import React from 'react'

import * as persisted from '#/state/persisted'

type StateContext = boolean
type SetContext = (v: boolean) => void

const stateContext = React.createContext<StateContext>(
  Boolean(persisted.defaults.autoLikeOwnPosts),
)
const setContext = React.createContext<SetContext>((_: boolean) => {})

export function Provider({children}: {children: React.ReactNode}) {
  const [state, setState] = React.useState(
    Boolean(persisted.get('autoLikeOwnPosts')),
  )

  const setStateWrapped = React.useCallback(
    (autoLikeOwnPosts: persisted.Schema['autoLikeOwnPosts']) => {
      setState(Boolean(autoLikeOwnPosts))
      persisted.write('autoLikeOwnPosts', autoLikeOwnPosts)
    },
    [setState],
  )

  React.useEffect(() => {
    return persisted.onUpdate('autoLikeOwnPosts', nextAutoLikeOwnPosts => {
      setState(Boolean(nextAutoLikeOwnPosts))
    })
  }, [setStateWrapped])

  return (
    <stateContext.Provider value={state}>
      <setContext.Provider value={setStateWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export const useAutoLikeOwnPosts = () => React.useContext(stateContext)
export const useSetAutoLikeOwnPosts = () => React.useContext(setContext)
