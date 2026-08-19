import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Eye, X } from "lucide-react"

export function PendingKyc() {
  const pendingKyc = [
    {
      id: "KYC-2025-012",
      user: {
        name: "Halima Yusuf",
        avatar: "/placeholder.svg?height=36&width=36",
        initials: "ML",
      },
      idType: "Government ID",
      date: "March 20, 2025",
      status: "pending",
    },
    {
      id: "KYC-2025-013",
      user: {
        name: "Oluwaseun Adebayo",
        avatar: "/placeholder.svg?height=36&width=36",
        initials: "RK",
      },
      idType: "Passport",
      date: "March 19, 2025",
      status: "pending",
    },
    {
      id: "KYC-2025-014",
      user: {
        name: "Funke Adekunle",
        avatar: "/placeholder.svg?height=36&width=36",
        initials: "AH",
      },
      idType: "Government ID",
      date: "March 19, 2025",
      status: "pending",
    },
    {
      id: "KYC-2025-015",
      user: {
        name: "Bola Ahmed",
        avatar: "/placeholder.svg?height=36&width=36",
        initials: "DW",
      },
      idType: "Government ID",
      date: "March 18, 2025",
      status: "pending",
    },
  ]

  return (
    <div className="space-y-4">
      {pendingKyc.map((kyc) => (
        <Card key={kyc.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={kyc.user.avatar} alt={kyc.user.name} />
                  <AvatarFallback>{kyc.user.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{kyc.user.name}</h4>
                  <p className="text-sm text-muted-foreground">ID: {kyc.id}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                <div>
                  <p className="text-sm font-medium">ID Type: {kyc.idType}</p>
                  <p className="text-sm text-muted-foreground">Submitted: {kyc.date}</p>
                </div>
                <div>
                  <Badge variant="outline">Pending Verification</Badge>
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" /> View Documents
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive">
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
