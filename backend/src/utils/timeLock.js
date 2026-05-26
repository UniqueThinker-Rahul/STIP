const isQuarterLocked = (year, quarter) => {
  const now = new Date();
  
  // Note: JavaScript months are 0-indexed (March = 2, June = 5, Sept = 8, Dec = 11)
  const deadlines = {
    'Q1': new Date(year, 2, 31, 23, 59, 59),  // March 31
    'Q2': new Date(year, 5, 30, 23, 59, 59),  // June 30
    'Q3': new Date(year, 8, 30, 23, 59, 59),  // September 30
    'Q4': new Date(year, 11, 31, 23, 59, 59)  // December 31
  };

  const deadlineDate = deadlines[quarter];
  if (!deadlineDate) return false;

  // Returns true if the current exact time is past the midnight deadline
  return now > deadlineDate;
};

module.exports = { isQuarterLocked };