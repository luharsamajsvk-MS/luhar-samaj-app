// frontend/src/pages/AuditLogs.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Container, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, TablePagination, TextField,
  InputAdornment, Stack, MenuItem, FormControl, InputLabel,
  Select, Button, Chip,
} from "@mui/material";
import { 
  Search, Download, Refresh, AddCircleOutline, RemoveCircleOutline, Edit 
} from "@mui/icons-material";
import api from "../services/api";

const ChangesDisplay = ({ changes, zoneMap }) => {
  if (!changes || changes.length === 0) {
    return <Typography variant="body2" color="text.secondary">No changes logged.</Typography>;
  }
  
  const formatValue = (field, value) => {
      if (field.toLowerCase().includes('zone') && value && zoneMap[value]) {
          return `"${zoneMap[value]}"`;
      }
      if (value === null || value === undefined) return '""';
      return `"${String(value)}"`;
  };

  const renderChange = (change, i) => {
    switch (change.type) {
        case 'added':
            return <Typography sx={{ display: 'flex', alignItems: 'center' }} key={i}><AddCircleOutline color="success" sx={{ mr: 1, fontSize: '1rem' }} /> Added "{change.value}" to <strong>{change.field.split('[')[0]}</strong></Typography>;
        case 'removed':
            return <Typography sx={{ display: 'flex', alignItems: 'center' }} key={i}><RemoveCircleOutline color="error" sx={{ mr: 1, fontSize: '1rem' }} /> Removed "{change.value}" from <strong>{change.field.split('[')[0]}</strong></Typography>;
        default:
             return <Typography sx={{ display: 'flex', alignItems: 'center' }} key={i}><Edit sx={{ mr: 1, fontSize: '1rem' }} /> Changed <strong>{change.field}</strong> from {formatValue(change.field, change.before)} to {formatValue(change.field, change.after)}</Typography>;
    }
  };

  return <Stack spacing={0.5}>{changes.map(renderChange)}</Stack>;
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ action: "", entityType: "" });
  const [zoneMap, setZoneMap] = useState({});

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage, search: searchTerm, ...filters };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const [auditRes, zonesRes] = await Promise.all([
          api.get("/audit", { params }),
          api.get("/zones/public")
      ]);
      
      setLogs(auditRes.data.logs || []);
      setPagination(auditRes.data.pagination || { currentPage: 1, totalPages: 1, totalLogs: 0 });

      const zMap = {};
      (zonesRes.data || []).forEach(z => { zMap[z._id] = z.name; });
      setZoneMap(zMap);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilterChange = (event) => {
    setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
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
      alert("Failed to export logs.");
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Audit Logs</Typography>
        <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField fullWidth variant="outlined" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && fetchLogs()} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}/>
                <FormControl fullWidth><InputLabel>Action</InputLabel><Select name="action" value={filters.action} label="Action" onChange={handleFilterChange}><MenuItem value="">All</MenuItem><MenuItem value="create">Create</MenuItem><MenuItem value="update">Update</MenuItem><MenuItem value="delete">Delete</MenuItem></Select></FormControl>
                <FormControl fullWidth><InputLabel>Entity</InputLabel><Select name="entityType" value={filters.entityType} label="Entity" onChange={handleFilterChange}><MenuItem value="">All</MenuItem><MenuItem value="Member">Member</MenuItem><MenuItem value="Request">Request</MenuItem></Select></FormControl>
                <Button variant="contained" onClick={fetchLogs} startIcon={<Refresh />}>Refresh</Button>
                <Button variant="outlined" color="success" onClick={handleExport} startIcon={<Download />}>Export</Button>
            </Stack>
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
                <TableHead><TableRow><TableCell>Audit #</TableCell><TableCell>Timestamp</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell><TableCell>Entity</TableCell><TableCell>Changes</TableCell></TableRow></TableHead>
                <TableBody>
                    {loading ? (<TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>) :
                     logs.length > 0 ? (logs.map((log) => (
                        <TableRow key={log._id} hover>
                            <TableCell><Chip label={log.auditNumber || '-'} size="small" variant="outlined"/></TableCell>
                            <TableCell>{new Date(log.timestamp).toLocaleString("gu-IN")}</TableCell>
                            <TableCell>{log.user?.name || 'System'}</TableCell>
                            <TableCell><Chip label={log.action} size="small" color={log.action === 'create' ? 'success' : log.action === 'delete' ? 'error' : 'default'} /></TableCell>
                            <TableCell><Typography variant="body2">{log.entityType}</Typography><Typography variant="caption" color="text.secondary">{log.memberId?.head?.name || ''}</Typography></TableCell>
                            <TableCell><ChangesDisplay changes={log.changes} zoneMap={zoneMap} /></TableCell>
                        </TableRow>
                     ))) : (<TableRow><TableCell colSpan={6} align="center">No logs found.</TableCell></TableRow>)}
                </TableBody>
            </Table>
            <TablePagination component="div" count={pagination.totalLogs} page={page} rowsPerPage={rowsPerPage} onPageChange={(e, newPage) => setPage(newPage)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]}/>
        </TableContainer>
    </Container>
  );
};

export default AuditLogs;