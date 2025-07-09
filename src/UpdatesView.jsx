import React, { useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";

const allServices = [
  "Host Updater Service",
  "Host Discovery Service",
  "Port Discovery Service",
];

export function UpdatesView({ notifications = [] }) {
  const [activeFilters, setActiveFilters] = useState([]);
  const [deleteMsg, setDeleteMsg] = useState("");

  const toggleFilter = (service) => {
    setActiveFilters((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  };

  const filtered = activeFilters.length
    ? notifications.filter((n) => activeFilters.includes(n.service))
    : notifications;

  const deleteAll = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/notifications/delete",
        {
          method: "POST",
        },
      );
      if (res.ok) {
        setDeleteMsg(`${notifications.length} notifications deleted`);
        notifications.length = 0; // Clear in memory
        setActiveFilters([]);
      }
    } catch (err) {
      console.error("Failed to delete notifications", err);
    }
  };

  return (
    <Box sx={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#000" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: "#fff",
            fontSize: "1.4rem",
            letterSpacing: "0.3px",
            px: 1,
            py: 3,
          }}
        >
          Updates & Alerts
        </Typography>

        <Button
          variant="outlined"
          size="small"
          onClick={deleteAll}
          startIcon={<DeleteIcon />}
          sx={{
            color: "#f44336",
            borderColor: "#f44336",
            fontWeight: 500,
            textTransform: "none",
            borderRadius: 2,
            "&:hover": {
              backgroundColor: "#181818",
              borderColor: "#f44336",
            },
          }}
        >
          Delete All
        </Button>
      </Stack>

      {/* Filter Pills */}
      <Stack direction="row" spacing={1} mt={2} mb={2} flexWrap="wrap">
        {allServices.map((service) => {
          const selected = activeFilters.includes(service);
          return (
            <Chip
              key={service}
              label={service}
              onClick={() => toggleFilter(service)}
              icon={selected ? <CheckIcon sx={{ fontSize: 18 }} /> : null}
              sx={{
                color: selected ? "#ffb57d" : "#ccc",
                backgroundColor: selected ? "#3a2721" : "#000000",
                border: selected ? "2px solid #ff784e" : "1px solid #2a2a2a",
                fontWeight: 600,
                fontSize: "0.85rem",
                px: 2,
                height: 36,
                borderRadius: "20px",
                fontFamily: "'Inter', sans-serif",
                "& .MuiChip-icon": {
                  color: selected ? "#ffb57d" : "#888",
                },
              }}
              clickable
            />
          );
        })}
      </Stack>
      <Box
        sx={{
          backgroundColor: "transparent",
          borderRadius: 0,
          px: 0,
          py: 0,
          boxShadow: "none",
        }}
      >
        <List disablePadding>
          {filtered.length === 0 && (
            <Typography
              sx={{
                color: "#aaa",
                textAlign: "center",
                py: 4,
                fontStyle: "italic",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              No updates found.
            </Typography>
          )}

          {filtered.map((n, i) => (
            <React.Fragment key={n.id}>
              <ListItem
                sx={{
                  alignItems: "flex-start",
                  backgroundColor: n.read ? "#000000" : "#111111",
                  borderLeft: n.read
                    ? "3px solid transparent"
                    : "3px solid #00e676",
                  borderRadius: 2,
                  mb: 1,
                  px: 2,
                  py: 1.5,
                  boxShadow: "none",
                }}
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            color: "#fff",
                            fontWeight: n.read ? 500 : 600,
                            fontSize: "1rem",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {n.message}
                        </Typography>

                        <Stack
                          direction="row"
                          spacing={1}
                          mt={0.5}
                          flexWrap="wrap"
                        >
                          <Chip
                            label={n.service}
                            size="small"
                            sx={{
                              px: 1.5,
                              color: "#88b6a1",
                              backgroundColor: "#1c3027",
                              borderRadius: "16px",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              fontFamily: "'Inter', sans-serif",
                            }}
                          />
                          <Chip
                            label={n.ssid || "Unknown"}
                            size="small"
                            sx={{
                              px: 1.5,
                              color: "#c5c5c5",
                              backgroundColor: "#2a2a2a",
                              borderRadius: "16px",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              fontFamily: "'Inter', sans-serif",
                            }}
                          />
                        </Stack>
                      </Box>

                      {!n.read && (
                        <Chip
                          icon={
                            <NotificationsActiveIcon sx={{ fontSize: 18 }} />
                          }
                          label="New"
                          size="small"
                          sx={{
                            color: "#00e676",
                            bgcolor: "#0f0f0f",
                            fontWeight: 500,
                            borderRadius: 1,
                            height: 24,
                            fontFamily: "'Inter', sans-serif",
                          }}
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#888",
                        fontSize: "0.8rem",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {new Date(n.timestamp).toLocaleString()}
                    </Typography>
                  }
                />
              </ListItem>
              {i !== filtered.length - 1 && (
                <Divider sx={{ bgcolor: "#2a2a2a", mx: 1 }} />
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
      <Snackbar
        open={!!deleteMsg}
        autoHideDuration={4000}
        onClose={() => setDeleteMsg("")}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setDeleteMsg("")}
          sx={{ fontWeight: 500, fontFamily: "'Inter', sans-serif" }}
        >
          {deleteMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
