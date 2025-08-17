// src/components/MemberList.js

import React from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CardMembershipIcon from '@mui/icons-material/CardMembership';

const MemberList = ({ refresh, onGenerateCard }) => {
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch members on component mount or when `refresh` changes
  React.useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await axios.get('/api/members'); // Adjust endpoint as needed
        setMembers(response.data);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [refresh]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <CircularProgress />
        <Typography variant="body1" style={{ marginTop: '1rem' }}>
          Loading members...
        </Typography>
      </div>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Member ID</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member._id}>
              <TableCell>{member.name}</TableCell>
              <TableCell>{member.memberId}</TableCell>
              <TableCell>{member.phone}</TableCell>
              <TableCell align="center">
                <IconButton onClick={() => onGenerateCard(member)} title="Generate Card">
                  <CardMembershipIcon color="primary" />
                </IconButton>
                <IconButton onClick={() => console.log('Edit', member)} title="Edit Member">
                  <EditIcon color="secondary" />
                </IconButton>
                <IconButton onClick={() => console.log('Delete', member)} title="Delete Member">
                  <DeleteIcon color="error" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MemberList;
