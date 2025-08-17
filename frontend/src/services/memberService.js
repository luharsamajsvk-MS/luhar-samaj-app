// src/services/memberService.js
import api from './api';

// Get all members
export const getMembers = async () => {
  try {
    console.log('📡 [MemberService] Fetching members...');
    const response = await api.get('/members'); // ✅ Removed extra /api
    console.log('✅ [MemberService] Members fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [MemberService] Error fetching members:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to fetch members';
  }
};

// Create member
export const createMember = async (memberData) => {
  try {
    console.log('📤 [MemberService] Creating member:', memberData);
    const response = await api.post('/members', memberData); // ✅
    console.log('✅ [MemberService] Member created:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [MemberService] Error creating member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to create member';
  }
};

// Update member
export const updateMember = async (id, memberData) => {
  try {
    console.log(`✏️ [MemberService] Updating member ID: ${id}`, memberData);
    const response = await api.put(`/members/${id}`, memberData); // ✅
    console.log('✅ [MemberService] Member updated:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [MemberService] Error updating member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to update member';
  }
};

// Delete member
export const deleteMember = async (id) => {
  try {
    console.log(`🗑️ [MemberService] Deleting member ID: ${id}`);
    await api.delete(`/members/${id}`); // ✅
    console.log('✅ [MemberService] Member deleted');
  } catch (error) {
    console.error(
      '❌ [MemberService] Error deleting member:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to delete member';
  }
};

// Generate member card PDF
export const generateMemberCardPDF = async (id) => {
  try {
    console.log(`📄 [MemberService] Generating PDF for member ID: ${id}`);
    const response = await api.get(`/members/${id}/pdf`, {
      responseType: 'blob'
    }); // ✅
    console.log('✅ [MemberService] PDF generated');
    return new Blob([response.data], { type: 'application/pdf' });
  } catch (error) {
    console.error(
      '❌ [MemberService] Error generating PDF:',
      error.response?.data || error.message
    );
    throw error.response?.data?.error || 'Failed to generate PDF';
  }
};
