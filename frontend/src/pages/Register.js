// frontend/src/pages/Register.js
import React, { useState } from 'react';
import {
  Container, Paper, Typography, Grid, TextField, Button, Box, Alert
} from '@mui/material';
import { submitPublicRequest } from '../services/requestService';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    headName: '',
    rationNo: '',
    address: '',
    mobile: '',
    zone: '',             // Zone ObjectId (we can enhance with a dropdown later)
    familyMembers: '',    // comma-separated: "Name|Relation|Age, Name2|Relation2|Age2"
  });
  const [status, setStatus] = useState({ loading: false, success: '', error: '' });

  const parseFamilyMembers = (raw) => {
    if (!raw.trim()) return [];
    return raw.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(item => {
        const [name, relation, age] = item.split('|').map(x => (x || '').trim());
        return { name, relation, age: Number(age) || undefined };
      });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: '', error: '' });
    try {
      // Build payload similar to Member schema (without uniqueNumber)
      const payload = {
        headName: form.headName,
        rationNo: form.rationNo,
        address: form.address,
        mobile: form.mobile,
        zone: form.zone,
        familyMembers: parseFamilyMembers(form.familyMembers),
      };
      await submitPublicRequest(payload);
      setStatus({ loading: false, success: 'Request submitted! An admin will review it.', error: '' });
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setStatus({ loading: false, success: '', error: err?.response?.data?.error || 'Failed to submit request' });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Member Registration Request (Public)
        </Typography>

        {status.success && <Alert severity="success" sx={{ mb: 2 }}>{status.success}</Alert>}
        {status.error && <Alert severity="error" sx={{ mb: 2 }}>{status.error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Head Name" name="headName" value={form.headName} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Ration No" name="rationNo" value={form.rationNo} onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" name="address" value={form.address} onChange={handleChange} fullWidth required multiline />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Mobile" name="mobile" value={form.mobile} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Zone (ID)"
                name="zone"
                value={form.zone}
                onChange={handleChange}
                helperText="Enter Zone ObjectId (we can add a dropdown later)"
                fullWidth required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Family Members"
                name="familyMembers"
                value={form.familyMembers}
                onChange={handleChange}
                fullWidth
                helperText={`Format: "Name|Relation|Age, Name2|Relation2|Age2"`}
              />
            </Grid>

            <Grid item xs={12}>
              <Button type="submit" variant="contained" disabled={status.loading}>
                {status.loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}
