import React, { useEffect, useState } from 'react';
import { 
  Container, Grid, Card, CardContent, Typography, 
  CircularProgress, Alert, Box, useTheme 
} from '@mui/material';
import { 
  People as PeopleIcon, 
  FamilyRestroom as FamilyIcon, 
  Map as MapIcon,
  TrendingUp as TrendingUpIcon,
  Male as MaleIcon,      // <-- ADD THIS
  Female as FemaleIcon
} from '@mui/icons-material';
import { getDashboardData } from '../services/dashboardService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardData();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err.message || 'ડેશબોર્ડ ડેટા લોડ કરવામાં નિષ્ફળ');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Box sx={{ mt: 2 }}>
            <button 
              onClick={() => window.location.reload()}
              style={{ 
                background: theme.palette.primary.main,
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ફરી પ્રયત્ન કરો
            </button>
          </Box>
        </Alert>
      </Container>
    );
  }

  // Stats card component
  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ 
      height: '100%', 
      boxShadow: theme.shadows[3],
      transition: 'transform 0.3s',
      '&:hover': { transform: 'translateY(-5px)' }
    }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box display="flex" alignItems="center" mb={1.5}>
          <Box 
            sx={{ 
              backgroundColor: `${color}.light`, 
              borderRadius: '50%', 
              width: 48, 
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2
            }}
          >
            {React.cloneElement(icon, { 
              fontSize: 'medium', 
              sx: { color: `${color}.dark` } 
            })}
          </Box>
          <Typography 
            variant="subtitle1" 
            sx={{ fontWeight: 600 }}
            color="text.secondary"
          >
            {title}
          </Typography>
        </Box>
        <Box flexGrow={1} display="flex" alignItems="flex-end">
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ fontWeight: 700 }}
          >
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }} 
        mb={4}
        gap={2}
      >
        <Typography 
          variant="h4" 
          sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' } }}
        >
          સમાજ ડેશબોર્ડ
        </Typography>
        <Box display="flex" alignItems="center">
          <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle2" color="primary">
            છેલ્લે અપડેટ થયેલ: આજે
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      {/* Stats Cards */}
      <Box 
        display="flex" 
        mb={4} 
        gap={3} // This is your spacing
        sx={{
          flexDirection: { xs: 'column', sm: 'row' }, // Column on XS, row on SM and up
          flexWrap: { sm: 'wrap', md: 'nowrap' }     // Allow wrap on SM, but force single line on MD
        }}
      >
        {/*           On MD screens, flexBasis 'auto' + flexGrow 1 = all 5 items share the space equally.
          On SM screens, flexBasis '40%' allows 2 items per row.
        */}
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: '40%', md: 'auto' } }}>
          <StatCard 
            title="કુલ કુટુંબો" 
            value={stats.totalMembers} 
            icon={<FamilyIcon />} 
            color="primary" 
          />
        </Box>
     <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: '40%', md: 'auto' } }}>
          <StatCard 
            title="કુલ લોકો" 
            value={stats.totalPeople} 
            icon={<PeopleIcon />} 
            color="secondary" 
          />
        </Box>
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: '40%', md: 'auto' } }}>
          <StatCard 
            title="કુલ પુરુષ" 
            value={stats.totalMales} 
            icon={<MaleIcon />} 
            color="info" 
          />
        </Box>
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: '40%', md: 'auto' } }}>
          <StatCard 
            title="કુલ સ્ત્રી" 
            value={stats.totalFemales} 
            icon={<FemaleIcon />} 
            color="warning" 
          />
        </Box>
        <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', sm: '40%', md: 'auto' } }}>
          <StatCard 
            title="ઝોન" 
            value={stats.totalZones} 
            icon={<MapIcon />} 
            color="success" 
          />
        </Box>
      </Box>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: theme.shadows[3], height: '100%' }}>
            <CardContent>
              <Typography variant="h6" mb={2}>ઝોન પ્રમાણે લોકોનું વિતરણ</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.zoneDistribution || []}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="totalPeople" 
                    fill={theme.palette.primary.main} 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
