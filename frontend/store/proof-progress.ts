import { create } from 'zustand'

export type ProofJobType = 'invest' | 'repay'
export type ProofJobStatus = 'queued' | 'proving' | 'completed' | 'failed'

export interface ProofJob {
  id: string
  type: ProofJobType
  jobId: string
  sagName?: string
  sagTokenId?: string
  amountUsd?: number
  ethAmount?: string
  sourceTxHash: string
  cc3TxHash?: string
  status: ProofJobStatus
  progress: number
  message: string
  createdAt: number
}

interface ProofProgressState {
  jobs: ProofJob[]
  addJob: (job: Omit<ProofJob, 'id' | 'status' | 'progress' | 'message' | 'createdAt'>) => string
  updateJob: (id: string, updates: Partial<ProofJob>) => void
  removeJob: (id: string) => void
  clearCompleted: () => void
}

// Load from localStorage on init
function loadJobs(): ProofJob[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('sanad-proof-jobs')
    if (!stored) return []
    const jobs: ProofJob[] = JSON.parse(stored)
    // Reset any stuck jobs to queued (they'll be re-polled)
    return jobs.map(j => ({
      ...j,
      status: j.status === 'completed' || j.status === 'failed' ? j.status : 'queued',
    }))
  } catch { return [] }
}

function saveJobs(jobs: ProofJob[]) {
  try {
    // Only persist non-completed/failed jobs
    const active = jobs.filter(j => j.status !== 'completed' && j.status !== 'failed')
    localStorage.setItem('sanad-proof-jobs', JSON.stringify(active))
  } catch {}
}

let jobCounter = 0

export const useProofProgress = create<ProofProgressState>((set, get) => ({
  jobs: loadJobs(),

  addJob: (job) => {
    const id = `proof-${Date.now()}-${++jobCounter}`
    const newJob: ProofJob = {
      ...job,
      id,
      status: 'queued',
      progress: 10,
      message: 'Queuing proof job...',
      createdAt: Date.now(),
    }
    set((state) => {
      const jobs = [...state.jobs, newJob]
      saveJobs(jobs)
      return { jobs }
    })
    return id
  },

  updateJob: (id, updates) => {
    set((state) => {
      const jobs = state.jobs.map(j => j.id === id ? { ...j, ...updates } : j)
      saveJobs(jobs)
      return { jobs }
    })
  },

  removeJob: (id) => {
    set((state) => {
      const jobs = state.jobs.filter(j => j.id !== id)
      saveJobs(jobs)
      return { jobs }
    })
  },

  clearCompleted: () => {
    set((state) => {
      const jobs = state.jobs.filter(j => j.status !== 'completed' && j.status !== 'failed')
      saveJobs(jobs)
      return { jobs }
    })
  },
}))
