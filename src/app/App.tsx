import { lazy, Suspense } from 'react';
import { createHashRouter, createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';
import { config } from '../config';
import { AuthProvider, useAuth } from './auth';
import { ToastProvider } from '../ui/toast';
import { Shell } from './Shell';
import { Login } from '../features/login/Login';
import { Chats } from '../features/chats/Chats';
import { Spinner } from '../ui/kit';

const Agenda = lazy(() => import('../features/agenda/Agenda'));
const Pulse = lazy(() => import('../features/pulse/Pulse'));
const Money = lazy(() => import('../features/money/Money'));

function Gate() {
  const { signedIn } = useAuth();
  return signedIn ? <Shell /> : <Navigate to="/login" replace />;
}
function LoginRoute() {
  const { signedIn } = useAuth();
  return signedIn ? <Navigate to="/chats" replace /> : <Login />;
}
const Lazy = ({ children }: { children: React.ReactNode }) => <Suspense fallback={<div className="page" style={{ display: 'grid', placeItems: 'center' }}><Spinner /></div>}>{children}</Suspense>;

const routes = [{
  element: <AuthProvider><ToastProvider><Outlet /></ToastProvider></AuthProvider>,
  children: [
    { path: '/login', element: <LoginRoute /> },
    {
      path: '/', element: <Gate />, children: [
        { index: true, element: <Navigate to="/chats" replace /> },
        { path: 'chats', element: <Chats /> },
        { path: 'chats/:id', element: <Chats /> },
        { path: 'agenda', element: <Lazy><Agenda /></Lazy> },
        { path: 'pulse', element: <Lazy><Pulse /></Lazy> },
        { path: 'money', element: <Lazy><Money /></Lazy> },
        { path: '*', element: <Navigate to="/chats" replace /> }
      ]
    }
  ]
}];
const router = config.router === 'hash' ? createHashRouter(routes) : createBrowserRouter(routes, { basename: config.basePath.replace(/\/$/, '') || '/' });

export function App() {
  return <RouterProvider router={router} />;
}
