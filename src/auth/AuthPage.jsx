import { SignIn, SignUp } from '@clerk/clerk-react'
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthTitlebar from './AuthTitlebar.jsx'

function AuthPage() {
  const { isSignedIn, isLoaded, getToken } = useAuth()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Get the session token and send it to main process
      getToken()
        .then((token) => {
          console.log('Authentication successful, sending token to main process')
          // Send IPC message to main process
          if (window.electronAPI && window.electronAPI.sendAuthComplete) {
            window.electronAPI.sendAuthComplete(token)
          } else if (window.electronAPI && window.electronAPI.sendToMain) {
            window.electronAPI.sendToMain('auth-complete', { token })
          } else {
            console.error('electronAPI not available for sending auth token')
          }
        })
        .catch((error) => {
          console.error('Failed to get token:', error)
        })
    }
  }, [isLoaded, isSignedIn, getToken])

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#000000'
      }}>
        <AuthTitlebar />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          paddingTop: '32px',
          color: '#FFFFFF'
        }}>
          Loading...
        </div>
      </div>
    )
  }

  // Clerk appearance configuration matching product theme
  const clerkAppearance = {
    baseTheme: 'dark',
    elements: {
      rootBox: {
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
      card: {
        backgroundColor: '#000000',
        borderColor: '#1C1C1E',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      },
      headerTitle: {
        color: '#FFFFFF',
        fontSize: '24px',
        fontWeight: '600'
      },
      headerSubtitle: {
        color: '#E5E5E7'
      },
      formButtonPrimary: {
        backgroundColor: '#007AFF',
        color: '#FFFFFF',
        '&:hover': {
          backgroundColor: '#0051D5'
        }
      },
      formFieldInput: {
        backgroundColor: '#111111',
        borderColor: '#1C1C1E',
        color: '#FFFFFF',
        '&:focus': {
          borderColor: '#007AFF',
          boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.2)'
        }
      },
      formFieldLabel: {
        color: '#E5E5E7'
      },
      footerActionLink: {
        color: '#007AFF',
        '&:hover': {
          color: '#0051D5'
        }
      },
      identityPreviewText: {
        color: '#FFFFFF'
      },
      identityPreviewEditButton: {
        color: '#007AFF'
      },
      alertText: {
        color: '#FFFFFF'
      },
      alertIcon: {
        color: '#FF3B30'
      },
      dividerLine: {
        backgroundColor: '#1C1C1E'
      },
      dividerText: {
        color: '#8E8E93'
      },
      socialButtonsBlockButton: {
        backgroundColor: '#111111',
        borderColor: '#1C1C1E',
        color: '#FFFFFF',
        '&:hover': {
          backgroundColor: '#1C1C1E'
        }
      },
      formResendCodeLink: {
        color: '#007AFF'
      },
      otpCodeFieldInput: {
        backgroundColor: '#111111',
        borderColor: '#1C1C1E',
        color: '#FFFFFF',
        '&:focus': {
          borderColor: '#007AFF'
        }
      }
    },
    variables: {
      colorPrimary: '#007AFF',
      colorBackground: '#000000',
      colorInputBackground: '#111111',
      colorInputText: '#FFFFFF',
      colorText: '#FFFFFF',
      colorTextSecondary: '#E5E5E7',
      colorTextOnPrimaryBackground: '#FFFFFF',
      colorDanger: '#FF3B30',
      colorSuccess: '#00D09C',
      colorWarning: '#FF9500',
      borderRadius: '8px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000000'
    }}>
      <AuthTitlebar />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingTop: '32px' // Account for titlebar height
      }}>
        <Routes>
        <Route
          path="/sign-in/*"
          element={
            isSignedIn ? (
              <Navigate to="/" replace />
            ) : (
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                appearance={clerkAppearance}
              />
            )
          }
        />
        <Route
          path="/sign-up/*"
          element={
            isSignedIn ? (
              <Navigate to="/" replace />
            ) : (
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                appearance={clerkAppearance}
              />
            )
          }
        />
        <Route
          path="/"
          element={
            isSignedIn ? (
              <div style={{ 
                color: '#FFFFFF', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px'
              }}>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  Authentication successful!
                </div>
                <div style={{ fontSize: '14px', color: '#8E8E93' }}>
                  Closing window...
                </div>
              </div>
            ) : (
              <Navigate to="/sign-in" replace />
            )
          }
        />
        {/* Catch-all route for any unmatched paths - redirect to sign-in */}
        <Route
          path="*"
          element={<Navigate to="/sign-in" replace />}
        />
        </Routes>
      </div>
    </div>
  )
}

export default AuthPage

