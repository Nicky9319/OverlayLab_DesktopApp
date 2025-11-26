import './Features/common/assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Overlay from '../overlay/overlay.jsx'
import Main from './Main.jsx'

import { API_CONFIG } from '../config/api.js'
import { ClerkProvider } from '@clerk/clerk-react'



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
          <Overlay />
        </ClerkProvider>
      </StrictMode>
    )
  });
} else {
  // Load main app
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <Main />
      </ClerkProvider>
    </StrictMode>
  )
}
