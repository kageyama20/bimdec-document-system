import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ClientDashboard from './pages/client/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminEmail from './pages/admin/Email';

/* The document generator pulls in html2pdf and its own ~580-line stylesheet.
   Splitting it out keeps both off every other route. */
const AdminDocuments = lazy(() => import('./pages/admin/documents/DocumentsPage'));

export default function App() {
  return (
    <Suspense fallback={<div className="stage" />}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/email" element={<AdminEmail />} />
        </Route>

        <Route element={<ProtectedRoute role="client" />}>
          <Route path="/client" element={<ClientDashboard />} />
        </Route>

        {/* Old bookmarks from the static-HTML site. */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/login.html" element={<NavigateKeepingQuery to="/login" />} />
        <Route path="/signup.html" element={<Navigate to="/signup" replace />} />
        <Route path="/admin/dashboard.html" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/documents.html" element={<Navigate to="/admin/documents" replace />} />
        <Route path="/admin/users.html" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/email.html" element={<Navigate to="/admin/email" replace />} />
        <Route path="/client/dashboard.html" element={<Navigate to="/client" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/* /login.html?role=admin has to keep its query string — that's what preselects
   the Client/Admin tab from the welcome page's two hero cards. */
function NavigateKeepingQuery({ to }) {
  return <Navigate to={{ pathname: to, search: window.location.search }} replace />;
}
