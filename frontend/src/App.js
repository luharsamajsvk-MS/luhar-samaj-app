import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';

import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Zones from './pages/Zones';
import Home from './pages/Home';
import RequestForm from './pages/RequestForm';
import Requests from './pages/Requests';
import AuditLogsPage from "./pages/AuditLogsPage";
import DeletedMembers from "./pages/DeletedMembers"; // ✅ --- IMPORT NEW PAGE ---

// Theme config with responsive typography
const theme = createTheme({
  // ... (theme config as before)
});

// 🔒 PrivateRoute wrapper (admin-only by default)
const PrivateRoute = ({ children }) => {
  // ... (PrivateRoute logic as before)
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Header />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 3,
            px: { xs: 1, sm: 2, md: 3 },
          }}
        >
          <Container maxWidth="xl">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/request" element={<RequestForm />} />

              {/* Admin-only routes */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/members"
                element={
                  <PrivateRoute>
                    <Members />
                  </PrivateRoute>
                }
              />
              <Route
                path="/zones"
                element={
                  <PrivateRoute>
                    <Zones />
                  </PrivateRoute>
                }
              />
              <Route
                path="/requests"
                element={
                  <PrivateRoute>
                    <Requests />
                  </PrivateRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <PrivateRoute>
                    <AuditLogsPage />
                  </PrivateRoute>
                }
              />

              {/* ✅ --- ADD NEW ROUTE --- */}
              <Route
                path="/deleted-members"
                element={
                  <PrivateRoute>
                    <DeletedMembers />
                  </PrivateRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;