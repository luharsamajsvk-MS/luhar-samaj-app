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
    return <Typography variant="body2" color="text.secondary" component="span"><i>(empty)</i></Typography>;
  }

  // Helper to format date, e.g., "DD/MM/YYYY"
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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
            <strong>{member.name || 'No Name'}</strong>
            {` (${member.relation || 'N/A'})`}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1.5 }}>
            DOB: {formatDate(member.birthDate)} | 
            Age: {member.age || 'N/A'} | 
            Gender: {member.gender || 'N/A'}
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
    return <Typography variant="body2" color="text.secondary" component="span"><i>(empty)</i></Typography>;
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
    return <Typography variant="body2" color="text.secondary">No changes logged.</Typography>;
  }

  const changesArray = Array.isArray(changes) ? changes : Object.entries(changes).map(([field, values]) => ({
      field,
      before: values.before,
      after: values.after
  }));
  
  if (changesArray.length === 0) {
      return <Typography variant="body2" color="text.secondary">No changes logged.</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Field</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Before</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>After</TableCell>
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
        return `(Deleted: ${nameField.before})`;
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
        <TableCell><Chip label={log.auditNumber} size="small" variant="outlined"/></TableCell>
        <TableCell>{new Date(log.timestamp).toLocaleString("gu-IN")}</TableCell>
        <TableCell>{log.user?.name || 'System'}</TableCell>
        <TableCell><Chip label={log.action} size="small" color={log.action === 'create' ? 'success' : log.action === 'delete' ? 'error' : 'default'} /></TableCell>
        <TableCell>{displayName}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 1, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                Changes
              </Typography>
              <ChangesDisplay changes={log.changes} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};


// --- Main Audit Logs Page Component (UNCHANGED) ---

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
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>ઑડિટ લોગ્સ</Typography>
        
        <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search by user, action, or audit #"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchLogs()}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                        endAdornment: searchTerm && <IconButton size="small" onClick={() => setSearchTerm('')}><Close fontSize="small" /></IconButton>
                    }}
                />
                <FormControl fullWidth><InputLabel>Action</InputLabel>
                    <Select name="action" value={filters.action} label="Action" onChange={handleFilterChange}>
                        <MenuItem value="">All Actions</MenuItem><MenuItem value="create">Create</MenuItem><MenuItem value="update">Update</MenuItem><MenuItem value="delete">Delete</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth><InputLabel>Entity Type</InputLabel>
                    <Select name="entityType" value={filters.entityType} label="Entity Type" onChange={handleFilterChange}>
                        <MenuItem value="">All Entities</MenuItem><MenuItem value="Member">Member</MenuItem><MenuItem value="Request">Request</MenuItem><MenuItem value="Zone">Zone</MenuItem><MenuItem value="User">User</MenuItem>
                    </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={fetchLogs} startIcon={<Refresh />}>Refresh</Button>
                    <Button variant="outlined" color="success" onClick={handleExport} startIcon={<Download />}>Export</Button>
                </Stack>
            </Stack>
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell /> {/* Empty cell for expand icon */}
                        <TableCell>Audit #</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Entity / Member</TableCell>
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
            />
        </TableContainer>
    </Container>
  );
};

export default AuditLogsPage;