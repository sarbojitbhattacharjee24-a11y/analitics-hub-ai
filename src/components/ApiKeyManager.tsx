import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Key, Copy, XCircle, Clock } from "lucide-react";

interface ApiKey {
  id: string;
  key_prefix: string;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface App {
  id: string;
  name: string;
}

const ApiKeyManager = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchApiKeys();
    }
  }, [selectedApp]);

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from("apps")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setApps(data || []);
      if (data && data.length > 0) {
        setSelectedApp(data[0].id);
      }
    } catch (error: any) {
      toast.error("Failed to fetch apps");
    }
  };

  const fetchApiKeys = async () => {
    if (!selectedApp) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("auth-get-key", {
        body: { app_id: selectedApp },
      });

      if (response.error) throw response.error;
      setApiKeys(response.data.apiKeys || []);
    } catch (error: any) {
      toast.error("Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("auth-revoke", {
        body: { api_key_id: keyId },
      });

      if (response.error) throw response.error;
      toast.success("API key revoked successfully");
      fetchApiKeys();
    } catch (error: any) {
      toast.error("Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">API Key Management</h2>
        <p className="text-muted-foreground">View and manage your API keys</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Application</CardTitle>
          <CardDescription>Choose an app to view its API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedApp} onValueChange={setSelectedApp}>
            <SelectTrigger>
              <SelectValue placeholder="Select an app" />
            </SelectTrigger>
            <SelectContent>
              {apps.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading API keys...</div>
      ) : (
        <div className="grid gap-4">
          {apiKeys.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No API keys found for this app.
                </p>
              </CardContent>
            </Card>
          ) : (
            apiKeys.map((key) => (
              <Card
                key={key.id}
                className={`relative overflow-hidden ${
                  !key.is_active ? "opacity-60" : "hover:shadow-glow-primary"
                } transition-all`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  key.is_active ? "bg-gradient-primary" : "bg-muted"
                }`}></div>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      <span className="font-mono text-sm">{key.key_prefix}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.is_active ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-500">
                          Revoked
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(key.created_at).toLocaleDateString()}</span>
                    </div>
                    {key.last_used_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last used:
                        </span>
                        <span>{new Date(key.last_used_at).toLocaleString()}</span>
                      </div>
                    )}
                    {key.revoked_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Revoked:</span>
                        <span>{new Date(key.revoked_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(key.key_prefix)}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Prefix
                    </Button>
                    {key.is_active && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeKey(key.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;