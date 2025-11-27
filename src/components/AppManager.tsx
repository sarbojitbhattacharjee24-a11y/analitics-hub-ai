import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Globe, Trash2 } from "lucide-react";

interface App {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  created_at: string;
}

const AppManager = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    description: "",
  });

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from("apps")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApps(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch apps");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in");
        return;
      }

      const response = await supabase.functions.invoke("auth-register", {
        body: formData,
      });

      if (response.error) throw response.error;

      toast.success(`App created! API Key: ${response.data.apiKey}`);
      setIsDialogOpen(false);
      setFormData({ name: "", domain: "", description: "" });
      fetchApps();
    } catch (error: any) {
      toast.error(error.message || "Failed to create app");
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this app? All associated API keys and analytics will be deleted.")) {
      return;
    }

    try {
      const { error } = await supabase.from("apps").delete().eq("id", appId);
      if (error) throw error;
      toast.success("App deleted successfully");
      fetchApps();
    } catch (error: any) {
      toast.error("Failed to delete app");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading apps...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Your Apps</h2>
          <p className="text-muted-foreground">Manage your registered applications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Register New App
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Application</DialogTitle>
              <DialogDescription>
                Create a new app and get an API key for tracking analytics.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">App Name</Label>
                <Input
                  id="name"
                  placeholder="My Awesome App"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="https://example.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your app"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateApp} className="w-full bg-gradient-primary">
                Create App & Generate API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apps.length === 0 ? (
          <Card className="col-span-full border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No apps registered yet. Create your first app to start tracking analytics.
              </p>
            </CardContent>
          </Card>
        ) : (
          apps.map((app) => (
            <Card key={app.id} className="relative overflow-hidden group hover:shadow-glow-primary transition-all">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  {app.name}
                </CardTitle>
                <CardDescription className="truncate">{app.domain}</CardDescription>
              </CardHeader>
              <CardContent>
                {app.description && (
                  <p className="text-sm text-muted-foreground mb-4">{app.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {new Date(app.created_at).toLocaleDateString()}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteApp(app.id)}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AppManager;