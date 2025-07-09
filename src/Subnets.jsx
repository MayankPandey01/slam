import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ComputerIcon from "@mui/icons-material/Computer";
import CircleIcon from "@mui/icons-material/Circle";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function SubnetsView() {
  const [subnets, setSubnets] = useState([]);

  const fetchSubnets = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/subnets");
      const data = await res.json();

      const enriched = await Promise.all(
        data.map(async (subnet) => {
          const devRes = await fetch(
            `http://localhost:5000/api/devices?ssid=${encodeURIComponent(
              subnet.ssid,
            )}`,
          );
          const devices = await devRes.json();
          const online = devices.filter((d) => d.status === "online").length;
          const offline = devices.length - online;
          return {
            ...subnet,
            total: devices.length,
            online,
            offline,
          };
        }),
      );

      enriched.sort((a, b) => {
        if (a.current) return -1;
        if (b.current) return 1;
        return new Date(b.last_activity) - new Date(a.last_activity);
      });

      setSubnets(enriched);
    } catch (e) {
      console.error("Failed to load subnets", e);
    }
  };

  useEffect(() => {
    fetchSubnets();
    const interval = setInterval(fetchSubnets, 30000); // Refresh every 30 sec
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          px: 1,
          py: 3,
          color: "#fff",
          fontWeight: 600,
          fontSize: "1.4rem",
          letterSpacing: "0.3px",
        }}
      >
        All Subnets
      </Typography>
      <Divider
        sx={{
          bgcolor: "#1a1a1a",
          mx: 1,
          mb: 2,
          height: "0.5px",
        }}
      />
      <Grid container spacing={3}>
        {subnets.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.id}>
            <Paper
              sx={{
                p: 2,
                backgroundColor: "#0000",
                borderRadius: 3,
                height: "100%",
                border: s.current ? "2px solid #00e676" : "2px solid #222",
                boxShadow: "0 0 0 1px #2a2a2a",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Stack spacing={1} mb={1}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#fff" }}
                >
                  <WifiIcon
                    fontSize="small"
                    sx={{ mr: 1, mb: -0.5, color: "#00e676" }}
                  />
                  {s.ssid}
                </Typography>
                <Typography variant="body2" sx={{ color: "#aaa" }}>
                  Subnet: {s.subnet}
                </Typography>
                <Typography variant="body2" sx={{ color: "#aaa" }}>
                  Netmask: {s.netmask || "—"} | Broadcast: {s.broadcast || "—"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#aaa" }}>
                  Interface: {s.iface || "—"}
                </Typography>
              </Stack>

              <Divider sx={{ borderColor: "#333", my: 1 }} />

              <Stack direction="row" spacing={1} mb={1}>
                <Chip
                  label={`${s.total} Devices`}
                  icon={<ComputerIcon />}
                  sx={{
                    color: "#fff",
                    backgroundColor: "#2c2c2e",
                    fontSize: "0.75rem",
                  }}
                  size="small"
                />
                <Chip
                  label={`Online: ${s.online}`}
                  icon={
                    <CircleIcon
                      sx={{ color: "#00e676", fontSize: 10, ml: 0.5 }}
                    />
                  }
                  sx={{
                    color: "#00e676",
                    backgroundColor: "#202820",
                    fontSize: "0.75rem",
                  }}
                  size="small"
                />
                <Chip
                  label={`Offline: ${s.offline}`}
                  icon={
                    <CircleIcon
                      sx={{ color: "#f44336", fontSize: 10, ml: 0.5 }}
                    />
                  }
                  sx={{
                    color: "#f44336",
                    backgroundColor: "#2a1a1a",
                    fontSize: "0.75rem",
                  }}
                  size="small"
                />
              </Stack>

              <Typography variant="caption" sx={{ color: "#999" }}>
                <AccessTimeIcon sx={{ fontSize: 12, mr: 0.5 }} />
                Updated {timeAgo(s.last_activity)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#666", mt: 0.5 }}>
                First Connected:{" "}
                {new Date(s.created_at).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: "#888",
                  mt: 0.5,
                  fontStyle: "italic",
                }}
              >
                Updated By: {s.updated_by || "None"}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
