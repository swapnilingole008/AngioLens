// AngioLens Notification System - Type Registry & Visual Style Tokens
// Connects to Flask API / PostgreSQL database for real live notifications

export const NOTIFICATION_TYPES = {
  review_required: {
    id: 'review_required',
    label: 'Review Required',
    dotColor: '#EF4444',
    dotBg: '#FEF2F2',
    iconSymbol: '🔴',
  },
  analysis_complete: {
    id: 'analysis_complete',
    label: 'Analysis Complete',
    dotColor: '#2563EB',
    dotBg: '#EFF6FF',
    iconSymbol: '🔵',
  },
  report_ready: {
    id: 'report_ready',
    label: 'Report Ready',
    dotColor: '#10B981',
    dotBg: '#ECFDF5',
    iconSymbol: '🟢',
  },
  verification_completed: {
    id: 'verification_completed',
    label: 'Verification Completed',
    dotColor: '#94A3B8',
    dotBg: '#F1F5F9',
    iconSymbol: '⚪',
  },
  new_analysis: {
    id: 'new_analysis',
    label: 'New Analysis',
    dotColor: '#8B5CF6',
    dotBg: '#F5F3FF',
    iconSymbol: '🟣',
  },
  analysis_failed: {
    id: 'analysis_failed',
    label: 'Analysis Failed',
    dotColor: '#DC2626',
    dotBg: '#FEF2F2',
    iconSymbol: '⚠️',
  },
};
