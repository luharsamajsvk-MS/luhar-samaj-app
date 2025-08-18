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

  // Fetch members and zones on mount
  useEffect(() => {
    loadMembers();
    loadZones();
  }, []);

  // Filter members by search
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
      showSnackbar('Failed to fetch members: ' + (err.message || ''), 'error');
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
      showSnackbar('Failed to fetch zones: ' + (err.message || ''), 'error');
    } finally {
      setLoadingZones(false);
    }
  };

  const handleGenerateCard = async (memberId) => {
    try {
      setGeneratingPdfId(memberId);
      const res = await api.get(`/members/${memberId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('PDF preview failed:', err);
      showSnackbar(`PDF preview failed: ${err.message}`, 'error');
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
        showSnackbar('Member updated successfully', 'success');
      } else {
        await createMember(formData);
        showSnackbar('Member added successfully', 'success');
      }
      await loadMembers();
      handleCloseDialog();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to save member';
      showSnackbar(message, 'error');
      throw err; // Let MemberForm handle field-level errors like uniqueNumber
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    
    try {
      await deleteMember(memberId);
      showSnackbar('Member deleted successfully', 'success');
      await loadMembers();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to delete member';
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
          placeholder="Search members..."
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
          Add Member
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredMembers.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          {searchTerm ? 'No matching members found' : 'No members available'}
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
          {currentMember ? 'Edit Member' : 'Add New Member'}
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
