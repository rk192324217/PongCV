import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home        from './pages/Home.jsx'
import Game        from './pages/Game.jsx'
import Login       from './pages/Login.jsx'
import Register    from './pages/Register.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Profile     from './pages/Profile.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/register"    element={<Register />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile/:username" element={<Profile />} />

        {/* ProtectedRoute redirects to /login if not authenticated */}
        {/* <Route element={<ProtectedRoute />}>
          <Route path="/game" element={<Game />} />
        </Route> */}
        <Route path="/game" element={<Game />} />
      </Routes>
    </BrowserRouter>
  )
}
