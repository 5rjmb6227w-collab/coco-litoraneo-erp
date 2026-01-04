/**
 * Copiloto IA - Página principal com abas
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, MessageSquare, Lightbulb, Bell, ListTodo, Settings } from "lucide-react";
import { ChatPanel } from "@/components/copilot/ChatPanel";
import { InsightCards } from "@/components/copilot/InsightCards";
import { AlertsTable } from "@/components/copilot/AlertsTable";
import { ActionsQueue } from "@/components/copilot/ActionsQueue";
import { CopilotSettings } from "@/components/copilot/CopilotSettings";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Copiloto() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("chat");
  
  const isAdmin = user?.role === "admin" || user?.role === "ceo";

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Bot className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Copiloto IA</h1>
            <p className="text-sm text-stone-500">Assistente inteligente do Coco Litorâneo</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex bg-stone-100">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alertas</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Ações</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="config" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 mt-4">
            <TabsContent value="chat" className="h-full m-0">
              <ChatPanel />
            </TabsContent>
            
            <TabsContent value="insights" className="m-0">
              <InsightCards />
            </TabsContent>
            
            <TabsContent value="alerts" className="m-0">
              <AlertsTable />
            </TabsContent>
            
            <TabsContent value="actions" className="m-0">
              <ActionsQueue />
            </TabsContent>
            
            {isAdmin && (
              <TabsContent value="config" className="m-0">
                <CopilotSettings />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
