import React, { useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  TextField,
  TableSortLabel,
} from "@mui/material";

export function TableView({ devices = [], ssid }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const parseDate = useCallback((dateString) => {
    if (!dateString) return null;

    try {
      let date = new Date(dateString);
      if (!isNaN(date.getTime())) return date;

      // Try with T separator for ISO format
      date = new Date(dateString.replace(" ", "T"));
      if (!isNaN(date.getTime())) return date;

      // Try parsing as timestamp
      const timestamp = parseFloat(dateString);
      if (!isNaN(timestamp) && timestamp > 0) {
        date = new Date(timestamp > 1e10 ? timestamp : timestamp * 1000);
        if (!isNaN(date.getTime())) return date;
      }
    } catch (error) {
      console.warn("Date parsing error:", error);
    }

    return null;
  }, []);

  // Calculate uptime in milliseconds
  const getUptimeMs = useCallback(
    (firstSeen, lastSeen) => {
      const firstDate = parseDate(firstSeen);
      const lastDate = parseDate(lastSeen);

      if (!firstDate || !lastDate) return 0;

      const diff = lastDate.getTime() - firstDate.getTime();
      return Math.max(0, diff);
    },
    [parseDate],
  );

  const formatUptime = useCallback(
    (firstSeen, lastSeen) => {
      const ms = getUptimeMs(firstSeen, lastSeen);
      if (ms <= 0) return "—";

      const totalSeconds = Math.floor(ms / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m`;
      return "<1m";
    },
    [getUptimeMs],
  );

  const formatDate = useCallback(
    (dateString) => {
      const date = parseDate(dateString);
      if (!date) return "—";

      try {
        return date.toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        });
      } catch (error) {
        return "—";
      }
    },
    [parseDate],
  );

  const processedDevices = useMemo(() => {
    if (!Array.isArray(devices)) return [];

    let result = devices;

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = devices.filter((device) => {
        const ipAddress = String(device.ip_address || "").toLowerCase();
        return ipAddress.includes(query);
      });
    }

    if (sortField === "uptime") {
      result = [...result]
        .map((device, originalIndex) => ({ ...device, originalIndex }))
        .sort((a, b) => {
          const uptimeA = getUptimeMs(a.first_seen, a.last_seen);
          const uptimeB = getUptimeMs(b.first_seen, b.last_seen);

          if (uptimeA === uptimeB) {
            return a.originalIndex - b.originalIndex;
          }

          const result = uptimeA - uptimeB;
          return sortDirection === "asc" ? result : -result;
        })
        .map(({ originalIndex, ...device }) => device);
    }

    return result;
  }, [devices, search, sortField, sortDirection, getUptimeMs]);

  // Handle sort column click - only for uptime
  const handleSort = useCallback(
    (field) => {
      if (field !== "uptime") return;

      if (sortField === field) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortField(null);
          setSortDirection("asc");
        }
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField, sortDirection],
  );

  const getSortDirection = useCallback(
    (field) => {
      if (field !== "uptime" || sortField !== field) return false;
      return sortDirection;
    },
    [sortField, sortDirection],
  );

  const headerCells = [
    { label: "Device", field: "hostname", sortable: false },
    { label: "Vendor", field: "vendor", sortable: false },
    { label: "Ports", field: null, sortable: false },
    { label: "First Seen", field: "first_seen", sortable: false },
    { label: "Last Seen", field: "last_seen", sortable: false },
    { label: "Online For", field: "uptime", sortable: true },
  ];

  return (
    <Box
      sx={{
        px: { xs: 1, md: 0 },
        py: 2,
        width: "100%",
        backgroundColor: "#000",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontWeight: 700,
          color: "#fff",
          fontSize: "1.35rem",
          letterSpacing: "0.4px",
          px: { xs: 1, md: 0 },
        }}
      >
        Devices in {ssid || "Network"} ({processedDevices.length})
      </Typography>

      <Box sx={{ px: { xs: 1, md: 0 } }}>
        <TextField
          label="Search by IP address"
          placeholder="Enter IP address (e.g., 192.168.1.1)"
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#111",
              borderRadius: "10px",
              color: "#eee",
              "& fieldset": {
                borderColor: "#333",
              },
              "&:hover fieldset": {
                borderColor: "#ffb57d",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#ffb57d",
              },
              "& input": {
                padding: "12px 14px",
                color: "#eee",
                "&::placeholder": {
                  color: "#888",
                  opacity: 1,
                },
              },
            },
            "& .MuiInputLabel-root": {
              color: "#888",
              "&.Mui-focused": {
                color: "#aaa",
              },
            },
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Table
          size="small"
          sx={{
            borderCollapse: "separate",
            borderSpacing: "0 8px",
            width: "100%",
            minWidth: "700px",
          }}
        >
          <TableHead>
            <TableRow sx={{ backgroundColor: "transparent" }}>
              {headerCells.map(({ label, field, sortable }) => (
                <TableCell
                  key={label}
                  sx={{
                    color: "#aaa",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    backgroundColor: "#0d0d0d",
                    borderBottom: "1px solid #222",
                    py: 1.5,
                    "&:first-of-type": {
                      borderTopLeftRadius: "8px",
                      borderBottomLeftRadius: "8px",
                    },
                    "&:last-of-type": {
                      borderTopRightRadius: "8px",
                      borderBottomRightRadius: "8px",
                    },
                  }}
                >
                  {sortable ? (
                    <TableSortLabel
                      active={sortField === field}
                      direction={getSortDirection(field) || "asc"}
                      onClick={() => handleSort(field)}
                      sx={{
                        color: "#aaa !important",
                        "&:hover": {
                          color: "#ccc !important",
                        },
                        "&.Mui-active": {
                          color: "#ddd !important",
                        },
                        "& .MuiTableSortLabel-icon": {
                          color: "#ddd !important",
                          opacity: sortField === field ? 1 : 0.3,
                        },
                      }}
                    >
                      {label}
                    </TableSortLabel>
                  ) : (
                    label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {processedDevices.map((device, index) => (
              <TableRow
                key={`${device.mac_address || device.ip_address || "unknown"}-${index}`}
                sx={{
                  backgroundColor: "#111",
                  "&:hover": { backgroundColor: "#1a1a1a" },
                  "& > td": {
                    borderBottom: "none",
                    py: 1.2,
                  },
                  "& > td:first-of-type": {
                    borderTopLeftRadius: "8px",
                    borderBottomLeftRadius: "8px",
                  },
                  "& > td:last-of-type": {
                    borderTopRightRadius: "8px",
                    borderBottomRightRadius: "8px",
                  },
                }}
              >
                <TableCell sx={{ color: "#fff", width: "25%" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      component="span"
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor:
                          device.status === "online" ? "#00e676" : "#f44336",
                        flexShrink: 0,
                      }}
                    />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "#fff", lineHeight: 1.3 }}
                      >
                        {device.hostname || "Unknown"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#aaa",
                          display: "block",
                          lineHeight: 1.2,
                        }}
                      >
                        {device.ip_address}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "#888", lineHeight: 1.2 }}
                      >
                        {device.mac_address || "—"}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                <TableCell sx={{ color: "#ccc" }}>
                  {device.vendor || "—"}
                </TableCell>

                <TableCell sx={{ color: "#ccc" }}>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {(device.ports || []).slice(0, 5).map((port, portIndex) => (
                      <Tooltip
                        key={`${port}-${portIndex}`}
                        title={`Port ${port}`}
                        arrow
                        placement="top"
                      >
                        <Box
                          component="span"
                          sx={{
                            backgroundColor: "#2a2a2a",
                            color: "#fff",
                            px: 1,
                            py: "3px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            cursor: "default",
                          }}
                        >
                          {port}
                        </Box>
                      </Tooltip>
                    ))}
                    {(device.ports || []).length > 6 && (
                      <Tooltip
                        title={`Show all ${(device.ports || []).length} ports`}
                        arrow
                        placement="top"
                      >
                        <Box
                          component="span"
                          sx={{
                            color: "#888",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          +{(device.ports || []).length - 6} more
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>

                <TableCell sx={{ color: "#bbb", fontSize: "0.8rem" }}>
                  {formatDate(device.first_seen)}
                </TableCell>

                <TableCell sx={{ color: "#bbb", fontSize: "0.8rem" }}>
                  {formatDate(device.last_seen)}
                </TableCell>

                <TableCell sx={{ color: "#ccc", whiteSpace: "nowrap" }}>
                  {formatUptime(device.first_seen, device.last_seen)}
                </TableCell>
              </TableRow>
            ))}
            {processedDevices.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={headerCells.length}
                  sx={{
                    textAlign: "center",
                    color: "#888",
                    py: 3,
                    borderBottom: "none",
                  }}
                >
                  {search.trim()
                    ? "No devices found with that IP address."
                    : "No devices found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
