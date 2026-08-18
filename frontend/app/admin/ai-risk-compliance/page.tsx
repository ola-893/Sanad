"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  Shield,
  AlertTriangle,
  TrendingUp,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Zap,
  Target,
  Activity,
} from "lucide-react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"

// Mock data for AI Risk Dashboard
const riskTrendData = [
  { month: "Jan", highRisk: 12, mediumRisk: 28, lowRisk: 145 },
  { month: "Feb", highRisk: 8, mediumRisk: 32, lowRisk: 167 },
  { month: "Mar", highRisk: 15, mediumRisk: 25, lowRisk: 189 },
  { month: "Apr", highRisk: 6, mediumRisk: 38, lowRisk: 201 },
  { month: "May", highRisk: 11, mediumRisk: 29, lowRisk: 223 },
  { month: "Jun", highRisk: 4, mediumRisk: 35, lowRisk: 245 },
]

const aiPerformanceData = [
  { metric: "KYC Accuracy", value: 98.5 },
  { metric: "AML Detection", value: 94.2 },
  { metric: "SAG Risk Scoring", value: 96.8 },
  { metric: "Default Prediction", value: 89.3 },
  { metric: "Fraud Detection", value: 97.1 },
]

export default function AiRiskCompliancePage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("7d")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Risk & Compliance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive AI-powered risk management and compliance monitoring for Suyula Liquid
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-success/10 text-success">
            <Activity className="h-3 w-3 mr-1" />
            All Systems Operational
          </Badge>
        </div>
      </div>

      {/* Critical Alerts */}
      <Alert className="border-destructive/30 bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive">High Priority Alerts</AlertTitle>
        <AlertDescription className="text-destructive">
          3 wallets flagged for suspicious activity, 2 SAG listings require immediate risk review, 1 AML match needs
          investigation
        </AlertDescription>
      </Alert>

      {/* AI Performance Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">KYC AI Accuracy</CardTitle>
            <Shield className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">98.5%</div>
            <Progress value={98.5} className="mt-2" />
            <div className="text-xs text-primary mt-1">+0.3% from last week</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AML Detection Rate</CardTitle>
            <Eye className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">94.2%</div>
            <Progress value={94.2} className="mt-2" />
            <div className="text-xs text-primary mt-1">+1.2% from last week</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SAG Risk Scoring</CardTitle>
            <Target className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">96.8%</div>
            <Progress value={96.8} className="mt-2" />
            <div className="text-xs text-primary mt-1">+0.8% from last week</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Default Prediction</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">89.3%</div>
            <Progress value={89.3} className="mt-2" />
            <div className="text-xs text-orange-600 mt-1">+2.1% from last week</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fraud Detection</CardTitle>
            <Zap className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">97.1%</div>
            <Progress value={97.1} className="mt-2" />
            <div className="text-xs text-destructive mt-1">+0.5% from last week</div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Risk Monitoring */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Trend Analysis</CardTitle>
              <CardDescription>AI-powered risk classification over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={riskTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="highRisk" stackId="1" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="mediumRisk" stackId="1" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="lowRisk" stackId="1" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Model Performance</CardTitle>
              <CardDescription>Accuracy metrics across different AI systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiPerformanceData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span className="font-medium">{item.metric}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={item.value} className="w-24" />
                      <span className="text-sm font-medium w-12">{item.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Risk Alerts</CardTitle>
              <CardDescription>Real-time AI-generated alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-destructive">High Risk Wallet</div>
                  <div className="text-sm text-destructive">Wallet 0x7A2...B4C flagged for velocity anomaly</div>
                  <div className="text-xs text-destructive mt-1">2 minutes ago</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/30">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-warning-foreground">SAG Risk Score</div>
                  <div className="text-sm text-warning">SAG-2024-0847 scored 85% risk - manual review required</div>
                  <div className="text-xs text-warning mt-1">5 minutes ago</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-blue-200">
                <Eye className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-primary">AML Match</div>
                  <div className="text-sm text-primary">Potential PEP match detected - investigation initiated</div>
                  <div className="text-xs text-primary mt-1">12 minutes ago</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-success">KYC Verified</div>
                  <div className="text-sm text-success">Batch of 23 KYC applications auto-approved</div>
                  <div className="text-xs text-success mt-1">18 minutes ago</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>AI system health monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">KYC AI Engine</span>
                <Badge variant="outline" className="bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AML Screening</span>
                <Badge variant="outline" className="bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Scoring</span>
                <Badge variant="outline" className="bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Wallet Monitor</span>
                <Badge variant="outline" className="bg-warning/10 text-warning">
                  <Clock className="h-3 w-3 mr-1" />
                  Maintenance
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compliance Bot</span>
                <Badge variant="outline" className="bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>AI Risk Management Actions</CardTitle>
          <CardDescription>Quick access to AI-powered compliance tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button className="h-20 flex-col gap-2 bg-primary hover:bg-primary/90">
              <Shield className="h-6 w-6" />
              <span>Run KYC Batch</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Eye className="h-6 w-6" />
              <span>AML Screening</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Target className="h-6 w-6" />
              <span>Risk Analysis</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <BarChart3 className="h-6 w-6" />
              <span>Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
