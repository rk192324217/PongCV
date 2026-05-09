import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

// ProtectedRoute wraps routes that require login.
// <Outlet /> renders the child route if authenticated.
// <Navigate /> redirects to /login if not.
//
// In App.jsx:
//   <Route element={<ProtectedRoute />}>
//     <Route path="/game" element={<Game />} />
//   </Route>
export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
