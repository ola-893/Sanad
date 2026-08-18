import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle, Shield, ExternalLinkIcon } from 'lucide-react'
import { SAGCreationProgressData, SAGCreationCompleteData, SAGCreationErrorData } from '@/lib/socket'

interface SAGCreationProgressTrackerProps {
  isVisible: boolean
  onClose: () => void
  progressData: SAGCreationProgressData | null
  completeData: SAGCreationCompleteData | null
  errorData: SAGCreationErrorData | null
}

const stageLabels = {
  queued: 'Queued',
  validating: 'Validating',
  creating_sag: 'Creating SAG',
  creating_token: 'Creating Token',
  uploading_metadata: 'Uploading Metadata',
  minting_tokens: 'Minting Tokens',
  updating_sag: 'Updating SAG',
  complete: 'Complete',
}

const stageDescriptions = {
  queued: 'Your SAG creation request has been queued for processing',
  validating: 'Validating SAG data and user permissions',
  creating_sag: 'Creating SAG record in database',
  creating_token: 'Creating Hedera token for your jewelry',
  uploading_metadata: 'Uploading NFT metadata to IPFS',
  minting_tokens: 'Minting NFT tokens on Hedera network',
  updating_sag: 'Updating SAG with token information',
  complete: 'SAG creation completed successfully',
}

export function SAGCreationProgressTracker({
  isVisible,
  onClose,
  progressData,
  completeData,
  errorData,
}: SAGCreationProgressTrackerProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!isVisible) return null

  const getStatusIcon = () => {
    if (errorData) return <XCircle className="h-5 w-5 text-destructive" />
    if (completeData) return <CheckCircle className="h-5 w-5 text-success" />
    if (progressData) return <Loader2 className="h-5 w-5 text-primary animate-spin" />
    return <Clock className="h-5 w-5 text-muted-foreground" />
  }

  const getStatusColor = () => {
    if (errorData) return 'bg-destructive/10 border-destructive/30 dark:bg-red-900/20 dark:border-red-700'
    if (completeData) return 'bg-success/10 border-success/30 dark:bg-green-900/20 dark:border-green-700'
    return 'bg-muted border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
  }

  const getStatusText = () => {
    if (errorData) return 'SAG Creation Failed'
    if (completeData) return 'SAG Created Successfully'
    if (progressData) return 'Creating SAG'
    return 'Initializing...'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-80 ${getStatusColor()}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <CardTitle className="text-lg">{getStatusText()}</CardTitle>
                <CardDescription>
                  {progressData?.sagId || completeData?.sagId || errorData?.sagId || 'Processing...'}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {progressData && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progressData.progress}%</span>
              </div>
              <Progress value={progressData.progress} className="h-2" />
            </div>
          )}

          {/* Current Stage */}
          {progressData && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {stageLabels[progressData.stage]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {progressData.message}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {stageDescriptions[progressData.stage]}
              </p>
            </div>
          )}

          {/* Error Display */}
          {errorData && (
            <div className="bg-destructive/10 dark:bg-red-900/30 p-3 rounded-lg border border-destructive/30 dark:border-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive dark:text-red-200">
                    SAG Creation Failed
                  </p>
                  <p className="text-xs text-destructive dark:text-red-300 mt-1">
                    {errorData.error}
                  </p>
                  <p className="text-xs text-destructive dark:text-red-400 mt-1">
                    {new Date(errorData.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Display */}
          {completeData && (
            <div className="space-y-3">
              <div className="bg-success/10 dark:bg-green-900/30 p-3 rounded-lg border border-success/30 dark:border-green-700">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-success dark:text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-success dark:text-green-200">
                      NFT Collateral Generated
                    </p>
                    <p className="text-xs text-success dark:text-green-300 mt-1">
                      Your jewelry is now secured as an NFT on Hedera
                    </p>
                    <p className="text-xs text-success dark:text-success mt-1">
                      {new Date(completeData.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* SAG Details */}
              {completeData.data && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full"
                  >
                    {showDetails ? 'Hide' : 'Show'} SAG Details
                  </Button>

                  {showDetails && (
                    <div className="bg-muted/40 dark:bg-card p-3 rounded-lg space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SAG ID:</span>
                        <span className="font-medium">{completeData.sagId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token ID:</span>
                        <span className="font-medium">{completeData.tokenId}</span>
                      </div>
                      {completeData.data.transactionHash && (
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Transaction Hash:</p>
                          <div className="text-xs font-mono bg-muted dark:bg-gray-700 p-1 rounded break-all">
                            {completeData.data.transactionHash}
                          </div>
                        </div>
                      )}
                      {completeData.tokenId && (
                        <div className="pt-2">
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <a 
                              href={`${process.env.NEXT_PUBLIC_ENV_URL}/${completeData.tokenId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2"
                            >
                              <ExternalLinkIcon className="h-3 w-3" />
                              View on HashScan
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {(completeData || errorData) && (
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            )}
            {progressData && !completeData && !errorData && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                Minimize
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
