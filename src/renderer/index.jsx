import './Features/common/assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import Overlay from '../overlay/overlay.jsx'
import Main from './Main.jsx'
import AuthPage from './Features/auth/components/AuthPage.jsx'
import TokenProviderInitializer from '../utils/TokenProviderInitializer.jsx'

import { API_CONFIG } from '../config/api.js'
import { ClerkProvider } from '@clerk/clerk-react'

// Wrapper component to provide navigation to ClerkProvider
function ClerkProviderWithRouter({ children, publishableKey }) {
  const navigate = useNavigate();
  
  return (
    <ClerkProvider 
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}



// Check if this is a widget request or setup request
const urlParams = new URLSearchParams(window.location.search);
const windowName = urlParams.get('windowName');
const PUBLISHABLE_KEY = API_CONFIG.CLERK_PUBLISHABLE_KEY;

console.log('Window Name:', windowName);

if (windowName === 'overlay-window') {
  // Load widget components
  import('../overlay/overlay.jsx').then(({ default: WidgetApp }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <TokenProviderInitializer>
            <Overlay />
          </TokenProviderInitializer>
        </ClerkProvider>
      </StrictMode>
    )
  });
} else if (windowName === 'auth-window') {
  // Load auth page with routing support
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <ClerkProviderWithRouter publishableKey={PUBLISHABLE_KEY}>
          <AuthPage />
        </ClerkProviderWithRouter>
      </BrowserRouter>
    </StrictMode>
  )
} else {
  // Load main app
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <TokenProviderInitializer>
          <Main />
        </TokenProviderInitializer>
      </ClerkProvider>
    </StrictMode>
  )
}
