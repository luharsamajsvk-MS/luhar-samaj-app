import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Box,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';

const Header = () => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole'); // 👈 get role
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  // Menu items (Gujarati labels)
  const menuItems = [
    { text: 'હોમ', path: '/' },
    ...(isLoggedIn
      ? [
          { text: 'ડેશબોર્ડ', path: '/dashboard' },
          { text: 'સભ્યો', path: '/members' },
          { text: 'ઝોન', path: '/zones' },
          ...(userRole === 'admin'
            ? [
                { text: 'વિનંતીઓ', path: '/requests' },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {/* Left side - App Name */}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            લુહાર સમાજ મેનેજમેન્ટ
          </Typography>

          {/* Desktop Menu (hidden on xs) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            {menuItems.map((item) => (
              <Button
                key={item.text}
                color="inherit"
                component={Link}
                to={item.path}
              >
                {item.text}
              </Button>
            ))}
            {isLoggedIn && (
              <Button color="inherit" onClick={handleLogout}>
                લોગઆઉટ
              </Button>
            )}
          </Box>

          {/* Mobile Menu Button (hidden on md+) */}
          <IconButton
            edge="end"
            color="inherit"
            sx={{ display: { xs: 'flex', md: 'none' } }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer for mobile */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                component={Link}
                to={item.path}
              >
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
            {isLoggedIn && (
              <ListItem button onClick={handleLogout}>
                <ListItemText primary="લોગઆઉટ" />
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
