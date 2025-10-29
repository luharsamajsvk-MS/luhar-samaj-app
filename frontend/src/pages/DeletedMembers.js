// frontend/src/pages/DeletedMembers.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Container,
    TextField,
    CircularProgress,
    Snackbar,
    Alert,
    Box,
    Typography,
    Paper,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    IconButton,
    Button
} from '@mui/material';
import {
    Search,
    Close,
    ExpandMore,
    KeyboardArrowDown,
    KeyboardArrowUp,
    RestoreFromTrash
} from '@mui/icons-material';
import {
    getDeletedMembers,
    restoreMember
} from '../services/memberService';

// Helper function to format date
function fmtDate(d, locale = "gu-IN") {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString(locale);
}

// --- Deleted Members Page Component ---
export default function DeletedMembers() {
    const [members, setMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [selectedMemberId, setSelectedMemberId] = useState(null);

    // --- Data Loading & Snackbar ---
    const showSnackbar = useCallback((message, severity) => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const loadMembers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getDeletedMembers();
            const sortedMembers = response.sort((a, b) => (new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0)));
            setMembers(sortedMembers);
            setFilteredMembers(sortedMembers);
        } catch (err) {
            showSnackbar('ડિલીટ સભ્યો મેળવવામાં નિષ્ફળ: ' + (err.message || ''), 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    // --- Search and Filter Logic ---
    useEffect(() => {
        let results = members.filter(member => {
            const searchLower = searchTerm.toLowerCase();
            return (
                member.head?.name?.toLowerCase().includes(searchLower) ||
                member.rationNo?.toLowerCase().includes(searchLower) ||
                member.mobile?.toLowerCase().includes(searchLower) ||
                String(member.uniqueNumber)?.toLowerCase().includes(searchLower)
            );
        });
        setFilteredMembers(results);
    }, [searchTerm, members]);

    // --- Handlers ---
    const handleRestoreMember = async (memberId) => {
        if (!window.confirm('શું તમે આ સભ્યને પુનઃસ્થાપિત કરવા માંગો છો?')) return;
        try {
            await restoreMember(memberId);
            showSnackbar('સભ્ય સફળતાપૂર્વક પુનઃસ્થાપિત થયો', 'success');
            await loadMembers(); // Reload the list
        } catch (err) {
            const message = err.response?.data?.error || err.message || 'સભ્ય પુનઃસ્થાપિત કરવામાં નિષ્ફળ';
            showSnackbar(message, 'error');
        }
    };
    
    const handleToggleDetails = (memberId) => {
        setSelectedMemberId(prev => (prev === memberId ? null : memberId));
    };

    // --- Render ---
    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* --- Header --- */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h5">ડિલીટ કરેલા સભ્યો</Typography>
                    <TextField
                        variant="outlined"
                        placeholder="ડિલીટ સભ્યો શોધો..."
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                            endAdornment: searchTerm && (
                                <IconButton size="small" onClick={() => setSearchTerm('')}>
                                    <Close fontSize="small" />
                                </IconButton>
                            )
                        }}
                        sx={{ minWidth: 300 }}
                    />
                </Box>
                 <Typography variant="body2" sx={{mt: 2}}>
                    અહીં એવા સભ્યોની સૂચિ છે જેમને સિસ્ટમમાંથી કાઢી નાખવામાં આવ્યા છે. તમે તેમને અહીંથી પુનઃસ્થાપિત કરી શકો છો.
                 </Typography>
            </Paper>

            {/* --- Member Table --- */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : filteredMembers.length === 0 ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Typography>
                        {searchTerm ? 'કોઈ મેળ ખાતો સભ્ય મળ્યો નથી' : 'કોઈ ડિલીટ સભ્યો ઉપલબ્ધ નથી'}
                    </Typography>
                </Box>
            ) : (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader aria-label="deleted members table">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: '10px' }} />
                                    <TableCell sx={{ fontWeight: 'bold' }}>સભ્ય નંબર</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>મુખ્ય નામ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>મોબાઈલ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ડિલીટ તારીખ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredMembers.map((member) => {
                                    const isSelected = selectedMemberId === member._id;

                                    return (
                                        <React.Fragment key={member._id}>
                                            <TableRow
                                                hover
                                                onClick={() => handleToggleDetails(member._id)}
                                                sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
                                            >
                                                <TableCell>
                                                    <IconButton aria-label="expand row" size="small">
                                                        {isSelected ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell>{member.uniqueNumber || 'N/A'}</TableCell>
                                                <TableCell component="th" scope="row">
                                                    {member.head?.name}
                                                </TableCell>
                                                <TableCell>{member.mobile}</TableCell>
                                                <TableCell>{fmtDate(member.deletedAt)}</TableCell>
                                            </TableRow>

                                            <TableRow>
                                                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                                                    <Collapse in={isSelected} timeout="auto" unmountOnExit>
                                                        <Box sx={{ margin: 1, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                                                            {/* All Details */}
                                                            {/* (This section is copied from Members.js for full detail view) */}
                                                            
                                                            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                                મુખ્ય વ્યક્તિની માહિતી
                                                            </Typography>
                                                            <Grid container spacing={1} sx={{ mb: 2 }}>
                                                                {/* ... (Grid items for head details) ... */}
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="body2">
                                                                        <strong>નામ:</strong> {member.head?.name}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="body2">
                                                                        <strong>સભ્ય નંબર:</strong> {member.uniqueNumber}
                                                                    </Typography>
                                                                </Grid>
                                                            </Grid>

                                                            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                                સરનામું અને સંપર્ક
                                                            </Typography>
                                                            <Grid container spacing={1} sx={{ mb: 2 }}>
                                                                {/* ... (Grid items for contact details) ... */}
                                                                 <Grid item xs={12} sm={6}>
                                                                    <Typography variant="body2">
                                                                        <strong>મોબાઇલ:</strong> {member.mobile || 'N/A'}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12}>
                                                                    <Typography variant="body2">
                                                                        <strong>સરનામું:</strong> {member.address}
                                                                    </Typography>
                                                                </Grid>
                                                            </Grid>

                                                            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                                પરિવારના સભ્યો ({member.familyMembers?.length || 0})
                                                            </Typography>
                                                            {member.familyMembers && member.familyMembers.length > 0 ? (
                                                                <Box>
                                                                    {member.familyMembers.map((fm, idx) => (
                                                                        <Accordion key={idx} sx={{ mb: 1 }}>
                                                                            <AccordionSummary expandIcon={<ExpandMore />}>
                                                                                <Typography variant="body2">{fm.name} ({fm.relation})</Typography>
                                                                            </AccordionSummary>
                                                                            <AccordionDetails sx={{ backgroundColor: '#fafafa' }}>
                                                                                {/* ... (Grid for family member details) ... */}
                                                                            </AccordionDetails>
                                                                        </Accordion>
                                                                    ))}
                                                                </Box>
                                                            ) : (
                                                                <Typography variant="body2" sx={{ mb: 2 }}>
                                                                    કોઈ પરિવારના સભ્યો નથી.
                                                                </Typography>
                                                            )}

                                                            <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-start' }}>
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    color="success"
                                                                    startIcon={<RestoreFromTrash />}
                                                                    onClick={() => handleRestoreMember(member._id)}
                                                                >
                                                                    પુનઃસ્થાપિત કરો (Restore)
                                                                </Button>
                                                            </Box>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* --- Snackbar --- */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
}