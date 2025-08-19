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
} from "@mui/material";
import { Check, Close } from "@mui/icons-material";
import {
  getRequests,
  approveRequest,
  declineRequest,
  getZones,
} from "../services/api";

export default function Requests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [approveOpen, setApproveOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sabhyaNo, setSabhyaNo] = useState(""); 

  const [submitting, setSubmitting] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  const [zones, setZones] = useState([]);
  const [zoneMap, setZoneMap] = useState({});

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          બાકી રહેલ નોંધણી અરજીઓ
        </Typography>

        <Paper sx={{ p: 2, borderRadius: 3 }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>મુખ્ય સભ્ય નામ</TableCell>
                  <TableCell>મોબાઇલ</TableCell>
                  <TableCell>ઝોન</TableCell>
                  <TableCell>પરિવારના સભ્યો</TableCell>
                  <TableCell>રેશન નંબર</TableCell>
                  <TableCell>સરનામું</TableCell>
                  <TableCell>તારીખ</TableCell>
                  <TableCell align="right">ક્રિયા</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      કોઈ બાકી અરજીઓ નથી
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
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
                        <Check />
                      </IconButton>
                      <IconButton onClick={() => onOpenDecline(r)} title="નામંજૂર કરો">
                        <Close />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Stack>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)}>
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

      {/* Decline Confirmation Dialog */}
      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)}>
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
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
