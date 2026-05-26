// frontend/src/app/components/helpers.js

export const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const coTag = (co) => {
  if (co === 'FSM') return 'tag-blue';
  if (co === 'CDU') return 'tag-green';
  if (co === 'NAR') return 'tag-amber';
  return 'tag-purple';
};