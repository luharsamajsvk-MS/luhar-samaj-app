import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function ZonePeopleDialog({ open, onClose, zoneName, loading, people = [], error = null }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        People in {zoneName || 'Zone'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : people.length === 0 ? (
          <Typography>No people found in this zone</Typography>
        ) : (
          <List>
            {people.map((p) => (
              <ListItem key={p._id} disableGutters>
                <ListItemText
                  primary={p.name}
                  secondary={[
                    p.age != null ? `Age: ${p.age}` : null,
                    p.phone ? `Phone: ${p.phone}` : null,
                    p.address ? `Address: ${p.address}` : null,
                    p.relation ? `Relation: ${p.relation}` : null
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ZonePeopleDialog;
