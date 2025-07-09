import React, { useEffect, useState } from "react";
import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Badge,
  Tooltip,
} from "@mui/material";
import { styled, ThemeProvider, createTheme } from "@mui/material/styles";
import DevicesIcon from "@mui/icons-material/Devices";
import GraphIcon from "@mui/icons-material/Hub";
import SubnetIcon from "@mui/icons-material/Router";
import SettingsIcon from "@mui/icons-material/Settings";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

import "@fontsource/inter"; // Import Inter font
import "@fontsource/jetbrains-mono";

import { DashboardView } from "./Dashboard";
import { TableView } from "./TableView";
import { UpdatesView } from "./UpdatesView";
import { SubnetsView } from "./Subnets";
import { SettingsView } from "./SettingsView";

const drawerWidth = 260;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  [`& .MuiDrawer-paper`]: {
    width: drawerWidth,
    boxSizing: "border-box",
    backgroundColor: "#000000",
    color: "#fff",
    borderRight: "1px solid #1a1a1a",
    backgroundImage: "linear-gradient(180deg, #000000 0%, #000000 100%)",
  },
}));

const LogoContainer = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 24px 16px 24px",
  marginBottom: "8px",
}));

const LogoText = styled(Typography)(() => ({
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 900,
  fontSize: "2.5rem",
  letterSpacing: "0.04em",
  position: "relative",
  background: "linear-gradient(135deg, #fe6a01 0%, #ff8a50 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  color: "transparent",
  textShadow: "0 0 8px rgba(0, 255, 255, 0.15)",

  // Scanline effect
  "&::after": {
    content: "''",
    position: "absolute",
    top: "50%",
    left: 0,
    width: "100%",
    height: "1px",
    background: "rgba(255, 255, 255, 0.05)",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    animation: "scanline 2.5s infinite ease-in-out",
  },

  "@keyframes scanline": {
    "0%, 100%": { opacity: 0 },
    "45%, 55%": { opacity: 0.15 },
  },
}));

const StyledListItemButton = styled(ListItemButton)(({ theme, selected }) => ({
  borderRadius: "6px",
  margin: "1px 16px",
  padding: "8px 16px",
  minHeight: "40px",
  transition: "all 0.15s ease",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  "&.Mui-selected": {
    backgroundColor: "rgba(255, 138, 80, 0.08)",
    color: "#ff8a50",
    "&:hover": {
      backgroundColor: "rgba(255, 138, 80, 0.12)",
    },
    "& .MuiListItemIcon-root": {
      color: "#ff8a50",
    },
  },
}));

const StyledListItemIcon = styled(ListItemIcon)(() => ({
  minWidth: "20px",
  marginRight: "16px",
  color: "#999",
  "& .MuiSvgIcon-root": {
    fontSize: "18px",
  },
}));

const FooterSection = styled(Box)(() => ({
  marginTop: "auto",
  padding: "24px 20px",
  borderTop: "1px solid #1a1a1a",
}));

function getHostCountFromCIDR(cidr) {
  const bits = parseInt(cidr.split("/")[1] || "24", 10);
  return Math.pow(2, 32 - bits) - 2;
}

