import { useEffect, useState } from "react";
import { Mail, CheckCheck, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AdminContactMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("contact_messages" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMessages(data as ContactMessage[]);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const markRead = async (id: string) => {
    await supabase.from("contact_messages" as any).update({ is_read: true }).eq("id", id);
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, is_read: true } : m));
  };

  const deleteMsg = async (id: string) => {
    const { error } = await supabase.from("contact_messages" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Contact Messages</h2>
          {unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-700">{unreadCount} unread</Badge>
          )}
        </div>
        <span className="text-sm text-gray-500">{messages.length} total</span>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No messages yet.</div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl border p-4 transition-colors ${
                msg.is_read ? "bg-white border-gray-200" : "bg-green-50 border-green-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{msg.name}</span>
                    {!msg.is_read && <Badge className="bg-green-100 text-green-700 text-xs">New</Badge>}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(msg.created_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <a href={`mailto:${msg.email}`} className="text-sm text-green-600 hover:underline mb-2 block">
                    {msg.email}
                  </a>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!msg.is_read && (
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => markRead(msg.id)}>
                      <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark Read
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => deleteMsg(msg.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminContactMessages;
