// frontend/src/pages/Requests.js
import React, { useEffect, useState } from "react";
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
  TableSortLabel,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Box,
} from "@mui/material";
import { Check, Close, Search } from "@mui/icons-material";
import {
  getRequests,
  approveRequest,
  declineRequest,
  getZones,
} from "../services/api";

export default function Requests() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Sorting
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Reduced for mobile
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");
  
  // Search
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [approveOpen, setApproveOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sabhyaNo, setSabhyaNo] = useState(""); 
  
  const [submitting, setSubmitting] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [zoneMap, setZoneMap] = useState({});
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Enhanced zone rendering
  const renderZone = (r) => {
    const z = r?.payload?.zone;
    if (!z) return "-";
    
    if (typeof z === "string") {
      return zoneMap[z] || z;
    }
    
    if (typeof z === "object") {
      return z.number && z.name
        ? `${z.number} - ${z.name}`
        : z.name || z.number || "-";
    }
    
    return "-";
  };

  // Enhanced family members rendering
  const renderFamilyNames = (r) => {
    const list = r?.payload?.familyMembers;
    if (!Array.isArray(list) || list.length === 0) return "-";

    return (
      <Stack spacing={0.5}>
        {list.map((m, idx) => (
          <Typography key={idx} variant="body2">
            {m?.name || "-"}{" "}
            {m?.age && (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
              >
                ({m.age})
              </Typography>
            )}
          </Typography>
        ))}
      </Stack>
    );
  };

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: reqs }, { data: zs }] = await Promise.all([
        getRequests(),
        getZones(),
      ]);
      
      setRows(reqs || []);
      setZones(zs || []);

      const zmap = {};
      (zs || []).forEach((z) => {
        zmap[z._id] = `${z.number} - ${z.name}`;
      });
      setZoneMap(zmap);
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "ડેટા લોડ થવામાં ભૂલ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Apply search filter whenever rows or searchTerm changes
  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = rows.filter((row) => {
        return (
          (row?.payload?.headName?.toLowerCase() || "").includes(term) ||
          (row?.payload?.mobile?.toLowerCase() || "").includes(term) ||
          (row?.payload?.rationNo?.toLowerCase() || "").includes(term) ||
          (renderZone(row).toLowerCase() || "").includes(term)
        );
      });
      setFilteredRows(filtered);
    } else {
      setFilteredRows([...rows]);
    }
    setPage(0); // Reset to first page when search changes
  }, [searchTerm, rows]);

  // Handle sorting
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Sort rows based on order and orderBy
  const getSortedRows = () => {
    return filteredRows.sort((a, b) => {
      let comparison = 0;
      
      if (orderBy === "createdAt") {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        comparison = dateA - dateB;
      } else {
        const valA = a.payload?.[orderBy] || "";
        const valB = b.payload?.[orderBy] || "";
        comparison = valA.localeCompare(valB);
      }
      
      return order === "desc" ? -comparison : comparison;
    });
  };

  // Paginated rows
  const paginatedRows = getSortedRows().slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const onOpenApprove = (row) => {
    setSelected(row);
    setSabhyaNo(""); 
    setApproveOpen(true);
  };

  const onApprove = async () => {
    if (!selected?._id) return;
    setSubmitting(true);
    try {
      await approveRequest(selected._id, sabhyaNo); 
      showSnackbar("અરજી મંજૂર કરી સભ્ય તરીકે ઉમેરાયો!", "success");
      setApproveOpen(false);
      await load();
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "મંજૂરી નિષ્ફળ ગઈ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenDecline = (row) => {
    setSelected(row);
    setDeclineOpen(true);
  };

  const onDeclineConfirm = async () => {
    if (!selected?._id) return;
    setSubmitting(true);
    try {
      await declineRequest(selected._id);
      showSnackbar("અરજી નામંજૂર કરી કાઢી નાખી.", "info");
      setDeclineOpen(false);
      await load();
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "નામંજૂરી નિષ્ફળ ગઈ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Mobile-friendly row rendering
  const renderMobileRow = (r) => (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }} elevation={1}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight="bold">
            {r?.payload?.headName || "-"}
          </Typography>
          <Stack direction="row">
            <IconButton onClick={() => onOpenApprove(r)} size="small">
              <Check color="success" />
            </IconButton>
            <IconButton onClick={() => onOpenDecline(r)} size="small">
              <Close color="error" />
            </IconButton>
          </Stack>
        </Stack>
        
        <Typography variant="body2">
          <Box component="span" fontWeight="bold">મોબાઇલ:</Box> {r?.payload?.mobile || "-"}
        </Typography>
        
        <Typography variant="body2">
          <Box component="span" fontWeight="bold">ઝોન:</Box> {renderZone(r)}
        </Typography>
        
        <Typography variant="body2">
          <Box component="span" fontWeight="bold">રેશન નંબર:</Box> {r?.payload?.rationNo || "-"}
        </Typography>
        
        <Typography variant="body2">
          <Box component="span" fontWeight="bold">સરનામું:</Box> {r?.payload?.address || "-"}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
        </Typography>
        
        <Typography variant="body2" fontWeight="bold">
          પરિવારના સભ્યો:
        </Typography>
        {renderFamilyNames(r)}
      </Stack>
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 2, px: isMobile ? 1 : 4 }}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: isMobile ? "1.3rem" : "inherit" }}>
          બાકી રહેલ નોંધણી અરજીઓ
        </Typography>

        {/* Search Bar */}
        <TextField
          variant="outlined"
          placeholder="શોધો..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ 
            width: "100%",
            "& .MuiOutlinedInput-root": { 
              borderRadius: 3,
              backgroundColor: "background.paper"
            }
          }}
        />

        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <>
            {isMobile ? (
              /* Mobile View */
              <Stack>
                {filteredRows.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
                    <Typography>
                      {searchTerm 
                        ? "કોઈ અરજીઓ મળી નથી" 
                        : "કોઈ બાકી અરજીઓ નથી"}
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
                    {paginatedRows.map((r) => (
                      <Box key={r._id}>
                        {renderMobileRow(r)}
                      </Box>
                    ))}
                  </Box>
                )}
                
                {/* Pagination for Mobile */}
                {filteredRows.length > 0 && (
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredRows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    labelRowsPerPage="પ્રતિ પૃષ્ઠ:"
                    labelDisplayedRows={({ from, to, count }) => 
                      `${from}-${to} / ${count}`
                    }
                    sx={{ 
                      borderTop: "1px solid rgba(224, 224, 224, 1)",
                      position: "sticky",
                      bottom: 0,
                      backgroundColor: "background.paper",
                      zIndex: 1
                    }}
                  />
                )}
              </Stack>
            ) : (
              /* Desktop View */
              <Paper sx={{ p: 2, borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === "headName"}
                            direction={orderBy === "headName" ? order : "asc"}
                            onClick={() => handleRequestSort("headName")}
                          >
                            મુખ્ય સભ્ય નામ
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>મોબાઇલ</TableCell>
                        <TableCell>ઝોન</TableCell>
                        <TableCell>પરિવારના સભ્યો</TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === "rationNo"}
                            direction={orderBy === "rationNo" ? order : "asc"}
                            onClick={() => handleRequestSort("rationNo")}
                          >
                            રેશન નંબર
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>સરનામું</TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === "createdAt"}
                            direction={orderBy === "createdAt" ? order : "desc"}
                            onClick={() => handleRequestSort("createdAt")}
                          >
                            તારીખ
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">ક્રિયા</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            {searchTerm 
                              ? "કોઈ અરજીઓ મળી નથી" 
                              : "કોઈ બાકી અરજીઓ નથી"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRows.map((r) => (
                          <TableRow key={r._id} hover>
                            <TableCell>{r?.payload?.headName || "-"}</TableCell>
                            <TableCell>{r?.payload?.mobile || "-"}</TableCell>
                            <TableCell>{renderZone(r)}</TableCell>
                            <TableCell>{renderFamilyNames(r)}</TableCell>
                            <TableCell>{r?.payload?.rationNo || "-"}</TableCell>
                            <TableCell>{r?.payload?.address || "-"}</TableCell>
                            <TableCell>
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton onClick={() => onOpenApprove(r)} title="મંજૂર કરો">
                                <Check color="success" />
                              </IconButton>
                              <IconButton onClick={() => onOpenDecline(r)} title="નામંજૂર કરો">
                                <Close color="error" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
                
                {/* Pagination for Desktop */}
                {filteredRows.length > 0 && (
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredRows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    labelRowsPerPage="પ્રતિ પૃષ્ઠ:"
                    labelDisplayedRows={({ from, to, count }) => 
                      `${from}-${to} / ${count}`
                    }
                    sx={{ borderTop: "1px solid rgba(224, 224, 224, 1)" }}
                  />
                )}
              </Paper>
            )}
          </>
        )}
      </Stack>

      {/* Approve Dialog - Responsive */}
      <Dialog 
        open={approveOpen} 
        onClose={() => setApproveOpen(false)}
        fullScreen={isMobile}
      >
        <DialogTitle>અરજી મંજૂર કરો</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            કૃપા કરી આ સભ્ય માટે <strong>સભ્ય નંબર</strong> દાખલ કરો:
          </Typography>
          <TextField
            label="સભ્ય નંબર"
            value={sabhyaNo}
            onChange={(e) => setSabhyaNo(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 10 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveOpen(false)}>રદ કરો</Button>
          <Button
            variant="contained"
            onClick={onApprove}
            disabled={submitting || !sabhyaNo.trim()}
          >
            {submitting ? "મંજૂરી થઈ રહી છે..." : "મંજૂર કરો"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decline Confirmation Dialog - Responsive */}
      <Dialog 
        open={declineOpen} 
        onClose={() => setDeclineOpen(false)}
        fullScreen={isMobile}
      >
        <DialogTitle>નામંજૂરીની ખાતરી કરો</DialogTitle>
        <DialogContent>
          <Typography>
            શું તમે આ અરજી <strong>નામંજૂર</strong> કરવા ઈચ્છો છો?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeclineOpen(false)}>રદ કરો</Button>
          <Button
            variant="contained"
            color="error"
            onClick={onDeclineConfirm}
            disabled={submitting}
          >
            {submitting ? "નામંજૂરી થઈ રહી છે..." : "નામંજૂર કરો"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ 
          "& .MuiSnackbarContent-root": {
            width: isMobile ? "90%" : "auto"
          } 
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}