import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  TextField, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Box
} from '@mui/material';
import { Add, Search, Close } from '@mui/icons-material';
import MemberCard from '../components/MemberCard';
import MemberForm from '../components/MemberForm';
import { 
  getMembers, 
  createMember, 
  updateMember, 
  deleteMember 
} from '../services/memberService';
import { getZones } from '../services/zoneService';
import api from '../services/api';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [generatingPdfId, setGeneratingPdfId] = useState(null);

  useEffect(() => {
    loadMembers();
    loadZones();
  }, []);

  useEffect(() => {
    const results = members.filter(member => {
      const searchLower = searchTerm.toLowerCase();
      return (
        member.headName?.toLowerCase().includes(searchLower) ||
        member.rationNo?.toLowerCase().includes(searchLower) ||
        member.mobile?.toLowerCase().includes(searchLower) ||
        member.address?.toLowerCase().includes(searchLower) ||
        member.uniqueNumber?.toLowerCase().includes(searchLower) ||
        (member.zone?.name && member.zone.name.toLowerCase().includes(searchLower))
      );
    });
    setFilteredMembers(results);
  }, [searchTerm, members]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await getMembers();
      setMembers(response);
      setFilteredMembers(response);
    } catch (err) {
      showSnackbar('સભ્યો મેળવવામાં નિષ્ફળ: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      setLoadingZones(true);
      const response = await getZones();
      setZones(response);
    } catch (err) {
      showSnackbar('ઝોન મેળવવામાં નિષ્ફળ: ' + (err.message || ''), 'error');
    } finally {
      setLoadingZones(false);
    }
  };

  const handleGenerateCard = async (memberId) => {
    try {
      setGeneratingPdfId(memberId);

      const res = await api.get(`/members/${memberId}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });

      // Create blob URL
      const url = URL.createObjectURL(blob);

      // Open in browser PDF viewer (preview + download option)
      const newWindow = window.open(url, "_blank");

      // Cleanup memory
      if (newWindow) {
        newWindow.onbeforeunload = () => URL.revokeObjectURL(url);
      } else {
        // fallback in case popup is blocked
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (err) {
      console.error("PDF પૂર્વદર્શન નિષ્ફળ થયું:", err);
      showSnackbar(`PDF પૂર્વદર્શન નિષ્ફળ થયું: ${err.message}`, "error");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleAddMember = () => {
    setCurrentMember(null);
    setOpenDialog(true);
  };

  const handleEditMember = (member) => {
    setCurrentMember(member);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setCurrentMember(null);
    setOpenDialog(false);
  };

  const handleSubmit = async (formData) => {
    try {
      if (formData._id) {
        await updateMember(formData._id, formData);
        showSnackbar('સભ્ય સફળતાપૂર્વક અપડેટ થયો', 'success');
      } else {
        await createMember(formData);
        showSnackbar('સભ્ય સફળતાપૂર્વક ઉમેરાયો', 'success');
      }
      await loadMembers();
      handleCloseDialog();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'સભ્ય સાચવવામાં નિષ્ફળ';
      showSnackbar(message, 'error');
      throw err;
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('શું તમે આ સભ્યને કાઢી નાખવા ઈચ્છો છો?')) return;
    
    try {
      await deleteMember(memberId);
      showSnackbar('સભ્ય કાઢી નાખવામાં આવ્યો', 'success');
      await loadMembers();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'સભ્ય કાઢવામાં નિષ્ફળ';
      showSnackbar(message, 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <TextField
          variant="outlined"
          placeholder="સભ્યો શોધો..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
            endAdornment: searchTerm && (
              <IconButton size="small" onClick={() => setSearchTerm('')}>
                <Close fontSize="small" />
              </IconButton>
            )
          }}
          sx={{ width: 300 }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleAddMember}
          disabled={loadingZones}
        >
          સભ્ય ઉમેરો
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredMembers.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          {searchTerm ? 'કોઈ મેળ ખાતો સભ્ય મળ્યો નથી' : 'કોઈ સભ્યો ઉપલબ્ધ નથી'}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredMembers.map(member => (
            <Grid item xs={12} sm={6} md={4} key={member._id}>
              <MemberCard 
                member={member} 
                onGenerateCard={() => handleGenerateCard(member._id)}
                onEdit={() => handleEditMember(member)}
                onDelete={() => handleDeleteMember(member._id)}
                isGenerating={generatingPdfId === member._id}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {currentMember ? 'સભ્ય સંપાદિત કરો' : 'નવો સભ્ય ઉમેરો'}
        </DialogTitle>
        <DialogContent dividers>
          <MemberForm 
            onSave={handleSubmit}
            zones={zones}
            loadingZones={loadingZones}
            memberToEdit={currentMember}
          />
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
