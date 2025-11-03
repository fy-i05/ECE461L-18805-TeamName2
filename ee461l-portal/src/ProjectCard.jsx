import React, { useState } from "react";
import {
  Card,
  CardActions,
  Typography,
  Button,
  TextField,
  Box,
} from "@mui/material";

export default function ProjectCard({ name, members, canJoin, onJoin, onLeave }) {
  const [hwSet1, setHwSet1] = useState(50);
  const [hwSet2, setHwSet2] = useState(0);
  const [qty, setQty] = useState("");

  const handleCheckIn = async () => {
    const val = parseInt(qty) || 0;
    if (val > 0) {
      try {
        const res = await fetch(`/checkin/${name}/${val}`);
        const data = await res.json();
        alert(data.message);
        setHwSet1(prev => Math.min(prev + val, 100));
      } catch {
        alert("Check-in failed.");
      }
      setQty("");
    }
  };

  const handleCheckOut = async () => {
    const val = parseInt(qty) || 0;
    if (val > 0) {
      try {
        const res = await fetch(`/checkout/${name}/${val}`);
        const data = await res.json();
        alert(data.message);
        setHwSet1(prev => Math.max(prev - val, 0));
      } catch {
        alert("Check-out failed.");
      }
      setQty("");
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        backgroundColor: canJoin ? "#f9f9f9" : "#e8f5e9",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 240 }}>
        <Typography variant="h6">{name}</Typography>
        <Typography variant="body2" color="text.secondary">
          Members: {members}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          HWSet1: {hwSet1}/100
        </Typography>
        <Typography variant="body2">HWSet2: {hwSet2}/100</Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <TextField
          label="Enter qty"
          size="small"
          sx={{ width: 100 }}
          value={qty}
          onChange={e => setQty(e.target.value)}
        />
        <Button variant="outlined" size="small" onClick={handleCheckIn}>
          Check In
        </Button>
        <Button variant="outlined" size="small" onClick={handleCheckOut}>
          Check Out
        </Button>
      </Box>

      <CardActions>
        {canJoin ? (
          <Button variant="contained" onClick={onJoin}>
            Join
          </Button>
        ) : (
          <Button variant="outlined" color="warning" onClick={onLeave}>
            Leave
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
