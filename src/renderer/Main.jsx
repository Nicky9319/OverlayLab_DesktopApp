import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '../store/store'
import MainPage from './Features/main/components/mainPage'
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
            element={<MainPage />}
          />
        </Routes>
      </Router>
    </Provider>
  )
}

export default App
