  // frontend/src/pages/RequestForm.js
  import React, { useEffect, useState } from "react";
  import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    IconButton,
    Box,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
  } from "@mui/material";
  import { Add, Delete } from "@mui/icons-material";
  import { useNavigate } from "react-router-dom";
  import api from "../services/api"; // For fetching zones
  import { submitRequest } from "../services/requestService"; // For submitting the form

  // Helper function from MemberForm
  const calculateAge = (dateStr) => {
    if (!dateStr) return "";
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  export default function RequestForm() {
    const navigate = useNavigate();
    
    // ✅ State matches MemberForm, but WITHOUT uniqueNumber and issueDate
    const [form, setForm] = useState({
      headName: "",
      headGender: "",
      headBirthdate: "",
      headAge: "",
      rationNo: "",
      address: "",
      city: "",
      mobile: "",
      pincode: "",
      zone: "",
    });

    // ✅ Other states copied from MemberForm
    const [additionalMobiles, setAdditionalMobiles] = useState([]);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [zones, setZones] = useState([]);
    
    // State for loading, error, and success
    const [loading, setLoading] = useState(false);
    const [loadingZones, setLoadingZones] = useState(true);
    const [error, setError] = useState("");
    const [successOpen, setSuccessOpen] = useState(false);

    useEffect(() => {
      const fetchZones = async () => {
        try {
          setLoadingZones(true);
          const res = await api.get("/zones/public"); // Use public zone endpoint
          setZones(res.data || []);
        } catch (e) {
          console.error("Failed to load zones", e);
          setError("ઝોન લોડ કરવામાં નિષ્ફળ.");
        } finally {
          setLoadingZones(false);
        }
      };
      fetchZones();
    }, []);

    // ✅ Copied from MemberForm
    const handleChange = (e) => {
      const { name, value } = e.target;
      if (name === "headBirthdate") {
        const age = calculateAge(value);
        setForm((f) => ({ ...f, headBirthdate: value, headAge: age }));
      } else {
        setForm((f) => ({ ...f, [name]: value }));
      }
    };
    
    // ✅ Copied from MemberForm
    const addAdditionalMobile = () => setAdditionalMobiles(prev => [...prev, ""]);
    const removeAdditionalMobile = (idx) => setAdditionalMobiles(prev => prev.filter((_, i) => i !== idx));
    const handleAdditionalMobileChange = (idx, value) => {
        const sanitized = value.replace(/\D/g, "").slice(0, 10);
        setAdditionalMobiles(prev => {
            const copy = [...prev];
            copy[idx] = sanitized;
            return copy;
        });
    };

    // ✅ Copied from MemberForm
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

    // ✅ Copied from MemberForm
    const addMember = () => setFamilyMembers(prev => [...prev, { name: "", relation: "", birthdate: "", age: "", gender: "" }]);
    const removeMember = (idx) => setFamilyMembers(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      // ✅ Payload matches MemberForm, but WITHOUT _id, uniqueNumber, and issueDate
      const payload = {
          head: {
              name: form.headName,
              gender: form.headGender,
              birthdate: form.headBirthdate,
              age: form.headAge,
          },
          rationNo: form.rationNo,
          address: form.address,
          city: form.city,
          mobile: form.mobile,
          additionalMobiles,
          pincode: form.pincode,
          zone: form.zone,
          familyMembers,
      };

      try {
        await submitRequest(payload); // Use function from requestService
        setSuccessOpen(true);
      } catch (err) {
        console.error("Submit error:", err.response || err);
        setError(err.response?.data?.error || "અરજી સબમિટ કરવામાં નિષ્ફળ. કૃપા કરી ફરી પ્રયાસ કરો.");
        setLoading(false);
      }
    };

    const handleSuccessClose = () => {
      setSuccessOpen(false);
      navigate('/'); // Redirect to home page
    };

    return (
      <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 3 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ fontWeight: 600 }}>
            સભ્ય નોંધણી ફોર્મ
          </Typography>
          <Typography variant="body1" align="center" gutterBottom>
            કૃપા કરીને નીચેની વિગતો કાળજીપૂર્વક ભરો.
          </Typography>
          
          {error && (<Alert sx={{ mb: 2, mt: 2 }} severity="error">{error}</Alert>)}
          
          <form onSubmit={handleSubmit}>
            <Stack spacing={3} sx={{ mt: 3 }}>
              
              {/* ✅ Copied from MemberForm */}
              <Typography variant="h6">મુખ્ય વ્યક્તિની માહિતી</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}><TextField label="મુખ્ય નામ" name="headName" value={form.headName} onChange={handleChange} fullWidth required size="small" /></Grid>
                <Grid item xs={12} sm={4}><TextField label="જન્મતારીખ" name="headBirthdate" type="date" InputLabelProps={{ shrink: true }} value={form.headBirthdate} onChange={handleChange} fullWidth required size="small" /></Grid>
                <Grid item xs={6} sm={2}><TextField label="ઉંમર" name="headAge" type="number" value={form.headAge} InputProps={{ readOnly: true }} fullWidth size="small" /></Grid>
                <Grid item xs={6} sm={2}>
                  <FormControl fullWidth required size="small">
                    <InputLabel id="head-gender-label">લિંગ</InputLabel>
                    <Select labelId="head-gender-label" id="headGender" name="headGender" value={form.headGender} onChange={handleChange} label="લિંગ">
                      <MenuItem value="male">પુરુષ</MenuItem><MenuItem value="female">સ્ત્રી</MenuItem><MenuItem value="other">અન્ય</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* ✅ Grid copied, but uniqueNumber and issueDate fields are REMOVED */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField label="રેશન નંબર" name="rationNo" value={form.rationNo} onChange={handleChange} required fullWidth size="small" /></Grid>
                <Grid item xs={12} sm={6}><TextField label="મોબાઇલ નંબર" name="mobile" value={form.mobile} onChange={handleChange} required fullWidth size="small" inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }} /></Grid>
                <Grid item xs={12}><TextField label="સરનામું" name="address" value={form.address} onChange={handleChange} required fullWidth size="small" multiline minRows={2} /></Grid>
                <Grid item xs={12} sm={4}><TextField label="શહેર" name="city" value={form.city} onChange={handleChange} fullWidth size="small" /></Grid>
                <Grid item xs={12} sm={4}><TextField label="પિનકોડ" name="pincode" value={form.pincode} onChange={handleChange} fullWidth size="small" inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }} /></Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth required size="small">
                    <InputLabel id="zone-label">ઝોન પસંદ કરો</InputLabel>
                    <Select labelId="zone-label" id="zone" name="zone" value={form.zone} onChange={handleChange} disabled={loadingZones} label="ઝોન પસંદ કરો">
                      {loadingZones ? <MenuItem disabled><CircularProgress size={20} /></MenuItem> : zones.map((zone) => (<MenuItem key={zone._id} value={zone._id}>{zone.number} - {zone.name}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              {/* ✅ Copied from MemberForm */}
              <Box>
                  <Typography variant="h6" gutterBottom>વધારાના મોબાઇલ નંબર</Typography>
                  {additionalMobiles.map((m, idx) => (
                      <Grid container spacing={2} alignItems="center" key={idx} sx={{ mb: 1 }}>
                          <Grid item xs={10}><TextField label={`મોબાઇલ ${idx + 2}`} value={m} onChange={(e) => handleAdditionalMobileChange(idx, e.target.value)} fullWidth size="small" type="tel" inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }} /></Grid>
                          <Grid item xs={2}><IconButton aria-label="remove" onClick={() => removeAdditionalMobile(idx)}><Delete /></IconButton></Grid>
                      </Grid>
                  ))}
                  <Button startIcon={<Add />} onClick={addAdditionalMobile} variant="outlined" sx={{ mt: 1 }}>મોબાઇલ ઉમેરો</Button>
              </Box>

              {/* ✅ Copied from MemberForm */}
              <Box>
                <Typography variant="h6" gutterBottom>પરિવારના સભ્યો</Typography>
                {familyMembers.map((m, idx) => (
                  <Grid container spacing={2} alignItems="center" key={idx} sx={{ mb: 1 }}>
                    <Grid item xs={12} sm={3}><TextField label="નામ" value={m.name} onChange={(e) => handleMemberChange(idx, "name", e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={12} sm={2}><TextField label="સબંધ" value={m.relation} onChange={(e) => handleMemberChange(idx, "relation", e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={12} sm={2}><TextField label="જન્મતારીખ" type="date" InputLabelProps={{ shrink: true }} value={m.birthdate} onChange={(e) => handleMemberChange(idx, "birthdate", e.target.value)} fullWidth size="small" /></Grid>
                    <Grid item xs={12} sm={2}><TextField label="ઉંમર" type="number" value={m.age} InputProps={{ readOnly: true }} fullWidth size="small" /></Grid>
                    <Grid item xs={12} sm={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel id={`gender-label-${idx}`}>લિંગ</InputLabel>
                        <Select labelId={`gender-label-${idx}`} value={m.gender} onChange={(e) => handleMemberChange(idx, "gender", e.target.value)} label="લિંગ">
                          <MenuItem value="male">પુરુષ</MenuItem><MenuItem value="female">સ્ત્રી</MenuItem><MenuItem value="other">અન્ય</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={1}><IconButton onClick={() => removeMember(idx)}><Delete /></IconButton></Grid>
                  </Grid>
                ))}
                <Button startIcon={<Add />} onClick={addMember} variant="outlined" sx={{ mt: 1 }}>પરિવારનો સભ્ય ઉમેરો</Button>
              </Box>
              
              <Button type="submit" variant="contained" color="primary" disabled={loading} fullWidth sx={{ p: 1.5, fontSize: '1rem' }}>
                {loading ? <CircularProgress size={24} /> : "અરજી સબમિટ કરો"}
              </Button>
            </Stack>
          </form>
        </Paper>

        {/* Success Dialog */}
        <Dialog open={successOpen} onClose={handleSuccessClose}>
          <DialogTitle>અરજી સફળ</DialogTitle>
          <DialogContent>
            <DialogContentText>
              તમારી અરજી સફળતાપૂર્વક સબમિટ કરવામાં આવી છે. એડમિન દ્વારા મંજૂરી મળ્યા બાદ તમારો સંપર્ક કરવામાં આવશે.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSuccessClose} autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }