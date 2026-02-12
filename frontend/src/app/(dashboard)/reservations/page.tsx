"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  RefreshCw,
  CalendarClock,
  Clock,
  Users,
  Armchair,
} from "lucide-react";
import { toast } from "sonner";

interface TableOption {
  id: string;
  number: string;
  capacity: number;
  zone: string;
  status: string;
}

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  date: string;
  startTime: string;
  endTime: string | null;
  status: string;
  notes: string | null;
  tableId: string | null;
  table?: { id: string; number: string; zone: string };
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  SEATED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  COMPLETED: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 border-red-500/20",
  NO_SHOW: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    guestCount: "2",
    date: new Date().toISOString().split("T")[0],
    startTime: "19:00",
    notes: "",
    tableId: "",
  });

  // Assign table dialog (when seating a reservation without a table)
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignReservationId, setAssignReservationId] = useState("");
  const [assignTableId, setAssignTableId] = useState("");

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reservations");
      setReservations(res.data);
    } catch {
      toast.error("Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await api.get("/tables");
      setTables(res.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    if (createOpen || assignOpen) fetchTables();
  }, [createOpen, assignOpen]);

  const createReservation = async () => {
    setCreating(true);
    try {
      const dateTime = new Date(`${form.date}T${form.startTime}:00`);
      await api.post("/reservations", {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        guestCount: parseInt(form.guestCount),
        date: dateTime.toISOString(),
        startTime: dateTime.toISOString(),
        notes: form.notes || undefined,
        tableId: form.tableId || undefined,
      });
      toast.success("Reservation created");
      setCreateOpen(false);
      setForm({
        customerName: "",
        customerPhone: "",
        guestCount: "2",
        date: new Date().toISOString().split("T")[0],
        startTime: "19:00",
        notes: "",
        tableId: "",
      });
      fetchReservations();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to create reservation",
      );
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      toast.success(`Reservation ${status.toLowerCase()}`);
      fetchReservations();
    } catch {
      toast.error("Failed to update reservation");
    }
  };

  const handleSeat = (reservation: Reservation) => {
    if (reservation.tableId) {
      // Already has a table, just seat
      updateStatus(reservation.id, "SEATED");
    } else {
      // No table — open assign dialog first
      setAssignReservationId(reservation.id);
      setAssignTableId("");
      setAssignOpen(true);
    }
  };

  const assignTableAndSeat = async () => {
    if (!assignTableId) {
      toast.error("Please select a table");
      return;
    }
    try {
      // Assign the table to the reservation
      await api.patch(`/reservations/${assignReservationId}`, {
        tableId: assignTableId,
      });
      // Then seat
      await api.patch(`/reservations/${assignReservationId}/status`, {
        status: "SEATED",
      });
      toast.success("Table assigned and client seated");
      setAssignOpen(false);
      fetchReservations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign table");
    }
  };

  const availableTables = tables.filter((t) => t.status === "AVAILABLE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservations</h1>
          <p className="text-muted-foreground">
            {reservations.length} reservations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReservations}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Reservation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Customer Name *</Label>
                    <Input
                      value={form.customerName}
                      onChange={(e) =>
                        setForm({ ...form, customerName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={form.customerPhone}
                      onChange={(e) =>
                        setForm({ ...form, customerPhone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm({ ...form, startTime: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Guests</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.guestCount}
                      onChange={(e) =>
                        setForm({ ...form, guestCount: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign Table</Label>
                  <Select
                    value={form.tableId}
                    onValueChange={(v) => setForm({ ...form, tableId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No table (assign later)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTables.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No available tables
                        </SelectItem>
                      ) : (
                        availableTables.map((tbl) => (
                          <SelectItem key={tbl.id} value={tbl.id}>
                            Table {tbl.number} — {tbl.zone} ({tbl.capacity}p)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Special requests..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={createReservation}
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Reservation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assign Table Dialog (for seating without a table) */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Armchair className="mr-2 inline h-5 w-5" />
              Assign Table & Seat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This reservation has no table assigned. Please select a table
              before seating.
            </p>
            <div className="space-y-2">
              <Label>Table *</Label>
              <Select value={assignTableId} onValueChange={setAssignTableId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No available tables
                    </SelectItem>
                  ) : (
                    availableTables.map((tbl) => (
                      <SelectItem key={tbl.id} value={tbl.id}>
                        Table {tbl.number} — {tbl.zone} ({tbl.capacity}p)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={assignTableAndSeat}
              disabled={!assignTableId}
            >
              <Armchair className="mr-1 h-4 w-4" /> Assign & Seat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            No reservations found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reservations.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{r.customerName}</CardTitle>
                  <Badge variant="outline" className={statusColors[r.status]}>
                    {r.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {new Date(r.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(r.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {r.guestCount} guests
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.customerPhone}
                </p>
                {r.table ? (
                  <Badge variant="secondary">
                    <Armchair className="mr-1 h-3 w-3" /> Table {r.table.number}{" "}
                    ({r.table.zone})
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                  >
                    No table assigned
                  </Badge>
                )}
                {r.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    {r.notes}
                  </p>
                )}
                <div className="flex gap-1.5">
                  {r.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => updateStatus(r.id, "CONFIRMED")}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => updateStatus(r.id, "CANCELLED")}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {r.status === "CONFIRMED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleSeat(r)}
                      >
                        <Armchair className="mr-1 h-3.5 w-3.5" /> Seat
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => updateStatus(r.id, "NO_SHOW")}
                      >
                        No Show
                      </Button>
                    </>
                  )}
                  {r.status === "SEATED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateStatus(r.id, "COMPLETED")}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
