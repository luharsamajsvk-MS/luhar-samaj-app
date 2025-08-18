import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  Box,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { submitRequest } from "../services/requestService";
import api from "../services/api";

export default function RequestForm() {
  const [form, setForm] = useState({
    headName: "",
    rationNo: "",
    address: "",
    mobile: "",
    zone: "",
  });
  const [familyMembers, setFamilyMembers] = useState([]); // ✅ empty by default
  const [feedback, setFeedback] = useState({ success: "", error: "" });
  const [loading, setLoading] = useState(false);

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get("/zones/public"); // ✅ public endpoint
        setZones(res.data);
      } catch (err) {
        console.error("Failed to fetch zones:", err);
        setFeedback((f) => ({
          ...f,
          error: "ઝોન લોડ થઈ શક્યા નથી. ફરી પ્રયત્ન કરો.",
        }));
      } finally {
        setLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...familyMembers];
    updated[index][field] = value;
    setFamilyMembers(updated);
  };

  const addMember = () => {
    setFamilyMembers([...familyMembers, { name: "", relation: "", age: "" }]);
  };

  const removeMember = (index) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ success: "", error: "" });
    try {
      await submitRequest({ ...form, familyMembers });
      setFeedback({ success: "વિનંતી સફળતાપૂર્વક મોકલાઈ!", error: "" });
      setForm({
        headName: "",
        rationNo: "",
        address: "",
        mobile: "",
        zone: "",
      });
      setFamilyMembers([]);
    } catch (err) {
      setFeedback({
        success: "",
        error: err?.response?.data?.error || "વિનંતી મોકલવામાં ભૂલ થઈ.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          નોંધણી વિનંતી ફોર્મ
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          કૃપા કરીને તમામ વિગતો ભરો. એડમિન તમારી વિનંતી સમીક્ષા કરશે.
        </Typography>

        {feedback.success && <Alert severity="success">{feedback.success}</Alert>}
        {feedback.error && <Alert severity="error">{feedback.error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="મુખ્ય નામ"
              placeholder="મુખ્ય વ્યક્તિનું નામ લખો"
              name="headName"
              value={form.headName}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="રેશન નંબર"
              placeholder="રેશન કાર્ડ નંબર લખો"
              name="rationNo"
              value={form.rationNo}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="સરનામું"
              placeholder="ઘરનું સરનામું લખો"
              name="address"
              value={form.address}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="મોબાઇલ નંબર"
              placeholder="તમારો મોબાઇલ નંબર લખો"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              fullWidth
            />

            {/* ✅ Zone dropdown */}
            <FormControl fullWidth required>
              <InputLabel id="zone-label">ઝોન પસંદ કરો</InputLabel>
              <Select
                labelId="zone-label"
                label="ઝોન પસંદ કરો"
                name="zone"
                value={form.zone}
                onChange={handleChange}
                disabled={loadingZones}
              >
                <MenuItem value="" disabled>
                  ઝોન પસંદ કરો
                </MenuItem>
                {loadingZones ? (
                  <MenuItem disabled>
                    <CircularProgress size={24} />
                  </MenuItem>
                ) : (
                  zones.map((zone) => (
                    <MenuItem key={zone._id} value={zone._id}>
                      {zone.number} - {zone.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {/* Family Members (optional) */}
            <Box>
              <Typography variant="h6" gutterBottom>
                પરિવારના સભ્યો (વૈકલ્પિક)
              </Typography>
              {familyMembers.map((m, idx) => (
                <Grid
                  container
                  spacing={2}
                  alignItems="center"
                  key={idx}
                  sx={{ mb: 1 }}
                >
                  <Grid item xs={4}>
                    <TextField
                      label="નામ"
                      placeholder="સભ્યનું નામ લખો"
                      value={m.name}
                      onChange={(e) =>
                        handleMemberChange(idx, "name", e.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="સબંધ"
                      placeholder="વડાના સબંધમાં"
                      value={m.relation}
                      onChange={(e) =>
                        handleMemberChange(idx, "relation", e.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label="ઉંમર"
                      placeholder="ઉંમર લખો"
                      type="number"
                      value={m.age}
                      onChange={(e) =>
                        handleMemberChange(idx, "age", e.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton onClick={() => removeMember(idx)}>
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              <Button
                startIcon={<Add />}
                onClick={addMember}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                પરિવારનો સભ્ય ઉમેરો
              </Button>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? "મોકલી રહ્યું છે..." : "વિનંતી મોકલો"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
