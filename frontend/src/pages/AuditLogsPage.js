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
  Tooltip,
} from "@mui/material";
import { Search, Close, Download, Refresh } from "@mui/icons-material";
import api from "../services/api"; // Use the central API service

// --- Helper Components ---

// ✅ FIXED: This component now safely handles both array and object data
const ChangesDisplay = ({ changes }) => {
  // 1. Check if 'changes' data exists.
  if (!changes) {
    return <Typography variant="body2" color="text.secondary">No changes logged.</Typography>;
  }

  // 2. If 'changes' is not an array (it's the old object format), convert it.
  const changesArray = Array.isArray(changes) ? changes : Object.entries(changes).map(([field, values]) => ({
      field,
      before: values.before,
      after: values.after
  }));
  
  if (changesArray.length === 0) {
      return <Typography variant="body2" color="text.secondary">No changes logged.</Typography>;
  }

  // 3. Now we can safely map over the guaranteed array.
  return (
    <Box component="ul" sx={{ m: 0, pl: 2, maxWidth: 400 }}>
      {changesArray.map((change, i) => (
        <li key={i}>
          <Typography variant="body2" component="span" noWrap>
            <strong>{change.field}:</strong>
            <Tooltip title={`Before: ${JSON.stringify(change.before)}`}>
                <Chip label={JSON.stringify(change.before) || '""'} size="small" sx={{ mx: 0.5, textDecoration: 'line-through' }} />
            </Tooltip>
            →
            <Tooltip title={`After: ${JSON.stringify(change.after)}`}>
                <Chip label={JSON.stringify(change.after) || '""'} size="small" color="success" sx={{ ml: 0.5 }}/>
            </Tooltip>
          </Typography>
        </li>
      ))}
    </Box>
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
      // Remove empty filters
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
    setPage(0); // Reset to first page on filter change
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
                        <TableCell>Audit #</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Entity</TableCell>
                        <TableCell>Changes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
                    ) : logs.length > 0 ? (
                        logs.map((log) => (
                            <TableRow key={log._id}>
                                <TableCell><Chip label={log.auditNumber} size="small" variant="outlined"/></TableCell>
                                <TableCell>{new Date(log.timestamp).toLocaleString("gu-IN")}</TableCell>
                                <TableCell>{log.user?.name || 'System'}</TableCell>
                                <TableCell><Chip label={log.action} size="small" color={log.action === 'create' ? 'success' : log.action === 'delete' ? 'error' : 'default'} /></TableCell>
                                <TableCell>
                                    <Typography variant="body2">{log.entityType}</Typography>
                                    <Typography variant="caption" color="text.secondary">{log.memberId?.head?.name || ''}</Typography>
                                </TableCell>
                                <TableCell><ChangesDisplay changes={log.changes} /></TableCell>
                            </TableRow>
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