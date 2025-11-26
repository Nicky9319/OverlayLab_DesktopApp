import './Features/common/assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Overlay from '../overlay/overlay.jsx'
import App from './App'

// Check if this is a widget request or setup request
const urlParams = new URLSearchParams(window.location.search);
const windowName = urlParams.get('windowName');


console.log('Window Name:', windowName);

if (windowName === 'overlay-window') {
  // Load widget components
  import('../overlay/overlay.jsx').then(({ default: WidgetApp }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <Overlay />
      </StrictMode>
    )
  });
} else {
  // Load main app
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
