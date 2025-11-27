import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Activity, Users, Monitor, Search } from "lucide-react";

interface App {
  id: string;
  name: string;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const AnalyticsDashboard = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>("all");
  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from("apps")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setApps(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch apps");
    }
  };

  const fetchAnalytics = async () => {
    if (!eventName) {
      toast.error("Please enter an event name");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        event: eventName,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(selectedApp !== "all" && { app_id: selectedApp }),
      });

      const response = await supabase.functions.invoke(
        `analytics-event-summary?${params.toString()}`
      );

      if (response.error) throw response.error;
      setSummary(response.data);
    } catch (error: any) {
      toast.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const deviceChartData = summary?.deviceData
    ? Object.entries(summary.deviceData).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Analytics Dashboard</h2>
        <p className="text-muted-foreground">View detailed analytics for your events</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Query Analytics</CardTitle>
          <CardDescription>Filter and search for specific event data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Application</Label>
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Apps</SelectItem>
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                placeholder="e.g., login_form_cta_click"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={fetchAnalytics}
            disabled={loading}
            className="mt-4 bg-gradient-primary"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Loading..." : "Search"}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:shadow-glow-primary transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.count.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  for "{summary.event}"
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-glow-secondary transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                <Users className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.uniqueUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  tracked by IP address
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-glow-primary transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Devices</CardTitle>
                <Monitor className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Object.keys(summary.deviceData).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  device types detected
                </p>
              </CardContent>
            </Card>
          </div>

          {deviceChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>
                  Breakdown of events by device type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;