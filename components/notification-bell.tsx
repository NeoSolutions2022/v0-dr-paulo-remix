"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Bell } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Notification {
  id: string
  title: string
  message: string
  created_at: string
  seen: boolean
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    // Load initial notifications
    loadNotifications()

    // Subscribe to realtime changes
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `patient_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[v0] New notification received:", payload)
          setNotifications((prev) => [payload.new as Notification, ...prev])
          setUnreadCount((c) => c + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("patient_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.seen).length)
    }
  }

  async function markAsSeen(id: string) {
    await supabase
      .from("notifications")
      .update({ seen: true })
      .eq("id", id)

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, seen: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <p className="font-semibold text-sm mb-2">Notificações</p>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Nenhuma notificação
            </p>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-3 cursor-pointer"
                  onClick={() => markAsSeen(notification.id)}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <p className="font-medium text-sm">{notification.title}</p>
                    {!notification.seen && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(notification.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
