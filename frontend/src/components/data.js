// frontend/src/app/data.js

export const ROLE_COLOURS = {
  'Staff': { bg: '#E2DDD4', fg: '#6b7280' },
  'Line Manager': { bg: '#FEF3C7', fg: '#92400E' },
  'HR Admin': { bg: '#DBEAFE', fg: '#1E40AF' },
  'CEO': { bg: '#EDE9FE', fg: '#4C1D95' },
  'ICT Admin': { bg: '#D1FAE5', fg: '#065F46' }
};

// You can also store your Company KPAS here for other dashboards to use
export const KPAS = [
  { id: 1, title: 'Financial Resilience', weight: 14 },
  { id: 2, title: 'Operational Effectiveness', weight: 45 },
  { id: 3, title: 'Human Capital', weight: 26 },
  { id: 4, title: 'Safety & Environment', weight: 12 },
  { id: 5, title: 'Reputational Capital', weight: 3 }
];