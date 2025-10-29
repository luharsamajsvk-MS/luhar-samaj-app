// frontend/src/pages/AuditLogs.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Chip,
  Collapse,
} from "@mui/material";
import {
  Search,
  Close,
  Download,
  Refresh,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from "@mui/icons-material";
import api from "../services/api";

// --- Helper Components ---

/**
 * ✅ NEW: Helper component to display a list of family members with full details.
 */
const FamilyMembersDisplay = ({ members }) => {
  if (!Array.isArray(members) || members.length === 0) {
    return <Typography variant="body2" color="text.secondary" component="span"><i>(ખાલી)</i></Typography>;
  }

  // Helper to format date, e.g., "DD/MM/YYYY"
  const formatDate = (dateString) => {
    if (!dateString) return 'ઉપલબ્ધ નથી';
    try {
      return new Date(dateString).toLocaleDateString('gu-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString; // fallback if date is invalid
    }
  };

  return (
    <Box component="ul" sx={{ m: 0, p: 0, pl: 2, listStyleType: 'decimal' }}>
      {members.map((member, index) => (
        <Box component="li" key={index} sx={{ mb: 1.5 }}>
          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
            <strong>{member.name || 'નામ નથી'}</strong>
            {` (${member.relation || 'ઉપલબ્ધ નથી'})`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1.5 }}>
            જન્મ તારીખ: {formatDate(member.birthDate)} | 
            ઉંમર: {member.age || 'ઉપલબ્ધ નથી'} | 
            લિંગ: {member.gender || 'ઉપલબ્ધ નથી'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};


/**
 * ✅ UPDATED: Renders simple 'before' and 'after' values.
 * This is now a fallback for non-family-member fields.
 */
const renderValue = (value) => {
  const chipStyles = { 
    whiteSpace: 'normal', 
    height: 'auto', 
    minHeight: '22px',
    p: '2px 6px',
    alignItems: 'flex-start'
  };

  // 1. If value is null or undefined, show as 'empty'
  if (value === null || typeof value === 'undefined') {
    return <Typography variant="body2" color="text.secondary" component="span"><i>(ખાલી)</i></Typography>;
  }

  // 2. If value is an object or array, stringify it
  if (typeof value === 'object') {
    return <Chip label={JSON.stringify(value)} size="small" variant="outlined" sx={chipStyles} />;
  }
  
  // 3. For strings, numbers, booleans
  return <Chip label={String(value)} size="small" variant="outlined" sx={chipStyles} />;
};


// ✅ UPDATED: This component now conditionally renders FamilyMembersDisplay.
const ChangesDisplay = ({ changes }) => {
  if (!changes) {
    return <Typography variant="body2" color="text.secondary">કોઈ ફેરફારો નોંધાયેલા નથી.</Typography>;
  }

  const changesArray = Array.isArray(changes) ? changes : Object.entries(changes).map(([field, values]) => ({
      field,
      before: values.before,
      after: values.after
  }));
  
  if (changesArray.length === 0) {
      return <Typography variant="body2" color="text.secondary">કોઈ ફેરફારો નોંધાયેલા નથી.</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>ફીલ્ડ</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>પહેલાં</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>પછી</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {changesArray.map((change, i) => (
            <TableRow key={i}>
              <TableCell component="th" scope="row" sx={{ verticalAlign: 'top' }}>
                <strong>{change.field}</strong>
              </TableCell>
              
              {/* --- THIS IS THE KEY CHANGE --- */}
              {/* Check if this is the family members field */}
              {change.field === 'familyMembers' ? (
                <>
                  <TableCell sx={{ textDecoration: 'line-through', verticalAlign: 'top' }}>
                    <FamilyMembersDisplay members={change.before} />
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <FamilyMembersDisplay members={change.after} />
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell sx={{ textDecoration: 'line-through', verticalAlign: 'top' }}>
                    {renderValue(change.before)}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    {renderValue(change.after)}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};


// --- Helper function to get entity/member name (UNCHANGED) ---
const getDisplayName = (log) => {
  if (log.memberId?.head?.name) {
    return log.memberId.head.name;
  }
  if (log.changes) {
    const changesArray = Array.isArray(log.changes) ? log.changes : Object.entries(log.changes).map(([field, values]) => ({
      field,
      before: values.before,
      after: values.after
    }));
    const nameField = changesArray.find(c => c.field === 'name' || c.field === 'head.name');
    if (nameField) {
      if (log.action === 'delete' && nameField.before) {
        return `(કાઢી નાખેલ: ${nameField.before})`;
      }
      if (nameField.after) {
        return nameField.after;
      }
      if (nameField.before) {
        return nameField.before; 
      }
    }
  }
  return `(${log.entityType})`;
}

// --- Collapsible Row Component (UNCHANGED) ---
const LogEntryRow = ({ log }) => {
  const [open, setOpen] = useState(false);
  const displayName = getDisplayName(log);

  const getActionLabel = (action) => {
    switch(action) {
      case 'create': return 'બનાવ્યું';
      case 'update': return 'અપડેટ';
      case 'delete': return 'કાઢી નાખ્યું';
      default: return action;
    }
  };

  return (
    <React.Fragment>
      <TableRow 
        hover 
        onClick={() => setOpen(!open)} 
        sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
      >
        <TableCell sx={{ width: '10px' }}>
          <IconButton aria-label="expand row" size="small">
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell><Chip label={log.requestNumber} size="small" variant="outlined"/></TableCell>
        <TableCell>{new Date(log.timestamp).toLocaleString("gu-IN")}</TableCell>
        <TableCell>{log.user?.name || 'સિસ્ટમ'}</TableCell>
        <TableCell><Chip label={getActionLabel(log.action)} size="small" color={log.action === 'create' ? 'success' : log.action === 'delete' ? 'error' : 'default'} /></TableCell>
        <TableCell>{displayName}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 1, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                ફેરફારો
              </Typography>
              <ChangesDisplay changes={log.changes} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};


// --- Main Audit Logs Page Component ---

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
  
  // State for filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ action: "", entityType: "" });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        ...filters,
      };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);

      const res = await api.get("/audit", { params });
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { currentPage: 1, totalPages: 1, totalLogs: 0 });
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };
  
  const handleExport = async () => {
      try {
        const params = { format: 'csv', search: searchTerm, ...filters };
        Object.keys(params).forEach(key => !params[key] && delete params[key]);

        const res = await api.get('/export/audit', { params, responseType: 'blob' });
        
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit_logs.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

      } catch (err) {
          console.error("Failed to export logs:", err);
      }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>વિનંતી પૃષ્ઠ</Typography>
        
        <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="વપરાશકર્તા, ક્રિયા, અથવા ઓડિટ # દ્વારા શોધો"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchLogs()}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                        endAdornment: searchTerm && <IconButton size="small" onClick={() => setSearchTerm('')}><Close fontSize="small" /></IconButton>
                    }}
                />
                <FormControl fullWidth><InputLabel>ક્રિયા</InputLabel>
                    <Select name="action" value={filters.action} label="ક્રિયા" onChange={handleFilterChange}>
                        <MenuItem value="">બધી ક્રિયાઓ</MenuItem>
                        <MenuItem value="create">બનાવ્યું</MenuItem>
                        <MenuItem value="update">અપડેટ</MenuItem>
                        <MenuItem value="delete">કાઢી નાખ્યું</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth><InputLabel>એન્ટિટી પ્રકાર</InputLabel>
                    <Select name="entityType" value={filters.entityType} label="એન્ટિટી પ્રકાર" onChange={handleFilterChange}>
                        <MenuItem value="">બધી એન્ટિટીઓ</MenuItem>
                        <MenuItem value="Member">સભ્ય</MenuItem>
                        <MenuItem value="Request">વિનંતી</MenuItem>
                        <MenuItem value="Zone">ઝોન</MenuItem>
                        <MenuItem value="User">વપરાશકર્તા</MenuItem>
                    </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={fetchLogs} startIcon={<Refresh />}>તાજું કરો</Button>
                    <Button variant="outlined" color="success" onClick={handleExport} startIcon={<Download />}>નિકાસ કરો</Button>
                </Stack>
            </Stack>
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell /> {/* Empty cell for expand icon */}
                        <TableCell>વિનંતી નંબર</TableCell>
                        <TableCell>સમય</TableCell>
                        <TableCell>વપરાશકર્તા</TableCell>
                        <TableCell>ક્રિયા</TableCell>
                        <TableCell>એન્ટિટી / સભ્ય</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
                    ) : logs.length > 0 ? (
                        logs.map((log) => (
                          <LogEntryRow key={log._id} log={log} />
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={6} align="center">કોઈ લોગ્સ મળ્યા નથી</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
            
            <TablePagination
                component="div"
                count={pagination.totalLogs}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="પ્રતિ પૃષ્ઠ પંક્તિઓ:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} માંથી ${count !== -1 ? count : `${to} થી વધુ`}`}
            />
        </TableContainer>
    </Container>
  );
};

export default AuditLogsPage;