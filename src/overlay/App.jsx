import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider, useSelector } from 'react-redux'
import { store } from './store/store'
import MainPage from './Features/main/components/mainPage'
// import AuthPage from './Features/auth/components/authPage'



function AppContent() {
  const isVisible = useSelector((state) => state.visibility.isVisible)

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
