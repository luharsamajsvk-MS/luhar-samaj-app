// frontend/src/pages/MemberForm.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  TextField, 
  Button, 
  Grid, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select,
  CircularProgress,
  Alert,
  IconButton,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const MemberForm = ({ onSave, zones, loadingZones, memberToEdit }) => {
  const [formData, setFormData] = useState({
    headName: '',
    rationNo: '',
    sabhyaNumber: '',   // ✅ renamed
    address: '',
    mobile: '',
    zone: '',
    familyMembers: [{ name: '', relation: '', age: '' }]
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Initialize form for editing
  useEffect(() => {
    if (memberToEdit) {
      const zoneId = typeof memberToEdit.zone === 'object' 
        ? memberToEdit.zone._id 
        : memberToEdit.zone;
      
      setFormData({
        _id: memberToEdit._id,
        headName: memberToEdit.headName,
        rationNo: memberToEdit.rationNo,
        sabhyaNumber: memberToEdit.sabhyaNumber || memberToEdit.uniqueNumber || '', // ✅ support old field too
        address: memberToEdit.address,
        mobile: memberToEdit.mobile || '',
        zone: zoneId || '',
        familyMembers: memberToEdit.familyMembers.length > 0 
          ? memberToEdit.familyMembers.map(m => ({
              name: m.name || '',
              relation: m.relation || '',
              age: m.age || ''
            }))
          : [{ name: '', relation: '', age: '' }]
      });
    } else {
      setFormData({
        headName: '',
        rationNo: '',
        sabhyaNumber: '',
        address: '',
        mobile: '',
        zone: '',
        familyMembers: [{ name: '', relation: '', age: '' }]
      });
    }
  }, [memberToEdit]);

  // ✅ Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFamilyMemberChange = (index, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFamilyMembers = [...prev.familyMembers];
      newFamilyMembers[index] = { ...newFamilyMembers[index], [name]: value };
      return { ...prev, familyMembers: newFamilyMembers };
    });
  };

  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, { name: '', relation: '', age: '' }]
    }));
  };

  const removeFamilyMember = (index) => {
    if (formData.familyMembers.length <= 1) return;
    setFormData(prev => {
      const newFamilyMembers = [...prev.familyMembers];
      newFamilyMembers.splice(index, 1);
      return { ...prev, familyMembers: newFamilyMembers };
    });
  };

  // ✅ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.headName || !formData.rationNo || !formData.sabhyaNumber || !formData.address || !formData.zone) {
      setError('કૃપા કરીને બધા ફરજિયાત ક્ષેત્રો ભરો');
      setIsSubmitting(false);
      return;
    }

    // Family members not mandatory (only filter valid ones)
    const cleanedFamily = formData.familyMembers
      .filter(m => m.name && m.relation && m.age)
      .map(m => ({
        ...m,
        age: Number(m.age)
      }));

    try {
      await onSave({ 
        ...formData, 
        uniqueNumber: formData.sabhyaNumber, // ✅ map to old backend field
        familyMembers: cleanedFamily 
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'સાચવવામાં ભૂલ આવી');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={2}>
        {/* Head of Family */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="મુખ્ય સભ્યનું નામ *"
            name="headName"
            value={formData.headName}
            onChange={handleChange}
            required
          />
        </Grid>

        {/* Ration Card */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="રેશન કાર્ડ નંબર *"
            name="rationNo"
            value={formData.rationNo}
            onChange={handleChange}
            required
          />
        </Grid>

        {/* Sabhya Number */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="સભ્ય નંબર *"
            name="sabhyaNumber"
            value={formData.sabhyaNumber}
            onChange={handleChange}
            required
          />
        </Grid>

        {/* Mobile */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="મોબાઇલ નંબર"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
          />
        </Grid>

        {/* Address */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="સરનામું *"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            multiline
            rows={3}
          />
        </Grid>

        {/* Zone Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>ઝોન *</InputLabel>
            <Select
              name="zone"
              value={formData.zone}
              onChange={handleChange}
              disabled={loadingZones}
            >
              <MenuItem value="" disabled>ઝોન પસંદ કરો</MenuItem>
              {loadingZones ? (
                <MenuItem disabled>
                  <CircularProgress size={24} />
                </MenuItem>
              ) : (
                zones.map(zone => (
                  <MenuItem key={zone._id} value={zone._id}>
                    {zone.number} - {zone.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Family Members */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            પરિવારના સભ્યો (વૈકલ્પિક)
          </Typography>
        </Grid>
        
        {formData.familyMembers.map((member, index) => (
          <React.Fragment key={index}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label={`સભ્ય ${index + 1} નામ`}
                name="name"
                value={member.name}
                onChange={(e) => handleFamilyMemberChange(index, e)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="સંબંધ"
                name="relation"
                value={member.relation}
                onChange={(e) => handleFamilyMemberChange(index, e)}
              />
            </Grid>
            <Grid item xs={10} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="ઉંમર"
                name="age"
                value={member.age}
                onChange={(e) => handleFamilyMemberChange(index, e)}
              />
            </Grid>
            <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
              {formData.familyMembers.length > 1 && (
                <IconButton 
                  color="error"
                  onClick={() => removeFamilyMember(index)}
                  aria-label="સભ્ય કાઢો"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Grid>
          </React.Fragment>
        ))}
        
        <Grid item xs={12}>
          <Button 
            type="button" 
            variant="outlined" 
            onClick={addFamilyMember}
            startIcon={<AddIcon />}
            sx={{ mr: 2 }}
          >
            સભ્ય ઉમેરો
          </Button>
        </Grid>
        
        {/* Submit */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={isSubmitting || loadingZones}
            fullWidth
          >
            {isSubmitting ? (
              <CircularProgress size={24} />
            ) : memberToEdit ? (
              'સભ્ય સુધારો'
            ) : (
              'સભ્ય સાચવો'
            )}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

MemberForm.propTypes = {
  onSave: PropTypes.func.isRequired,
  zones: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      number: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ),
  loadingZones: PropTypes.bool,
  memberToEdit: PropTypes.object
};

MemberForm.defaultProps = {
  zones: [],
  loadingZones: false,
  memberToEdit: null
};

export default MemberForm;
