import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Zones from './pages/Zones';
import Users from './pages/Users';
import Home from './pages/Home';

// Theme config
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

// PrivateRoute wrapper
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token'); // adapt to your auth system
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Header />
        <Routes>
          {/* Landing page with only Login button */}
          <Route path="/" element={<Home />} />

          {/* Login route */}
          <Route path="/login" element={<Login />} />

          {/* Admin-only routes */}
          <Route
            path="/dashboard"
            element={<PrivateRoute><Dashboard /></PrivateRoute>}
          />
          <Route
            path="/members"
            element={<PrivateRoute><Members /></PrivateRoute>}
          />
          <Route
            path="/zones"
            element={<PrivateRoute><Zones /></PrivateRoute>}
          />
          <Route
            path="/users"
            element={<PrivateRoute><Users /></PrivateRoute>}
          />

          {/* Redirect everything else to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
