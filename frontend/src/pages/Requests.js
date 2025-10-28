// frontend/src/pages/Requests.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  TablePagination,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Box,
  Chip,
  Grid,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Check,
  Close,
  Search,
  Visibility,
  ExpandMore,
} from "@mui/icons-material";
// Import all functions from 'services/api.js'
import api, {
  getRequests,
  approveRequest,
  declineRequest,
  getPublicZones, // Use the function from api.js
} from "../services/api";

// --- Helper Functions ---
function calcAgeFromDOB(dob) {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmtDate(d, locale = "gu-IN") {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString(locale);
}

// --- Main Requests Page Component ---
export default function Requests() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // States
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [approveOpen, setApproveOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sabhyaNo, setSabhyaNo] = useState("");
  const [requestNumber, setRequestNumber] = useState(""); // 🔹 NEW: State for manual request number
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [zoneMap, setZoneMap] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // This helper is correct for the aligned schema
  const getRequestData = (request) => {
    if (!request) return {};
    return {
      headName: request.head?.name || "-", 
      headGender: request.head?.gender || "-",
      headBirthday: request.head?.birthdate || null, 
      headAge: request.head?.age || "-",
      rationNo: request.rationNo || "-", 
      address: request.address || "-",
      city: request.city || "-", 
      mobile: request.mobile || "-", 
      additionalMobiles: request.additionalMobiles || [],
      pincode: request.pincode || "-", 
      zone: request.zone || null,
      familyMembers: request.familyMembers || []
    };
  };

  const renderZone = useCallback((r) => {
    const z = getRequestData(r).zone;
    if (!z) return "-";
    if (typeof z === "string") return zoneMap[z] || z;
    // Handle populated zone object
    if (typeof z === "object" && z !== null) {
      return z.number && z.name ? `${z.number} - ${z.name}` : z.name || z.number || "-";
    }
    return zoneMap[z] || z; // Fallback
  }, [zoneMap]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: reqs }, { data: zs }] = await Promise.all([ 
        getRequests(), 
        getPublicZones() 
      ]);
      
      setRows((reqs || []).map(req => ({ ...req, status: (req.status || 'pending').toLowerCase() })));
      setZones(zs || []);
      const zmap = {};
      (zs || []).forEach((z) => { zmap[z._id] = `${z.number} - ${z.name}`; });
      setZoneMap(zmap);
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "Data loading failed", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let filtered = rows;
    if (statusFilter !== "all") filtered = filtered.filter((row) => row.status === statusFilter);
    if (zoneFilter !== "all") {
      filtered = filtered.filter((row) => {
        const zoneData = getRequestData(row).zone;
        const zoneId = typeof zoneData === 'string' ? zoneData : zoneData?._id;
        return zoneId === zoneFilter;
      });
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((row) => {
        const data = getRequestData(row);
        return (
          (data.headName?.toLowerCase() || "").includes(term) ||
          (data.mobile?.toLowerCase() || "").includes(term) ||
          (data.rationNo?.toLowerCase() || "").includes(term) ||
          (data.additionalMobiles.join(' ').toLowerCase() || "").includes(term) ||
          (renderZone(row).toLowerCase() || "").includes(term)
        );
      });
    }
    setFilteredRows(filtered);
    setPage(0);
  }, [searchTerm, statusFilter, zoneFilter, rows, zoneMap, renderZone]);

  const paginatedRows = filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const onOpenApprove = (row) => {
    setSelected(row); 
    setSabhyaNo(""); 
    setRequestNumber(""); // 🔹 NEW: Clear request number state on open
    setApproveOpen(true);
  };

  const onApprove = async () => {
    // 🔹 MODIFIED: Check for requestNumber as well
    if (!selected?._id || !sabhyaNo.trim() || !requestNumber.trim()) return;
    
    setSubmitting(true);
    try {
      // 🔹 MODIFIED: Pass an object with uniqueNumber and requestNumber
      const payload = {
        uniqueNumber: sabhyaNo,
        requestNumber: requestNumber
      };
      await approveRequest(selected._id, payload); 
      
      showSnackbar("Request approved and member created!", "success");
      setApproveOpen(false);
      await load();
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "Approval failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenDecline = (row) => {
    setSelected(row); setDeclineOpen(true);
  };

  const onDeclineConfirm = async () => {
    if (!selected?._id) return;
    setSubmitting(true);
    try {
      // ✅ FIX: Removed the second argument ("Rejected by admin") 
      // to match the backend DELETE route which doesn't accept notes.
      await declineRequest(selected._id); 
      showSnackbar("Request rejected.", "info");
      setDeclineOpen(false);
      await load();
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "Rejection failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenDetails = (row) => {
    setDetailRequest(row); setDetailOpen(true);
  };

  const renderStatusChip = (status) => {
    let color = "default", label = "અજ્ઞાત";
    switch (status) {
      case "pending": color = "warning"; label = "બાકી"; break;
      case "approved": color = "success"; label = "મંજૂર"; break;
      case "rejected": color = "error"; label = "નામંજૂર"; break;
      default: break;
    }
    return <Chip label={label} color={color} size="small" />;
  };
  
  const renderMobileRow = (r) => {
    const data = getRequestData(r);
    return (
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }} elevation={1}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Typography variant="subtitle1" fontWeight="bold">{data.headName}</Typography><Box>{renderStatusChip(r.status)}</Box></Stack>
          <Typography variant="body2"><Box component="span" fontWeight="bold">મોબાઇલ:</Box> {data.mobile}</Typography>
          <Typography variant="body2"><Box component="span" fontWeight="bold">ઝોન:</Box> {renderZone(r)}</Typography>
          <Typography variant="body2"><Box component="span" fontWeight="bold">રેશન નંબર:</Box> {data.rationNo}</Typography>
          <Typography variant="body2" color="text.secondary">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            <IconButton onClick={() => onOpenDetails(r)} size="small" title="વિગતો જુઓ"><Visibility /></IconButton>
            <IconButton onClick={() => onOpenApprove(r)} size="small" title="મંજૂર કરો" disabled={r.status !== "pending"}><Check color={r.status === "pending" ? "success" : "disabled"} /></IconButton>
            <IconButton onClick={() => onOpenDecline(r)} size="small" title="નામંજૂર કરો" disabled={r.status !== "pending"}><Close color={r.status === "pending" ? "error" : "disabled"} /></IconButton>
          </Stack>
        </Stack>
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 2, px: isMobile ? 1 : 4 }}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: isMobile ? "1.3rem" : "inherit" }}>નોંધણી અરજીઓ</Typography>
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center">
            <TextField variant="outlined" placeholder="શોધો..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>), }} sx={{ flexGrow: 1 }} />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel id="zone-filter-label">ઝોન</InputLabel>
              <Select labelId="zone-filter-label" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} label="ઝોન">
                <MenuItem value="all">બધા ઝોન</MenuItem>
                {zones.map((zone) => (<MenuItem key={zone._id} value={zone._id}>{zone.number} - {zone.name}</MenuItem>))}
              </Select>
            </FormControl>
          </Stack>
          <Tabs value={statusFilter} onChange={(e, v) => setStatusFilter(v)} sx={{ mt: 2 }} variant={isMobile ? "scrollable" : "standard"}>
            <Tab label="બધી અરજીઓ" value="all" />
            <Tab label="બાકી" value="pending" />
            <Tab label="મંજૂર" value="approved" />
            <Tab label="નામંજૂર" value="rejected" />
          </Tabs>
        </Paper>
        {loading ? (<Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>) : (
          <>
            {isMobile ? (
              <Stack>
                {filteredRows.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}><Typography>{searchTerm || statusFilter !== "all" || zoneFilter !== "all" ? "કોઈ અરજીઓ મળી નથી" : "કોઈ અરજીઓ નથી"}</Typography></Paper>
                ) : (
                  <Box sx={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>{paginatedRows.map((r) => (<Box key={r._id}>{renderMobileRow(r)}</Box>))}</Box>
                )}
                {filteredRows.length > 0 && <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredRows.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(_, newPage) => setPage(newPage)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} labelRowsPerPage="પ્રતિ પૃષ્ઠ:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`} sx={{ borderTop: "1px solid rgba(224, 224, 224, 1)", position: "sticky", bottom: 0, backgroundColor: "background.paper", zIndex: 1 }} />}
              </Stack>
            ) : (
              <Paper sx={{ p: 2, borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table sx={{ minWidth: 1000 }}>
                    <TableHead><TableRow><TableCell>સ્થિતિ</TableCell><TableCell>મુખ્ય સભ્ય નામ</TableCell><TableCell>મોબાઇલ</TableCell><TableCell>ઝોન</TableCell><TableCell>રેશન નંબર</TableCell><TableCell>તારીખ</TableCell><TableCell align="right">ક્રિયા</TableCell></TableRow></TableHead>
                    <TableBody>
                      {filteredRows.length === 0 ? (<TableRow><TableCell colSpan={7} align="center">{searchTerm || statusFilter !== "all" || zoneFilter !== "all" ? "કોઈ અરજીઓ મળી નથી" : "કોઈ અરજીઓ નથી"}</TableCell></TableRow>) : (
                        paginatedRows.map((r) => {
                          const data = getRequestData(r);
                          return (
                            <TableRow key={r._id} hover>
                              <TableCell>{renderStatusChip(r.status)}</TableCell><TableCell>{data.headName}</TableCell><TableCell>{data.mobile}</TableCell><TableCell>{renderZone(r)}</TableCell><TableCell>{data.rationNo}</TableCell><TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</TableCell>
                              <TableCell align="right">
                                <IconButton onClick={() => onOpenDetails(r)} title="વિગતો જુઓ"><Visibility /></IconButton>
                                <IconButton onClick={() => onOpenApprove(r)} title="મંજૂર કરો" disabled={r.status !== "pending"}><Check color={r.status === "pending" ? "success" : "disabled"} /></IconButton>
                                <IconButton onClick={() => onOpenDecline(r)} title="નામંજૂર કરો" disabled={r.status !== "pending"}><Close color={r.status === "pending" ? "error" : "disabled"} /></IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Box>
                {filteredRows.length > 0 && <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredRows.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(_, newPage) => setPage(newPage)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} labelRowsPerPage="પ્રતિ પૃષ્ઠ:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`} sx={{ borderTop: "1px solid rgba(224, 224, 224, 1)" }} />}
              </Paper>
            )}
          </>
        )}
      </Stack>
      
      {/* Details Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>અરજી વિગતો</DialogTitle>
        <DialogContent>
          {detailRequest && (() => {
            const data = getRequestData(detailRequest);
            return (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{renderStatusChip(detailRequest.status)}<Typography variant="body2" color="text.secondary">અરજી તારીખ: {detailRequest.createdAt ? new Date(detailRequest.createdAt).toLocaleString() : "-"}</Typography></Box>
                <Box>
                  <Typography variant="h6" gutterBottom>મુખ્ય સભ્યની માહિતી</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField label="નામ" value={data.headName} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="લિંગ" value={data.headGender === 'male' ? 'પુરુષ' : data.headGender === 'female' ? 'સ્ત્રી' : 'અન્ય'} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="જન્મતારીખ" value={fmtDate(data.headBirthday)} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="ઉંમર" value={data.headAge || calcAgeFromDOB(data.headBirthday) || "-"} fullWidth InputProps={{ readOnly: true }} /></Grid>
                  </Grid>
                </Box>

                <Box>
                  <Typography variant="h6" gutterBottom>સરનામું અને સંપર્ક</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField label="રેશન કાર્ડ નંબર" value={data.rationNo} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="મોબાઇલ નંબર" value={data.mobile} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    {data.additionalMobiles && data.additionalMobiles.length > 0 && (<Grid item xs={12} sm={6}><TextField label="વધારાના મોબાઇલ નંબર" value={data.additionalMobiles.join(', ')} fullWidth InputProps={{ readOnly: true }} /></Grid>)}
                    <Grid item xs={12}><TextField label="સરનામું" value={data.address} fullWidth multiline rows={2} InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="શહેર" value={data.city} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="પિનકોડ" value={data.pincode} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="ઝોન" value={renderZone(detailRequest)} fullWidth InputProps={{ readOnly: true }} /></Grid>
                  </Grid>
                </Box>
                
                <Box>
                  <Typography variant="h6" gutterBottom>પરિવારના સભ્યો ({data.familyMembers.length})</Typography>
                  {data.familyMembers && data.familyMembers.length > 0 ? (<Stack spacing={2}>{data.familyMembers.map((member, index) => (<Accordion key={index} defaultExpanded={index === 0}><AccordionSummary expandIcon={<ExpandMore />}><Typography>{member.name || "અજ્ઞાત"} ({member.relation || "અજ્ઞાત સંબંધ"})</Typography></AccordionSummary><AccordionDetails><Grid container spacing={2}><Grid item xs={12} sm={6}><TextField label="નામ" value={member.name || "-"} fullWidth InputProps={{ readOnly: true }} /></Grid><Grid item xs={12} sm={6}><TextField label="સબંધ" value={member.relation || "-"} fullWidth InputProps={{ readOnly: true }} /></Grid><Grid item xs={12} sm={6}><TextField label="જન્મતારીખ" value={fmtDate(member.birthdate)} fullWidth InputProps={{ readOnly: true }} /></Grid><Grid item xs={12} sm={6}><TextField label="ઉંમર" value={member.age || calcAgeFromDOB(member.birthdate) || "-"} fullWidth InputProps={{ readOnly: true }} /></Grid><Grid item xs={12}><TextField label="લિંગ" value={member.gender === 'male' ? 'પુરુષ' : 'સ્ત્રી'} fullWidth InputProps={{ readOnly: true }} /></Grid></Grid></AccordionDetails></Accordion>))}</Stack>) : (<Typography variant="body2">કોઈ પરિવારના સભ્યો નથી</Typography>)}
                </Box>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>બંધ કરો</Button>
          {detailRequest?.status === "pending" && (<><Button onClick={() => { setDetailOpen(false); onOpenDecline(detailRequest); }} color="error">નામંજૂર કરો</Button><Button onClick={() => { setDetailOpen(false); onOpenApprove(detailRequest); }} color="success" variant="contained">મંજૂર કરો</Button></>)}
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} fullScreen={isMobile}>
        <DialogTitle>અરજી મંજૂર કરો</DialogTitle>
        <DialogContent>
          {/* 🔹 MODIFIED: Wrapped in Stack and updated text */}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>કૃપા કરી આ સભ્ય માટે <strong>સભ્ય નંબર</strong> અને <strong>રિક્વેસ્ટ નંબર</strong> દાખલ કરો:</Typography>
            <TextField 
              label="સભ્ય નંબર" 
              value={sabhyaNo} 
              onChange={(e) => setSabhyaNo(e.target.value)} 
              fullWidth 
              autoFocus 
              inputProps={{ maxLength: 20 }} 
            />
            {/* 🔹 NEW: Added TextField for Request Number */}
            <TextField 
              label="રિક્વેસ્ટ નંબર" 
              value={requestNumber} 
              onChange={(e) => setRequestNumber(e.target.value)} 
              fullWidth 
              inputProps={{ maxLength: 20 }} 
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveOpen(false)}>રદ કરો</Button>
          {/* 🔹 MODIFIED: Updated disabled check */}
          <Button 
            variant="contained" 
            onClick={onApprove} 
            disabled={submitting || !sabhyaNo.trim() || !requestNumber.trim()}
          >
            {submitting ? "મંજૂરી થઈ રહી છે..." : "મંજૂર કરો"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)} fullScreen={isMobile}>
        <DialogTitle>નામંજૂરીની ખાતરી કરો</DialogTitle>
        <DialogContent><Typography>શું તમે આ અરજી <strong>નામંજૂર</strong> કરવા ઈચ્છો છો?</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeclineOpen(false)}>રદ કરો</Button><Button variant="contained" color="error" onClick={onDeclineConfirm} disabled={submitting}>{submitting ? "નામંજૂરી થઈ રહી છે..." : "નામંજૂર કરો"}</Button></DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }} sx={{ "& .MuiSnackbarContent-root": { width: isMobile ? "90%" : "auto" } }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}