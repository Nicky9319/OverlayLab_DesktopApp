import React, { useEffect } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { store } from './store/store'
import MainPage from './Features/main/components/mainPage'
import { setOverlayType } from './store/slices/overlayTypeSlice'
// import AuthPage from './Features/auth/components/authPage'



function AppContent() {
  const dispatch = useDispatch();
  const isVisible = useSelector((state) => state.visibility.isVisible)

  // Load overlay type from persistent storage on mount
  useEffect(() => {
    const loadOverlayType = async () => {
      if (window.widgetAPI && window.widgetAPI.getOverlayType) {
        try {
          const result = await window.widgetAPI.getOverlayType();
          if (result && result.success && result.overlayType) {
            dispatch(setOverlayType(result.overlayType));
          }
        } catch (error) {
          console.error('Failed to load overlay type:', error);
        }
      }
    };
    loadOverlayType();

    // Listen for overlay type from main process
    if (window.widgetAPI && window.widgetAPI.onEventFromMain) {
      const handleEvent = (event, data) => {
        if (data && data.eventName === 'overlay:setOverlayType') {
          dispatch(setOverlayType(data.payload));
        }
      };
      window.widgetAPI.onEventFromMain(handleEvent);
    }
  }, [dispatch]);

  if (!isVisible) {
    return <div className="app-container">Components are hidden</div>
  }

  return (
    <div className="app-container">
      <Router>
        <Routes>
          <Route
            path="/"
            element={<MainPage />}
          />
        </Routes>
      </Router>
    </div>
  )
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}

export default App
