import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { store } from '../store/store'
import MainPage from './Features/main/components/mainPage'
import LogoutPage from '../auth/LogoutPage'
import './Features/common/assets/main.css'
// import AuthPage from './Features/auth/components/authPage'



function App() {
  // Example function to determine which route to show


  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <SignedIn>
                  <MainPage />
                </SignedIn>
                <SignedOut>
                  <LogoutPage />
                </SignedOut>
              </>
            }
          />
        </Routes>
      </Router>
    </Provider>
  )
}

export default App
