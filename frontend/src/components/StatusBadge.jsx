import React from 'react'

const statusConfig = {
  processing: {
    label: 'Processing',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400 animate-pulse',
  },
  uploading: {
    label: 'Uploading',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400 animate-pulse',
  },
  ready: {
    label: 'Ready',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/15 text-red-400 border-red-500/20',
    dot: 'bg-red-400',
  },
}

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.processing

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
