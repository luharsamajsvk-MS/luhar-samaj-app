import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../services/api';

export default function Reports() {
  const [stats, setStats] = useState({
    totalFamilies: 0,
    totalMembers: 0,
    zoneDistribution: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/reports');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to load reports:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Community Reports</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6">Summary</Typography>
            <Typography>Total Families: {stats.totalFamilies}</Typography>
            <Typography>Total Members: {stats.totalMembers}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Zone Distribution</Typography>
            <BarChart width={400} height={300} data={stats.zoneDistribution}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#1976d2" />
            </BarChart>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}