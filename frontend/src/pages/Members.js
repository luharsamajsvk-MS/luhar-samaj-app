// frontend/src/pages/Members.js
import React, { useState, useEffect, useMemo } from 'react';
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
  Box,
  Typography,
  Paper,
  InputAdornment
} from '@mui/material';
import { Add, Search, Close, Download } from '@mui/icons-material';
import MemberCard from '../components/MemberCard';
import MemberForm from '../components/MemberForm';
import { 
  getMembers, 
  createMember, 
  updateMember, 
  deleteMember 
} from '../services/memberService';
import api from '../services/api';

// --- Main Members Page Component ---
export default function Members() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [generatingPdfId, setGeneratingPdfId] = useState(null);

  // --- Data Loading ---
  useEffect(() => {
    loadMembers();
  }, []);

  // --- Search and Filter Logic ---
  useEffect(() => {
    const results = members.filter(member => {
      const searchLower = searchTerm.toLowerCase();
      return (
        member.head?.name?.toLowerCase().includes(searchLower) ||
        member.rationNo?.toLowerCase().includes(searchLower) ||
        member.mobile?.toLowerCase().includes(searchLower) ||
        (member.additionalMobiles?.join(' ').toLowerCase() || "").includes(searchLower) || // ✅ Search additional mobiles
        member.address?.toLowerCase().includes(searchLower) ||
        String(member.uniqueNumber)?.toLowerCase().includes(searchLower) ||
        (member.zone?.name && member.zone.name.toLowerCase().includes(searchLower))
      );
    });
    setFilteredMembers(results);
  }, [searchTerm, members]);
  
  // ✅ NEW: Calculate Member Statistics
  const stats = useMemo(() => {
      const totalFamilies = members.length;
      let totalPeople = 0;
      let maleCount = 0;
      let femaleCount = 0;

      members.forEach(member => {
          // Count the head of the family
          totalPeople += 1;
          if (member.head?.gender === 'male') maleCount++;
          if (member.head?.gender === 'female') femaleCount++;

          // Count family members
          if (member.familyMembers && member.familyMembers.length > 0) {
              totalPeople += member.familyMembers.length;
              member.familyMembers.forEach(fm => {
                  if (fm.gender === 'male') maleCount++;
                  if (fm.gender === 'female') femaleCount++;
              });
          }
      });

      return { totalFamilies, totalPeople, maleCount, femaleCount };
  }, [members]);

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

  const handleGenerateCard = async (memberId) => {
    try {
      setGeneratingPdfId(memberId);
      const res = await api.get(`/members/${memberId}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000); // Clean up the object URL
    } catch (err) {
      showSnackbar(`PDF બનાવવામાં નિષ્ફળ: ${err.message}`, "error");
    } finally {
      setGeneratingPdfId(null);
    }
  };
  
  // ✅ NEW: Handle Excel Export (placeholder)
  const handleExportExcel = () => {
      showSnackbar('આ સુવિધા ટૂંક સમયમાં આવી રહી છે!', 'info');
      // Later, this will call: await exportMembersToExcel();
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
      throw err; // Propagate error to form to keep dialog open
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('શું તમે આ સભ્યને કાઢી નાખવા ઈચ્છો છો?')) return;
    try {
      await deleteMember(memberId);
      showSnackbar('સભ્ય કાઢી નાખવામાં આવ્યો', 'success');
      await loadMembers();
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'સભ્ય કાઢવામાં નિષ્ફળ', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* --- Header and Actions --- */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              variant="outlined"
              placeholder="સભ્યો શોધો..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                endAdornment: searchTerm && <IconButton size="small" onClick={() => setSearchTerm('')}><Close fontSize="small" /></IconButton>
              }}
              sx={{ minWidth: 300, flexGrow: 1 }}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleAddMember}>સભ્ય ઉમેરો</Button>
              {/* ✅ NEW: Export to Excel Button */}
              <Button variant="outlined" color="success" startIcon={<Download />} onClick={handleExportExcel}>Excelમાં નિકાસ કરો</Button>
            </Box>
          </Box>
          {/* ✅ NEW: Statistics Display */}
          <Grid container spacing={2} sx={{ mt: 2, textAlign: 'center' }}>
              <Grid item xs={6} sm={3}><Typography variant="h6">{stats.totalFamilies}</Typography><Typography color="text.secondary">કુલ પરિવારો</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="h6">{stats.totalPeople}</Typography><Typography color="text.secondary">કુલ સભ્યો</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="h6">{stats.maleCount}</Typography><Typography color="text.secondary">પુરુષ</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="h6">{stats.femaleCount}</Typography><Typography color="text.secondary">સ્ત્રી</Typography></Grid>
          </Grid>
      </Paper>

      {/* --- Member List --- */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : filteredMembers.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}><Typography>{searchTerm ? 'કોઈ મેળ ખાતો સભ્ય મળ્યો નથી' : 'કોઈ સભ્યો ઉપલબ્ધ નથી'}</Typography></Box>
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

      {/* --- Dialogs and Snackbar --- */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>{currentMember ? 'સભ્ય સંપાદિત કરો' : 'નવો સભ્ય ઉમેરો'}</DialogTitle>
        <DialogContent dividers>
          <MemberForm 
            onSubmit={handleSubmit}
            memberToEdit={currentMember}
            // Pass a reset function to snackbar to avoid showing old errors
            error={snackbar.open && snackbar.severity === 'error' ? snackbar.message : null}
          />
        </DialogContent>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}