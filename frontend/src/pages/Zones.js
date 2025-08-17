import React, { useState, useEffect } from 'react';
import {
  Container, Button, Grid, Card, CardContent, Typography, CircularProgress
} from '@mui/material';
import ZoneForm from '../components/ZoneForm';
import api from '../services/api';
import ZonePeopleDialog from '../components/zonePeopleDialog';
import { getPeopleByZone } from '../services/peopleService';

function Zones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  // People dialog state
  const [openPeopleDialog, setOpenPeopleDialog] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState(null);
  const [people, setPeople] = useState([]);
  const [peopleZoneName, setPeopleZoneName] = useState('');

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await api.get('/zones');
      setZones(response.data);
    } catch (err) {
      console.error('Error fetching zones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPeople = async (zone) => {
    setPeople([]);
    setPeopleError(null);
    setPeopleZoneName(zone.name);
    setOpenPeopleDialog(true);
    setPeopleLoading(true);
    try {
      const list = await getPeopleByZone(zone._id);
      setPeople(list);
    } catch (err) {
      console.error('Error fetching people:', err);
      setPeopleError(err?.message || 'Failed to load people');
    } finally {
      setPeopleLoading(false);
    }
  };

  // 🔹 Sticker PDF generation
  const handleGenerateStickers = async (zone) => {
    try {
      const res = await api.get(`/zones/${zone._id}/stickers`, {
        responseType: 'blob', // expect a file
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stickers_${zone.name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Sticker generation failed:', err);
      alert('Failed to generate stickers');
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Zone Management
      </Typography>

      <Button
        variant="outlined"
        color="primary"
        sx={{ mb: 3 }}
        onClick={() => {
          setSelectedZone(null);
          setShowForm(true);
        }}
      >
        Add New Zone
      </Button>

      {showForm && (
        <ZoneForm
          zone={selectedZone}
          onClose={() => {
            setShowForm(false);
            setSelectedZone(null);
          }}
          onSave={() => {
            setShowForm(false);
            fetchZones();
          }}
        />
      )}

      {loading ? (
        <CircularProgress />
      ) : zones.length === 0 ? (
        <Typography>No zones found</Typography>
      ) : (
        <Grid container spacing={2}>
          {zones.map((zone) => (
            <Grid item xs={12} sm={6} md={4} key={zone._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{zone.name}</Typography>
                  <Typography>Zone Number: {zone.number}</Typography>
                  <Typography>Total People: {zone.totalPeople}</Typography>

                  <Button
                    size="small"
                    color="secondary"
                    sx={{ mt: 1, mr: 1 }}
                    onClick={() => handleViewPeople(zone)}
                  >
                    View People
                  </Button>

                  {/* 🔹 NEW Sticker Button */}
                  <Button
                    size="small"
                    color="success"
                    sx={{ mt: 1, mr: 1 }}
                    onClick={() => handleGenerateStickers(zone)}
                  >
                    Generate Stickers
                  </Button>

                  <Button
                    size="small"
                    color="primary"
                    sx={{ mt: 1, mr: 1 }}
                    onClick={() => {
                      setSelectedZone(zone);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    size="small"
                    color="error"
                    sx={{ mt: 1 }}
                    onClick={async () => {
                      if (window.confirm('Delete this zone?')) {
                        try {
                          await api.delete(`/zones/${zone._id}`);
                          fetchZones();
                        } catch (err) {
                          console.error('Delete failed:', err);
                          alert('Cannot delete zone with members assigned');
                        }
                      }
                    }}
                  >
                    Delete
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <ZonePeopleDialog
        open={openPeopleDialog}
        onClose={() => setOpenPeopleDialog(false)}
        zoneName={peopleZoneName}
        loading={peopleLoading}
        people={people}
        error={peopleError}
      />
    </Container>
  );
}

export default Zones;
