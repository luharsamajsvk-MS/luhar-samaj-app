import React, { useState, useEffect } from 'react';
import { Container, Button, Grid, Card, CardContent, Typography, TextField, CircularProgress } from '@mui/material';
import api from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'manager' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post('/users', newUser);
      setNewUser({ email: '', password: '', role: 'manager' });
      fetchUsers();
      alert('User created successfully!');
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Failed to create user');
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>Create New User</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Role"
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              SelectProps={{ native: true }}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleCreateUser}
              sx={{ height: '100%' }}
            >
              Create
            </Button>
          </Grid>
        </Grid>
      </Card>

      {loading ? (
        <CircularProgress />
      ) : users.length === 0 ? (
        <Typography>No users found</Typography>
      ) : (
        <Grid container spacing={2}>
          {users.map((user) => (
            <Grid item xs={12} sm={6} md={4} key={user._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{user.email}</Typography>
                  <Typography>Role: {user.role}</Typography>
                  <Typography>
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Users;