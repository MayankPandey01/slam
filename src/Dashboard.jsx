import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  Stack,
  Chip,
  Card,
  Grid,
  CardContent,
  Tooltip,
  Divider,
  Button,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import CircleIcon from "@mui/icons-material/Circle";

const PILL_TIMEOUT = 10000;

const daemonLabels = {
  discovery_daemon: "Host Discovery Daemon",
  portscan_daemon: "Port Scanner Daemon",
  updater_daemon: "Host Updater Daemon",
};

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const FancyScanButton = styled(Button)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "0.9rem",
  padding: "12px 28px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
  backgroundSize: "200% auto",
  color: "#fff",
  border: "1px solid #404040",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  textTransform: "none",
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "-100%",
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)",
    transition: "left 0.6s",
  },
  "&:hover": {
    backgroundPosition: "right center",
    boxShadow: "0 8px 25px rgba(255, 181, 125, 0.3), 0 0 0 1px #ffb57d",
    borderColor: "#ffb57d",
    transform: "translateY(-2px)",
    "&::before": {
      left: "100%",
    },
  },
  "&:active": {
    transform: "translateY(-1px) scale(0.98)",
  },
}));

const ModernDaemonPill = styled(Box)(({ status }) => ({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 16px",
  borderRadius: "24px",
  background:
    status === "online" ? "rgba(0, 230, 118, 0.1)" : "rgba(244, 67, 54, 0.1)",
  border: `1px solid ${status === "online" ? "rgba(0, 230, 118, 0.3)" : "rgba(244, 67, 54, 0.3)"}`,
  backdropFilter: "blur(10px)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow:
      status === "online"
        ? "0 8px 25px rgba(0, 230, 118, 0.2)"
        : "0 8px 25px rgba(244, 67, 54, 0.2)",
  },
}));

const MinimalDaemonDot = styled(Box)(({ status }) => ({
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: status === "online" ? "#10b981" : "#ef4444",
  animation: status === "online" ? `${pulse} 2s ease-in-out infinite` : "none",
  transition: "all 0.2s ease",
}));

const DaemonContainer = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 8px",
  borderRadius: "6px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
}));

const SimpleTooltip = styled(Box)(() => ({
  position: "absolute",
  top: "100%",
  right: "0",
  marginTop: "4px",
  background: "#1f1f1f",
  border: "1px solid #333",
  borderRadius: "4px",
  padding: "6px 8px",
  fontSize: "0.75rem",
  color: "#ccc",
  whiteSpace: "nowrap",
  zIndex: 100,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  animation: `${fadeIn} 0.15s ease-out`,
}));

const InfoChip = styled(Chip)(() => ({
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(132, 225, 163, 0.1) 0%, rgba(132, 225, 163, 0.05) 100%)",
  color: "#84e1a3",
  fontWeight: 650,
  fontSize: "0.8rem",
  border: "1px solid rgba(132, 225, 163, 0.3)",
  padding: "0 12px",
  backdropFilter: "blur(8px)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    border: "1px solid #00e676",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 15px rgba(0, 230, 118, 0.2)",
  },
}));

const SimpleInfoChip = styled(Chip)(() => ({
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
  color: "#ccc",
  fontWeight: 550,
  fontSize: "0.8rem",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(8px)",
  transition: "all 0.3s ease",
  "&:hover": {
    background:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)",
    transform: "translateY(-1px)",
  },
}));

const StyledCard = styled(Card)(() => ({
  background:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "16px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
}));

const EnhancedLinearProgress = styled(LinearProgress)(() => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  overflow: "hidden",
  "& .MuiLinearProgress-bar": {
    background: "linear-gradient(90deg, #ffb57d 0%, #ff8a50 50%, #ffb57d 100%)",
    backgroundSize: "200% 100%",
    animation: `${shimmer} 2s linear infinite`,
    borderRadius: 4,
  },
}));

