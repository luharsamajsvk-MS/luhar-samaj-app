import React, { useState, useEffect } from 'react';
import { TextField, Button, Box } from '@mui/material';
import api from '../services/api';

const ZoneForm = ({ zone, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    number: '',
    name: ''
  });

  // Pre-fill when editing
  useEffect(() => {
    if (zone) {
      setFormData({
        number: zone.number || '',
        name: zone.name || ''
      });
    }
  }, [zone]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (zone && zone._id) {
        // Update existing zone
        await api.put(`/zones/${zone._id}`, formData);
      } else {
        // Create new zone
        await api.post('/zones', formData);
      }
      onSave();
      onClose();
      // Reset after save
      setFormData({ number: '', name: '' });
    } catch (err) {
      console.error('Error saving zone:', err.response?.data || err.message);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
      <TextField
  fullWidth
  margin="normal"
  label="Zone Number"
  name="number"
  value={formData.number}
  onChange={handleChange}
  required
  autoComplete="off" // <-- prevents autofill
/>
<TextField
  fullWidth
  margin="normal"
  label="Zone Name"
  name="name"
  value={formData.name}
  onChange={handleChange}
  required
  autoComplete="off" // <-- prevents autofill
/>

      <Button type="submit" variant="contained" sx={{ mt: 2, mr: 1 }}>
        Save Zone
      </Button>
      <Button variant="outlined" onClick={onClose} sx={{ mt: 2 }}>
        Cancel
      </Button>
    </Box>
  );
};

export default ZoneForm;
