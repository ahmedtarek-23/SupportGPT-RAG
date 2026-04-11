import { SupportChat } from "../components/SupportChat";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "../components/shared/GlassCard";

export default function ChatAssistantPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
      <PageHeader
        title="AI Academic Assistant"
        subtitle="Ask questions about your uploaded course materials"
        icon={<MessageSquare size={24} color="#00D4FF" />}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        <SupportChat />
      </div>
    </div>
  );
}
