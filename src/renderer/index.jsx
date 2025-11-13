import './Features/common/assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Check if this is a widget request or setup request
const urlParams = new URLSearchParams(window.location.search);
const isWidget = urlParams.get('widget') === 'true';

console.log('MAIN RENDERER INDEX.JSX LOADED!', isWidget ? 'WIDGET MODE' : 'MAIN APP MODE');

if (isWidget) {
  // Load widget components
  import('../overlay/widget-main.jsx').then(({ default: WidgetApp }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <WidgetApp />
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