export function DashboardView({ onDevicesUpdate }) {
  const [meta, setMeta] = useState({});
  const [progress, setProgress] = useState(null);
  const [currentTask, setCurrentTask] = useState("");
  const [scannedHosts, setScannedHosts] = useState([]);
  const [totalHosts, setTotalHosts] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [hoveredDaemon, setHoveredDaemon] = useState(null);

  const [daemonStatus, setDaemonStatus] = useState({
    discovery_daemon: { lastPing: null, status: "offline" },
    portscan_daemon: { lastPing: null, status: "offline" },
    updater_daemon: { lastPing: null, status: "offline" },
  });

  const notifyOffline = useRef({});

  useEffect(() => {
    fetch("http://localhost:5000/api/netinfo")
      .then((res) => res.json())
      .then((data) => {
        setMeta(data);
        const bits = parseInt(data.subnet.split("/")[1] || "24", 10);
        setTotalHosts(Math.pow(2, 32 - bits) - 2);
      });
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:6789");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      Object.entries(data).forEach(([key]) => {
        if (daemonStatus[key]) {
          setDaemonStatus((prev) => ({
            ...prev,
            [key]: { lastPing: new Date(), status: "online" },
          }));
          notifyOffline.current[key] = false;
        }
      });
    };

    const interval = setInterval(() => {
      setDaemonStatus((prev) => {
        const now = Date.now();
        const updated = { ...prev };
        Object.entries(prev).forEach(([key, val]) => {
          if (
            val.lastPing &&
            now - new Date(val.lastPing).getTime() > PILL_TIMEOUT
          ) {
            updated[key] = { ...val, status: "offline" };
            if (
              !notifyOffline.current[key] &&
              Notification.permission === "granted"
            ) {
              new Notification(`${daemonLabels[key]} is offline`);
              notifyOffline.current[key] = true;
            }
          }
        });
        return updated;
      });
    }, 3000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const handleScanClick = (type) => {
    setScannedHosts([]);
    setProgress(0);
    setCurrentTask(type);
    setCompleted(false);

    const mode = type.toLowerCase().replace(/\s+/g, "_");
    const eventSource = new EventSource(
      `http://localhost:5000/api/scan-stream?mode=${mode}`,
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.host) {
        setScannedHosts((prev) => {
          const updated = [...prev, data.host];
          if (totalHosts) setProgress((updated.length / totalHosts) * 100);
          onDevicesUpdate(updated);
          return updated;
        });
      }

      if (data.total && scannedHosts.length >= data.total) {
        setProgress(100);
        setCompleted(true);
        setCurrentTask("");
        eventSource.close();
      }
    };

    eventSource.addEventListener("done", () => {
      setProgress(100);
      setCompleted(true);
      setCurrentTask("");
      eventSource.close();
    });

    eventSource.onerror = () => {
      setProgress(100);
      setCurrentTask("Error");
      setCompleted(true);
      eventSource.close();
    };
  };

  return (
    <Box
      sx={{
        backgroundColor: "#000",
        minHeight: "100vh",
        px: 4,
        position: "relative",
      }}
    >
      {/* Daemon Status - Top Right */}
      <Box
        sx={{
          position: "absolute",
          top: 24,
          right: 24,
          display: "flex",
          gap: 2,
          zIndex: 100,
        }}
      >
        {Object.entries(daemonLabels).map(([key, label]) => {
          const status = daemonStatus[key]?.status || "offline";
          return (
            <Box
              key={key}
              sx={{ position: "relative" }}
              onMouseEnter={() => setHoveredDaemon(key)}
              onMouseLeave={() => setHoveredDaemon(null)}
            >
              <DaemonContainer>
                <MinimalDaemonDot status={status} />
              </DaemonContainer>
              {hoveredDaemon === key && (
                <SimpleTooltip>
                  {label}: {status}
                </SimpleTooltip>
              )}
            </Box>
          );
        })}
      </Box>

      <Typography
        variant="h3"
        gutterBottom
        sx={{
          fontWeight: 900,
          color: "#fff",
          fontSize: "2.5rem",
          letterSpacing: "0.5px",
          mb: 2,
          mt: 2,
        }}
      >
        Network Dashboard
      </Typography>
      <Divider
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.1)",
          my: 3,
          height: 2,
          borderRadius: 1,
        }}
      />

      {/* Meta Info */}
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", mb: 4 }}>
        {meta.ip && <InfoChip label={`IP: ${meta.ip}`} />}
        <SimpleInfoChip label={`SSID: ${meta.ssid || "Unknown"}`} />
        <SimpleInfoChip label={`Subnet: ${meta.subnet || "-"}`} />
        <SimpleInfoChip label={`Netmask: ${meta.netmask || "-"}`} />
        <SimpleInfoChip label={`Broadcast: ${meta.broadcast || "-"}`} />
        <SimpleInfoChip label={`Interface: ${meta.interface || "-"}`} />
      </Stack>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ color: "#ccc", mb: 2, fontWeight: 600 }}>
          Network Operations
        </Typography>
        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
          {["Discover Hosts", "Port Scan"].map((label) => (
            <FancyScanButton key={label} onClick={() => handleScanClick(label)}>
              {label}
            </FancyScanButton>
          ))}
        </Stack>
      </Box>

      {progress !== null && (
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="body1"
            sx={{ color: "#fff", mb: 1, fontWeight: 600 }}
          >
            {completed
              ? `Scan Complete: Scanned ${scannedHosts.length} of ${totalHosts} hosts`
              : `${currentTask}... (${scannedHosts.length} of ${totalHosts} hosts scanned)`}
          </Typography>
          <EnhancedLinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {scannedHosts.length > 0 && (
        <Box>
          <Typography
            variant="h6"
            sx={{ color: "#ccc", mb: 2, fontWeight: 600 }}
          >
            Scanned Hosts ({scannedHosts.length})
          </Typography>
          <Stack spacing={2}>
            {scannedHosts.map((host, i) => (
              <StyledCard key={`${host.ip_address}-${i}`}>
                <CardContent sx={{ padding: "20px" }}>
                  <Typography
                    variant="h6"
                    sx={{ color: "#fff", fontWeight: 700, mb: 1 }}
                  >
                    {host.hostname || "Unknown Host"}
                    <Typography
                      component="span"
                      sx={{ color: "#ffb57d", ml: 1 }}
                    >
                      {host.ip_address}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#ccc", mb: 1 }}>
                    <strong style={{ color: "#84e1a3" }}>MAC:</strong>{" "}
                    {host.mac_address || "N/A"}
                    {host.vendor && (
                      <>
                        <span style={{ margin: "0 12px", color: "#555" }}>
                          •
                        </span>
                        <strong style={{ color: "#84e1a3" }}>Vendor:</strong>{" "}
                        {host.vendor}
                      </>
                    )}
                  </Typography>
                  {host.ports?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: "#ffb57d", fontWeight: 600, mb: 1 }}
                      >
                        Open Ports:
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: "wrap" }}
                      >
                        {host.ports.map((port) => (
                          <Chip
                            key={port}
                            label={port}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(255, 181, 125, 0.2)",
                              color: "#ffb57d",
                              border: "1px solid rgba(255, 181, 125, 0.3)",
                              fontWeight: 600,
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </StyledCard>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
