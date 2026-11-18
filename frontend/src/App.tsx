import { Route, Routes } from 'react-router';
import { MENU } from './auth/roles.ts';
import NavBar from './components/NavBar.tsx';
import RequireRole from './components/RequireRole.tsx';
import ComingSoonPage from './pages/ComingSoonPage.tsx';
import HomePage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import NoAccessPage from './pages/NoAccessPage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/no-access" element={<NoAccessPage />} />
        {/* One route per menu item, guarded by the same roles as the menu */}
        {MENU.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={
              <RequireRole roles={item.roles}>
                <ComingSoonPage title={item.label} />
              </RequireRole>
            }
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
