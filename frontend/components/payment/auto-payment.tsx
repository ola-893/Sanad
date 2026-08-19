"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Wallet, Bell, Clock, Shield, Loader2, CheckCircle2 } from "lucide-react"

const glass = "glass-panel rounded-3xl border border-[#171414]/15 bg-white/60 shadow-soft-editorial"

export function AutoPayment() {
  const [autoPayEnabled, setAutoPayEnabled] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderDays, setReminderDays] = useState("3")
  const [selectedLoans, setSelectedLoans] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loans = [
    { id: "sag-1", title: "Gold Collateral Loan", amount: "—", dueDate: "Upon funding" },
  ]

  const handleLoanToggle = (loanId: string) => {
    setSelectedLoans((prev) =>
      prev.includes(loanId) ? prev.filter((id) => id !== loanId) : [...prev, loanId]
    )
  }

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setSaved(true)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auto-pay" className="text-sm font-medium">
            Auto-Repay via Creditcoin
          </Label>
          <p className="text-xs text-muted-foreground">
            Automatically submit repayments on-chain before each due date
          </p>
        </div>
        <Switch id="auto-pay" checked={autoPayEnabled} onCheckedChange={setAutoPayEnabled} />
      </div>

      {autoPayEnabled && (
        <>
          {/* How It Works */}
          <Card className={glass}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/25">
                  <Shield className="h-4 w-4 text-[#171414]" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#171414]">How Auto-Repay Works</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Before each due date, the system submits a CTC repayment transaction from your
                    wallet to the Repayment Gateway contract on Creditcoin CC3. The transaction is
                    verified on-chain and your loan status is updated automatically.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Selection */}
          <div className="space-y-3">
            <Label>Select Loans for Auto-Repay</Label>
            {loans.map((loan) => (
              <Card
                key={loan.id}
                className={`${glass} ${selectedLoans.includes(loan.id) ? "ring-1 ring-primary" : ""} cursor-pointer transition-all hover:bg-white/80`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`loan-${loan.id}`}
                      checked={selectedLoans.includes(loan.id)}
                      onCheckedChange={() => handleLoanToggle(loan.id)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`loan-${loan.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {loan.title}
                      </Label>
                      <div className="mt-1 flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          CTC
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">
                          Due: {loan.dueDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label>Repayment Frequency</Label>
            <Select defaultValue="monthly">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reminder" className="text-sm font-medium">
                  Payment Reminders
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notified before your auto-repay executes
                </p>
              </div>
              <Switch id="reminder" checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </div>

            {reminderEnabled && (
              <div className="space-y-2">
                <Label>Remind Me</Label>
                <Select value={reminderDays} onValueChange={setReminderDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="5">5 days before</SelectItem>
                    <SelectItem value="7">7 days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Notification Channels */}
          <div className="space-y-2">
            <Label>Notification Methods</Label>
            <div className="flex flex-col space-y-2">
              {[
                { id: "notify-email", label: "Email" },
                { id: "notify-sms", label: "SMS" },
                { id: "notify-app", label: "In-App Notification" },
              ].map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox id={item.id} defaultChecked />
                  <Label htmlFor={item.id} className="text-sm cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          {saved ? (
            <div className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-sm text-success">Auto-repay settings saved successfully</p>
            </div>
          ) : (
            <Button
              onClick={handleSave}
              className="w-full rounded-full bg-[#171414] font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1BAC2] hover:bg-black"
              disabled={selectedLoans.length === 0 || isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Auto-Repay Settings"
              )}
            </Button>
          )}
        </>
      )}

      {!autoPayEnabled && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/10 p-4">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Auto-repay is disabled. Enable it to schedule automatic CTC repayments on-chain before each due date.
          </p>
        </div>
      )}
    </div>
  )
}
