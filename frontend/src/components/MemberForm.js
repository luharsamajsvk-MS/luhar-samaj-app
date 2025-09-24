// frontend/src/components/MemberForm.js
import React, { useEffect, useState } from "react";
import {
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
  Typography,
  Box,
  Stack,
  Paper,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import api from "../services/api";

const calculateAge = (dateStr) => {
  if (!dateStr) return "";
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export default function MemberForm({ memberToEdit, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    // ✅ This structure now holds the flat fields for submission
    headName: "",
    headGender: "",
    headBirthdate: "",
    headAge: "",
    rationNo: "",
    address: "",
    mobile: "",
    pincode: "",
    zone: "",
    uniqueNumber: "",
  });

  // ✅ NEW: State for additional mobiles
  const [additionalMobiles, setAdditionalMobiles] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);

  // fill when editing an existing Member
  useEffect(() => {
    if (!memberToEdit) return;

    const z = typeof memberToEdit.zone === "object" ? memberToEdit.zone?._id : memberToEdit.zone;

    setForm({
      _id: memberToEdit._id,
      headName: memberToEdit.head?.name || "",
      headGender: memberToEdit.head?.gender || "",
      headBirthdate: memberToEdit.head?.birthdate ? String(memberToEdit.head.birthdate).slice(0, 10) : "",
      headAge: memberToEdit.head?.age || (memberToEdit.head?.birthdate ? calculateAge(String(memberToEdit.head.birthdate).slice(0, 10)) : ""),
      rationNo: memberToEdit.rationNo || "",
      address: memberToEdit.address || "",
      mobile: memberToEdit.mobile || "",
      pincode: memberToEdit.pincode || "",
      zone: z || "",
      uniqueNumber: memberToEdit.uniqueNumber || "",
    });
    
    // ✅ Populate additional mobiles
    setAdditionalMobiles(memberToEdit.additionalMobiles || []);

    setFamilyMembers(
      Array.isArray(memberToEdit.familyMembers)
        ? memberToEdit.familyMembers.map((m) => ({
            name: m.name || "",
            relation: m.relation || "",
            birthdate: m.birthdate ? String(m.birthdate).slice(0, 10) : "",
            age: m.age || (m.birthdate ? calculateAge(String(m.birthdate).slice(0, 10)) : ""),
            gender: m.gender || "",
          }))
        : []
    );
  }, [memberToEdit]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get("/zones/public");
        setZones(res.data || []);
      } catch (e) {
        console.error("Failed to load zones", e);
      } finally {
        setLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "headBirthdate") {
      const age = calculateAge(value);
      setForm((f) => ({ ...f, headBirthdate: value, headAge: age }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };
  
  // ✅ Handlers for additional mobiles
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

  const addMember = () => setFamilyMembers(prev => [...prev, { name: "", relation: "", birthdate: "", age: "", gender: "" }]);
  const removeMember = (idx) => setFamilyMembers(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e) => {
    e.preventDefault();

    // ✅ Create the nested 'head' object that the backend API expects
    const payload = {
        _id: form._id,
        head: {
            name: form.headName,
            gender: form.headGender,
            birthdate: form.headBirthdate,
            age: form.headAge,
        },
        rationNo: form.rationNo,
        address: form.address,
        mobile: form.mobile,
        additionalMobiles, // ✅ Include in payload
        pincode: form.pincode,
        zone: form.zone,
        uniqueNumber: form.uniqueNumber,
        familyMembers,
    };
    onSubmit(payload);
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      {error && (<Alert sx={{ mb: 2 }} severity="error">{error}</Alert>)}
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
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

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField label="સભ્ય નંબર (Unique Number)" name="uniqueNumber" value={form.uniqueNumber} onChange={handleChange} required fullWidth size="small" /></Grid>
            <Grid item xs={12} sm={6}><TextField label="રેશન નંબર" name="rationNo" value={form.rationNo} onChange={handleChange} required fullWidth size="small" /></Grid>
            <Grid item xs={12} sm={6}><TextField label="મોબાઇલ નંબર" name="mobile" value={form.mobile} onChange={handleChange} required fullWidth size="small" /></Grid>
            <Grid item xs={12}><TextField label="સરનામું" name="address" value={form.address} onChange={handleChange} required fullWidth size="small" multiline minRows={2} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="પિનકોડ" name="pincode" value={form.pincode} onChange={handleChange} fullWidth size="small" inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }} /></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small">
                <InputLabel id="zone-label">ઝોન પસંદ કરો</InputLabel>
                <Select labelId="zone-label" id="zone" name="zone" value={form.zone} onChange={handleChange} disabled={loadingZones} label="ઝોન પસંદ કરો">
                  {loadingZones ? <MenuItem disabled><CircularProgress size={20} /></MenuItem> : zones.map((zone) => (<MenuItem key={zone._id} value={zone._id}>{zone.number} - {zone.name}</MenuItem>))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {/* ✅ Additional Mobile Numbers Section */}
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
          <Button type="submit" variant="contained" color="primary" disabled={loading}>{loading ? <CircularProgress size={24} /> : memberToEdit ? "સાચવો" : "ઉમેરો"}</Button>
        </Stack>
      </form>
    </Paper>
  );
}