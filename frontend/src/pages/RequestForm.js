// frontend/src/pages/RequestForm.js
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
    headGender: "",
    headBirthday: "", // frontend key
    headAge: "",
    rationNo: "",
    address: "",
    mobile: "",            // ✅ primary mobile (kept)
    pincode: "",
    zone: "",
  });

  // ✅ NEW: dynamic extra mobiles
  const [additionalMobiles, setAdditionalMobiles] = useState([]);

  const [familyMembers, setFamilyMembers] = useState([]);
  const [feedback, setFeedback] = useState({ success: "", error: "" });
  const [loading, setLoading] = useState(false);

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);

  // Fetch zones
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get("/zones/public");
        setZones(res.data || []);
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

  // Calculate age from date
  const calculateAge = (dateStr) => {
    if (!dateStr) return "";
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Handle form field change
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "headBirthday") {
      const age = calculateAge(value);
      setForm((f) => ({ ...f, headBirthday: value, headAge: age }));
    } else if (name === "mobile") {
      // keep only digits, cap 10
      const sanitized = value.replace(/\D/g, "").slice(0, 10);
      setForm((f) => ({ ...f, mobile: sanitized }));
    } else if (name === "pincode") {
      const sanitized = value.replace(/\D/g, "").slice(0, 6);
      setForm((f) => ({ ...f, pincode: sanitized }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  // Handle family member change
  const handleMemberChange = (index, field, value) => {
    const updated = [...familyMembers];
    if (field === "birthdate") {
      updated[index].birthdate = value;
      updated[index].age = calculateAge(value);
    } else {
      updated[index][field] = value;
    }
    setFamilyMembers(updated);
  };

  // Add new family member
  const addMember = () => {
    setFamilyMembers((prev) => [
      ...prev,
      { name: "", relation: "", birthdate: "", age: "", gender: "" },
    ]);
  };

  // Remove family member
  const removeMember = (index) => {
    setFamilyMembers((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Additional mobiles handlers
  const addAdditionalMobile = () => {
    setAdditionalMobiles((prev) => [...prev, ""]);
  };

  const removeAdditionalMobile = (idx) => {
    setAdditionalMobiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAdditionalMobileChange = (idx, value) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 10);
    setAdditionalMobiles((prev) => {
      const copy = [...prev];
      copy[idx] = sanitized;
      return copy;
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ success: "", error: "" });

    try {
      const cleanedAdditional = additionalMobiles
        .map((m) => (m || "").replace(/\D/g, "").slice(0, 10))
        .filter((m) => m.length > 0);

      const payload = {
        ...form,
        birthdate: form.headBirthday,
        familyMembers,
        additionalMobiles: cleanedAdditional, // ✅ send as array
      };

      await submitRequest(payload);

      setFeedback({ success: "વિનંતી સફળતાપૂર્વક મોકલાઈ!", error: "" });

      // Reset form
      setForm({
        headName: "",
        headGender: "",
        headBirthday: "",
        headAge: "",
        rationNo: "",
        address: "",
        mobile: "",
        pincode: "",
        zone: "",
      });
      setFamilyMembers([]);
      setAdditionalMobiles([]);
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
      <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
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
            {/* Head of Household */}
            <Typography variant="h6">મુખ્ય વ્યક્તિની માહિતી</Typography>

            {/* Head grid */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="મુખ્ય નામ"
                  name="headName"
                  value={form.headName}
                  onChange={handleChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="જન્મતારીખ"
                  name="headBirthday"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.headBirthday}
                  onChange={handleChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>

              <Grid item xs={6} sm={2}>
                <TextField
                  label="ઉંમર"
                  name="headAge"
                  type="number"
                  value={form.headAge}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={6} sm={2}>
                <FormControl fullWidth required size="small">
                  <InputLabel id="head-gender-label">લિંગ</InputLabel>
                  <Select
                    labelId="head-gender-label"
                    id="headGender"
                    name="headGender"
                    value={form.headGender}
                    onChange={handleChange}
                    label="લિંગ"
                  >
                    <MenuItem value="male">પુરુષ</MenuItem>
                    <MenuItem value="female">સ્ત્રી</MenuItem>
                    <MenuItem value="other">અન્ય</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Other fields */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="રેશન નંબર"
                  name="rationNo"
                  value={form.rationNo}
                  onChange={handleChange}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>

              {/* Primary Mobile */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="મોબાઇલ નંબર (પ્રાથમિક)"
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  fullWidth
                  size="small"
                  type="tel"
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="સરનામું"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  fullWidth
                  required
                  size="small"
                  multiline
                  minRows={2}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="પિનકોડ"
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  fullWidth
                  size="small"
                  type="tel"
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
                />
              </Grid>

              {/* Zone */}
              <Grid item xs={12}>
                <FormControl fullWidth required size="small">
                  <InputLabel id="zone-label">ઝોન પસંદ કરો</InputLabel>
                  <Select
                    labelId="zone-label"
                    id="zone"
                    name="zone"
                    value={form.zone}
                    onChange={handleChange}
                    disabled={loadingZones}
                    label="ઝોન પસંદ કરો"
                  >
                    {loadingZones ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} />
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
              </Grid>
            </Grid>

            {/* ✅ Additional Mobile Numbers */}
            <Box>
              <Typography variant="h6" gutterBottom>
                વધારાના મોબાઇલ નંબર (ઐચ્છિક)
              </Typography>

              {additionalMobiles.map((m, idx) => (
                <Grid
                  container
                  spacing={2}
                  alignItems="center"
                  key={idx}
                  sx={{ mb: 1 }}
                >
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label={`મોબાઇલ ${idx + 1}`}
                      value={m}
                      onChange={(e) =>
                        handleAdditionalMobileChange(idx, e.target.value)
                      }
                      fullWidth
                      size="small"
                      type="tel"
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }}
                    />
                  </Grid>

                  <Grid item xs="auto">
                    <IconButton aria-label="remove" onClick={() => removeAdditionalMobile(idx)}>
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}

              <Button
                startIcon={<Add />}
                onClick={addAdditionalMobile}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                મોબાઇલ ઉમેરો
              </Button>
            </Box>

            {/* Family Members */}
            <Box>
              <Typography variant="h6" gutterBottom>
                પરિવારના સભ્યો
              </Typography>

              {familyMembers.map((m, idx) => (
                <Grid
                  container
                  spacing={2}
                  alignItems="center"
                  key={idx}
                  sx={{ mb: 1 }}
                >
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="નામ"
                      value={m.name}
                      onChange={(e) =>
                        handleMemberChange(idx, "name", e.target.value)
                      }
                      fullWidth
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="સબંધ"
                      value={m.relation}
                      onChange={(e) =>
                        handleMemberChange(idx, "relation", e.target.value)
                      }
                      fullWidth
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="જન્મતારીખ"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={m.birthdate}
                      onChange={(e) =>
                        handleMemberChange(idx, "birthdate", e.target.value)
                      }
                      fullWidth
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="ઉંમર"
                      type="number"
                      value={m.age}
                      InputProps={{ readOnly: true }}
                      fullWidth
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel id={`gender-label-${idx}`}>લિંગ</InputLabel>
                      <Select
                        labelId={`gender-label-${idx}`}
                        value={m.gender}
                        onChange={(e) =>
                          handleMemberChange(idx, "gender", e.target.value)
                        }
                        label="લિંગ"
                      >
                        <MenuItem value="male">પુરુષ</MenuItem>
                        <MenuItem value="female">સ્ત્રી</MenuItem>
                        <MenuItem value="other">અન્ય</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={1}>
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

            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? "મોકલી રહ્યું છે..." : "વિનંતી મોકલો"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