export default function App() {
  const theme = createTheme({
    typography: {
      fontFamily: "Inter, Helvetica, Arial, sans-serif",
    },
  });

  const [ssid, setSsid] = useState("");
  const [subnet, setSubnet] = useState("");
  const [devices, setDevices] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [selectedView, setSelectedView] = useState("dashboard");
  const [selectedSsid, setSelectedSsid] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/netinfo")
      .then((res) => res.json())
      .then(({ ssid, subnet }) => {
        setSsid(ssid);
        setSubnet(subnet);
      })
      .catch(() => {
        setSsid("Unknown");
        setSubnet("192.168.0.0/24");
      });
  }, []);

  const fetchSubnetsWithCounts = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/subnets");
      const subnetList = await res.json();
      const enriched = await Promise.all(
        subnetList.map(async (subnet) => {
          const devRes = await fetch(
            `http://localhost:5000/api/devices?ssid=${encodeURIComponent(subnet.ssid)}`,
          );
          const devs = await devRes.json();
          return { ...subnet, deviceCount: devs.length };
        }),
      );
      setSubnets(enriched);
    } catch (err) {
      console.error("Failed to fetch subnets/devices", err);
      setSubnets([]);
    }
  };

  useEffect(() => {
    fetchSubnetsWithCounts();
  }, []);

  useEffect(() => {
    if (selectedSsid) {
      fetch(
        `http://localhost:5000/api/devices?ssid=${encodeURIComponent(selectedSsid)}`,
      )
        .then((res) => res.json())
        .then(setDevices)
        .catch(() => setDevices([]));
    }
  }, [selectedSsid]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/notifications");
      const data = await res.json();
      setNotifications(data);
      const unread = data.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markNotificationsRead = async () => {
    try {
      await fetch("http://localhost:5000/api/notifications/mark-read", {
        method: "POST",
      });
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedView === "updates") {
      setTimeout(() => {
        markNotificationsRead();
        setUnreadCount(0);
      }, 3000);
    }
  }, [selectedView]);

  const renderSubnetCard = (subnet) => {
    const max = getHostCountFromCIDR(subnet.subnet);
    const value = subnet.deviceCount;
    const tooltipText = `${value} devices out of ${max} in ${subnet.subnet}`;
    return (
      <ListItemButton
        key={subnet.ssid}
        onClick={() => setSelectedSsid(subnet.ssid)}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          py: 1.5,
          mb: 1,
          borderRadius: 4,
          backgroundColor: "#181818",
          "&:hover": { backgroundColor: "#222" },
        }}
      >
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ color: "#fff", fontWeight: 600 }}
          >
            {subnet.ssid}
          </Typography>
          <Typography variant="body2" sx={{ color: "#aaa" }}>
            {subnet.subnet}
          </Typography>
        </Box>
        <Tooltip title={tooltipText} arrow placement="top">
          <Box sx={{ width: 60, height: 60, ml: 2 }}>
            <CircularProgressbar
              value={value}
              maxValue={max}
              text={`${value}`}
              styles={buildStyles({
                textColor: "#ccc",
                pathColor: "#00e676",
                trailColor: "#444",
                textSize: "28px",
              })}
            />
          </Box>
        </Tooltip>
      </ListItemButton>
    );
  };

  const navigationItems = [
    { icon: <DashboardIcon />, text: "Dashboard", key: "dashboard" },
    { icon: <DevicesIcon />, text: "Device Table", key: "table" },
    { icon: <SubnetIcon />, text: "Subnets", key: "subnets" },
    {
      icon: (
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      ),
      text: "Updates",
      key: "updates",
    },
    { icon: <SettingsIcon />, text: "Settings", key: "settings" },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          backgroundColor: "#000",
          color: "#ffffff",
        }}
      >
        <StyledDrawer variant="permanent">
          <LogoContainer>
            <LogoText>SLAM</LogoText>
          </LogoContainer>

          <Divider sx={{ bgcolor: "#1a1a1a", mx: 2, mb: 2 }} />
          <Box sx={{ overflow: "auto", flex: 1, px: 0 }}>
            <List disablePadding>
              {navigationItems.map(({ icon, text, key }) => (
                <StyledListItemButton
                  key={key}
                  selected={selectedView === key}
                  onClick={() => {
                    setSelectedView(key);
                    if (key !== "table" && key !== "graph") {
                      setSelectedSsid(null);
                    }
                  }}
                >
                  <StyledListItemIcon>{icon}</StyledListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        sx={{
                          fontWeight: selectedView === key ? 500 : 400,
                          fontSize: "1.0rem",
                          color: selectedView === key ? "#ff8a50" : "#e0e0e0",
                        }}
                      >
                        {text}
                      </Typography>
                    }
                  />
                </StyledListItemButton>
              ))}
            </List>
          </Box>

          <FooterSection>
            <Typography
              variant="caption"
              sx={{
                fontSize: "1.0rem",
                color: "#666",
                textAlign: "center",
                display: "block",
                letterSpacing: "0.1em",
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              LOCAL OBSERVATION
              <br />
              OF MACHINES
            </Typography>
          </FooterSection>
        </StyledDrawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: 2,
            pt: 0,
            background: "#000",
            minHeight: "100vh",
            overscrollBehavior: "none",
            backgroundColor: "#000",
          }}
        >
          <Box sx={{ height: 18 }} />

          {selectedView === "dashboard" && (
            <DashboardView
              ssid={ssid}
              subnet={subnet}
              onDevicesUpdate={setDevices}
            />
          )}

          {selectedView === "updates" && (
            <UpdatesView notifications={notifications} />
          )}

          {selectedView === "subnets" && <SubnetsView subnets={subnets} />}
          {selectedView === "settings" && <SettingsView />}

          {selectedView === "table" && !selectedSsid && (
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: "white",
                  mb: 2,
                  px: 1,
                  py: 3,
                  fontWeight: 600,
                  fontSize: "1.4rem",
                  letterSpacing: "0.3px",
                }}
              >
                Select a Subnet to View Devices
                <Divider
                  sx={{
                    bgcolor: "#1a1a1a",
                    mx: 1,
                    mb: 2,
                    mt: 2,
                    height: "0.5px",
                  }}
                />
                <List>{subnets.map((subnet) => renderSubnetCard(subnet))}</List>
              </Typography>
            </Box>
          )}

          {selectedView === "table" && selectedSsid && (
            <>
              <IconButton
                onClick={() => setSelectedSsid(null)}
                sx={{ color: "#888", mb: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <TableView ssid={selectedSsid} devices={devices} />
            </>
          )}

          {selectedView === "graph" && !selectedSsid && (
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: "white",
                  mb: 2,
                  px: 1,
                  py: 3,
                  fontWeight: 600,
                  fontSize: "1.4rem",
                  letterSpacing: "0.3px",
                }}
              >
                Select a Subnet to View Graph
                <Divider sx={{ bgcolor: "#1a1a1a", mx: 1, mb: 2, mt: 2 }} />
                <List>{subnets.map((subnet) => renderSubnetCard(subnet))}</List>
              </Typography>
            </Box>
          )}

          {selectedView === "graph" && selectedSsid && (
            <>
              <IconButton
                onClick={() => setSelectedSsid(null)}
                sx={{ color: "#888", mb: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <GraphView ssid={selectedSsid} devices={devices} />
            </>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
