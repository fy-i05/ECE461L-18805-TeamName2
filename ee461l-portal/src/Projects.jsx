import React, { useState } from "react";
import { Container, Typography, Box, Snackbar, Alert } from "@mui/material";
import ProjectCard from "./ProjectCard";

export default function Projects() {
  const [projects, setProjects] = useState([
    { id: 1, name: "Arduino App", members: 2, canJoin: true },
    { id: 2, name: "Weather Engine", members: 4, canJoin: false },
    { id: 3, name: "Card Game", members: 1, canJoin: true },
  ]);

  const [banner, setBanner] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  async function handleJoin(id) {
    try {
      const res = await fetch(`/join/${id}`);
      const data = await res.json();
      setProjects(prev =>
        prev.map(p =>
          p.id === id ? { ...p, canJoin: false, members: p.members + 1 } : p
        )
      );
      setBanner({ open: true, message: data.message, severity: "success" });
    } catch {
      setBanner({ open: true, message: "Failed to join project.", severity: "error" });
    }
  }

  async function handleLeave(id) {
    try {
      const res = await fetch(`/leave/${id}`);
      const data = await res.json();
      setProjects(prev =>
        prev.map(p =>
          p.id === id ? { ...p, canJoin: true, members: p.members - 1 } : p
        )
      );
      setBanner({ open: true, message: data.message, severity: "info" });
    } catch {
      setBanner({ open: true, message: "Failed to leave project.", severity: "error" });
    }
  }

  return (
    <Container>
      <Typography variant="h5" gutterBottom>Projects</Typography>
      {projects.map(proj => (
        <Box key={proj.id} sx={{ mb: 2 }}>
          <ProjectCard
            name={proj.name}
            members={proj.members}
            canJoin={proj.canJoin}
            onJoin={() => handleJoin(proj.id)}
            onLeave={() => handleLeave(proj.id)}
          />
        </Box>
      ))}

      <Snackbar
        open={banner.open}
        autoHideDuration={2500}
        onClose={() => setBanner({ ...banner, open: false })}
      >
        <Alert severity={banner.severity}>{banner.message}</Alert>
      </Snackbar>
    </Container>
  );
}
