"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bell, Send, Plus, Mail, AlertCircle, CheckCircle, Clock, Users, Filter } from "lucide-react"

const notifications = [
  {
    id: 1,
    title: "New SAG Application Submitted",
    message: "SAG #10295 has been submitted for review by James Wilson",
    type: "info",
    recipient: "All Admins",
    timestamp: "2 minutes ago",
    status: "sent",
  },
  {
    id: 2,
    title: "KYC Verification Required",
    message: "8 new KYC applications are pending verification",
    type: "warning",
    recipient: "Compliance Team",
    timestamp: "15 minutes ago",
    status: "sent",
  },
  {
    id: 3,
    title: "Loan Repayment Overdue",
    message: "3 loans are overdue for repayment - immediate action required",
    type: "urgent",
    recipient: "Collections Team",
    timestamp: "1 hour ago",
    status: "sent",
  },
  {
    id: 4,
    title: "System Maintenance Scheduled",
    message: "Scheduled maintenance window: Tomorrow 2:00 AM - 4:00 AM MYT",
    type: "info",
    recipient: "All Users",
    timestamp: "3 hours ago",
    status: "scheduled",
  },
]

export default function NotificationsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState("all")
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
    recipient: "all",
  })

  const handleSendNotification = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsLoading(false)
    alert("Notification sent successfully!")
    setNewNotification({ title: "", message: "", type: "info", recipient: "all" })
  }

  const filteredNotifications =
    selectedType === "all" ? notifications : notifications.filter((n) => n.type === selectedType)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-warning" />
      case "info":
        return <Bell className="h-4 w-4 text-primary" />
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>
      case "warning":
        return (
          <Badge variant="secondary" className="bg-warning/10 text-warning-foreground">
            Warning
          </Badge>
        )
      case "info":
        return (
          <Badge variant="outline" className="bg-muted text-primary">
            Info
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-success" />
      case "scheduled":
        return <Clock className="h-4 w-4 text-primary" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">Manage platform notifications and alerts</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Send New Notification</DialogTitle>
              <DialogDescription>Create and send a notification to users or admin teams</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Notification title..."
                  value={newNotification.title}
                  onChange={(e) => setNewNotification((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Notification message..."
                  value={newNotification.message}
                  onChange={(e) => setNewNotification((prev) => ({ ...prev, message: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newNotification.type}
                    onValueChange={(value) => setNewNotification((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Select
                    value={newNotification.recipient}
                    onValueChange={(value) => setNewNotification((prev) => ({ ...prev, recipient: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admins">All Admins</SelectItem>
                      <SelectItem value="compliance">Compliance Team</SelectItem>
                      <SelectItem value="collections">Collections Team</SelectItem>
                      <SelectItem value="investors">Investors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSendNotification}
                disabled={isLoading || !newNotification.title || !newNotification.message}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Notification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
            <Send className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">247</div>
            <div className="text-xs text-muted-foreground">This month</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12</div>
            <div className="text-xs text-muted-foreground">Scheduled</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Rate</CardTitle>
            <Mail className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">87%</div>
            <div className="text-xs text-muted-foreground">Last 30 days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <Users className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1,247</div>
            <div className="text-xs text-muted-foreground">Receiving notifications</div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>View and manage sent notifications</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/40">
                <div className="flex-shrink-0 mt-1">{getTypeIcon(notification.type)}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{notification.title}</h4>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(notification.type)}
                      {getStatusIcon(notification.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>To: {notification.recipient}</span>
                    <span>•</span>
                    <span>{notification.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>Pre-defined notification templates for common scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">KYC Reminder</h4>
              <p className="text-sm text-muted-foreground mb-3">Remind users to complete KYC verification</p>
              <Button variant="outline" size="sm">
                Use Template
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Payment Due</h4>
              <p className="text-sm text-muted-foreground mb-3">Notify users about upcoming payment due dates</p>
              <Button variant="outline" size="sm">
                Use Template
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">System Maintenance</h4>
              <p className="text-sm text-muted-foreground mb-3">Inform users about scheduled maintenance</p>
              <Button variant="outline" size="sm">
                Use Template
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">New Feature</h4>
              <p className="text-sm text-muted-foreground mb-3">Announce new platform features</p>
              <Button variant="outline" size="sm">
                Use Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
