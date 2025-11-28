import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { initializeTokenProvider } from './clerkTokenProvider'

/**
 * Component that initializes the token provider with Clerk's getToken function
 * This should be rendered inside a ClerkProvider
 */
export function TokenProviderInitializer({ children }) {
  const { getToken } = useAuth()

  useEffect(() => {
    if (getToken) {
      // Initialize the token provider with Clerk's getToken function
      initializeTokenProvider(getToken)
      console.log('Token provider initialized with Clerk getToken')
    } else {
      console.warn('TokenProviderInitializer: getToken not available from useAuth')
    }
  }, [getToken])

  return children
}

export default TokenProviderInitializer

