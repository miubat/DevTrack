import { Route, Routes } from 'react-router';
import { MENU } from './auth/roles.ts';
import NavBar from './components/NavBar.tsx';
import PasswordChangeGate, {
  SET_PASSWORD_PATH,
} from './components/PasswordChangeGate.tsx';
import RequireRole from './components/RequireRole.tsx';
import ComingSoonPage from './pages/ComingSoonPage.tsx';
import HomePage from './pages/HomePage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import NoAccessPage from './pages/NoAccessPage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import SetPasswordPage from './pages/SetPasswordPage.tsx';
import UsersPage from './pages/UsersPage.tsx';

// Menu pages that are built; the others show "Coming soon".
const PAGES: Record<string, () => React.JSX.Element> = {
  '/admin/users': UsersPage, // AGL-08.5
};

function App() {
  return (
    <>
      <NavBar />
      <PasswordChangeGate>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path={SET_PASSWORD_PATH} element={<SetPasswordPage />} />
          <Route path="/no-access" element={<NoAccessPage />} />
          {/* One route per menu item, guarded by the same roles as the menu */}
          {MENU.map((item) => {
            const Page = PAGES[item.path];
            return (
              <Route
                key={item.path}
                path={item.path}
                element={
                  <RequireRole roles={item.roles}>
                    {Page ? <Page /> : <ComingSoonPage title={item.label} />}
                  </RequireRole>
                }
              />
            );
          })}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PasswordChangeGate>
    </>
  );
}

export default App;
