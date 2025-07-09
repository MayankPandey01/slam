import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Switch,
  Button,
  Divider,
  Stack,
  Snackbar,
  Alert,
  TextField,
  FormHelperText,
} from "@mui/material";

const DEFAULT_SETTINGS = {
  host_discovery: false,
  port_scan: false,
  host_updater: false,
  host_update_notification: true,
  host_discovery_notification: true,
  port_discovery_notification: true,
  port_scan_top_ports: 100,
  host_discovery_interval: 15,
  port_discovery_interval: 30,
};

export function SettingsView() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const merged = { ...DEFAULT_SETTINGS, ...(data?.[0] || {}) };
        setSettings(merged);
        setOriginalSettings(merged);
        setDirty(false);
      })
      .catch((err) => {
        console.error("Failed to load settings", err);
        setSnackbar({
          open: true,
          message: "Failed to load settings",
          severity: "error",
        });
      });
  }, []);

  const isDirty = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setDirty(isDirty(updated, originalSettings));
  };

  const handleInputChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setDirty(isDirty(updated, originalSettings));
  };

  const handleSave = () => {
    fetch("http://localhost:5000/api/settings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save");
        setOriginalSettings(settings);
        setDirty(false);
        setSnackbar({
          open: true,
          message:
            "Settings saved. A restart may be required to apply changes.",
          severity: "success",
        });
      })
      .catch(() =>
        setSnackbar({ open: true, message: "Save failed", severity: "error" }),
      );
  };

  const handleCancel = () => {
    setSettings(originalSettings);
    setDirty(false);
  };

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  return (
    <Box
      sx={{
        px: 4,
        py: 4,
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Settings
      </Typography>

      <Divider sx={{ borderColor: "#1a1a1a", mb: 4 }} />

      <Grid container spacing={3} sx={{ maxWidth: 850 }}>
        {/* Daemon Toggles */}
        {[
          { label: "Host Discovery", key: "host_discovery" },
          { label: "Host Updater", key: "host_updater" },
          { label: "Port Discovery", key: "port_scan" },
        ].map(({ label, key }) => (
          <Grid item xs={12} sm={6} key={key}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
              {label}
            </Typography>
            <Switch
              checked={!!settings[key]}
              onChange={() => handleToggle(key)}
            />
          </Grid>
        ))}

        {/* Notification Toggles */}
        {[
          {
            label: "Host Update Notification",
            key: "host_update_notification",
          },
          {
            label: "Host Discovery Notification",
            key: "host_discovery_notification",
          },
          {
            label: "Port Discovery Notification",
            key: "port_discovery_notification",
          },
        ].map(({ label, key }) => (
          <Grid item xs={12} sm={6} key={key}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
              {label}
            </Typography>
            <Switch
              checked={!!settings[key]}
              onChange={() => handleToggle(key)}
            />
          </Grid>
        ))}

        {/* Port Scan Top Ports */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
            Port Scan: Top Ports
          </Typography>
          <TextField
            variant="filled"
            type="number"
            fullWidth
            value={settings.port_scan_top_ports}
            onChange={(e) =>
              handleInputChange("port_scan_top_ports", Number(e.target.value))
            }
            inputProps={{ min: 10, max: 65535 }}
            sx={{
              input: { color: "#fff" },
              backgroundColor: "#111",
              borderRadius: "8px",
            }}
          />
          <FormHelperText sx={{ color: "#999" }}>
            {settings.port_scan_top_ports > 10000
              ? "⚠️ Scanning more than 10k ports may be slow and CPU intensive."
              : "Enter number of top ports to scan (10–65535)"}
          </FormHelperText>
        </Grid>

        {/* Host Discovery Interval */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
            Host Discovery Interval (mins)
          </Typography>
          <TextField
            variant="filled"
            type="number"
            fullWidth
            value={settings.host_discovery_interval}
            onChange={(e) =>
              handleInputChange(
                "host_discovery_interval",
                Number(e.target.value),
              )
            }
            inputProps={{ min: 5, max: 60 }}
            sx={{
              input: { color: "#fff" },
              backgroundColor: "#111",
              borderRadius: "8px",
            }}
          />
          <FormHelperText sx={{ color: "#999" }}>
            {settings.host_discovery_interval <= 7
              ? "⚠️ Low interval may overload the network or miss results."
              : settings.host_discovery_interval >= 50
                ? "⚠️ High interval may delay discovery of new hosts."
                : "Recommended: 10–30 mins."}
          </FormHelperText>
        </Grid>

        {/* Port Discovery Interval */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
            Port Discovery Interval (mins)
          </Typography>
          <TextField
            variant="filled"
            type="number"
            fullWidth
            value={settings.port_discovery_interval}
            onChange={(e) =>
              handleInputChange(
                "port_discovery_interval",
                Number(e.target.value),
              )
            }
            inputProps={{ min: 15, max: 120 }}
            sx={{
              input: { color: "#fff" },
              backgroundColor: "#111",
              borderRadius: "8px",
            }}
          />
          <FormHelperText sx={{ color: "#999" }}>
            {settings.port_discovery_interval < 20
              ? "⚠️ Short interval may affect performance and accuracy."
              : settings.port_discovery_interval > 90
                ? "⚠️ Long interval may miss timely port status updates."
                : "Recommended: 30–60 mins."}
          </FormHelperText>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} justifyContent="flex-end" mt={5}>
        <Button
          onClick={handleCancel}
          sx={{
            color: "#aaa",
            border: "1px solid #333",
            borderRadius: "10px",
            px: 3,
            py: 1,
            textTransform: "none",
            fontWeight: 500,
            "&:hover": {
              backgroundColor: "#111",
              borderColor: "#444",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!dirty}
          sx={{
            color: "#000",
            background: dirty
              ? "linear-gradient(135deg, #ff8a50, #ff8a50)"
              : "linear-gradient(135deg, #444, #333)",
            borderRadius: "10px",
            px: 3,
            py: 1,
            textTransform: "none",
            fontWeight: 600,
            transition: "all 0.2s ease-in-out",
            "&:hover": dirty
              ? {
                  background: "linear-gradient(135deg, #ff8a50, #ff8a50)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 0 10px rgba(45, 243, 160, 0.2)",
                }
              : {},
          }}
        >
          Save Changes
        </Button>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ fontWeight: 500, fontFamily: "'Inter', sans-serif" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
