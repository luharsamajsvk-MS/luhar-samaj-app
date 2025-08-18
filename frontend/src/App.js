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
import Requests from './pages/Requests'; // ✅ Keep requests

// Theme config with responsive typography
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: {
    fontSize: 14,
    h6: {
      fontSize: '1.1rem',
      '@media (min-width:600px)': {
        fontSize: '1.25rem',
      },
      [createTheme().breakpoints.up('md')]: {
        fontSize: '1.5rem',
      },
    },
  },
});

// 🔒 PrivateRoute wrapper with role support
const PrivateRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole'); // e.g., "admin" or "user"

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />; // redirect non-admins
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {/* Header is global */}
        <Header />

        {/* Responsive content wrapper */}
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
              {/* Landing page with Login + Request button */}
              <Route path="/" element={<Home />} />

              {/* Public request form */}
              <Route path="/request" element={<RequestForm />} />

              {/* Login route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
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

              {/* Admin-only requests page */}
              <Route
                path="/requests"
                element={
                  <PrivateRoute requiredRole="admin">
                    <Requests />
                  </PrivateRoute>
                }
              />

              {/* Redirect everything else to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
