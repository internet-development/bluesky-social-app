import {act, renderHook} from '@testing-library/react-native'
import type React from 'react'

import {
  Provider,
  useAutoLikeOwnPosts,
  useSetAutoLikeOwnPosts,
} from '../../../src/state/preferences/auto-like-own-posts'

// Mock the persisted storage
jest.mock('#/state/persisted', () => ({
  get: jest.fn(() => false),
  write: jest.fn(),
  onUpdate: jest.fn(() => () => {}),
  defaults: {
    autoLikeOwnPosts: false,
  },
}))

const TestWrapper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <Provider>{children}</Provider>
)

describe('auto-like-own-posts preferences', () => {
  it('should return default value of false', () => {
    const {result} = renderHook(() => useAutoLikeOwnPosts(), {
      wrapper: TestWrapper,
    })

    expect(result.current).toBe(false)
  })

  it('should allow setting auto-like preference', () => {
    const {result} = renderHook(
      () => ({
        autoLikeOwnPosts: useAutoLikeOwnPosts(),
        setAutoLikeOwnPosts: useSetAutoLikeOwnPosts(),
      }),
      {
        wrapper: TestWrapper,
      },
    )

    act(() => {
      result.current.setAutoLikeOwnPosts(true)
    })

    expect(result.current.autoLikeOwnPosts).toBe(true)
  })

  it('should allow disabling auto-like preference', () => {
    const {result} = renderHook(
      () => ({
        autoLikeOwnPosts: useAutoLikeOwnPosts(),
        setAutoLikeOwnPosts: useSetAutoLikeOwnPosts(),
      }),
      {
        wrapper: TestWrapper,
      },
    )

    // First set to true
    act(() => {
      result.current.setAutoLikeOwnPosts(true)
    })

    // Then set to false
    act(() => {
      result.current.setAutoLikeOwnPosts(false)
    })

    expect(result.current.autoLikeOwnPosts).toBe(false)
  })
})
