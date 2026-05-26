import { createContext, useContext, useState, ReactNode } from 'react';
import { EMP, PORTAL_ROLES as INITIAL_ROLES, Employee, Appraisal } from './data';

interface AppState {
  staff: Employee[];
  roles: Record<number, { role: string; email: string; since: string }>;
  appraisals: Appraisal[];
  cpPct: number | null;
  scorecardLocked: boolean;
  navActive: string;
  setNavActive: (nav: string) => void;
  addStaff: (e: Employee, roleData: { role: string; email: string; since: string } | null) => void;
  updateStaff: (id: number, data: Partial<Employee>, roleData: { role: string; email: string; since: string } | null) => void;
  removeStaff: (id: number) => void;
  updateAppraisal: (id: string | number, updates: Partial<Appraisal>) => void;
  loadDemoData: () => void;
  addNotification: (title: string, desc: string, icon?: string) => void;
  closeNotification: () => void;
  notification: { open: boolean, title: string, desc: string, icon: string } | null;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Employee[]>([...EMP]);
  const [roles, setRoles] = useState({ ...INITIAL_ROLES });
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [cpPct] = useState<number | null>(null);
  const [scorecardLocked] = useState<boolean>(false);
  const [navActive, setNavActive] = useState('dash');
  
  const [notification, setNotification] = useState<{ open: boolean, title: string, desc: string, icon: string } | null>(null);

  const addNotification = (title: string, desc: string, icon: string = '✅') => {
    setNotification({ open: true, title, desc, icon });
  };
  
  const closeNotification = () => setNotification(null);

  const addStaff = (e: Employee, roleData: { role: string; email: string; since: string } | null) => {
    setStaff(s => [...s, e]);
    if (roleData) {
      setRoles(r => ({ ...r, [e.id]: roleData }));
    }
  };

  const updateStaff = (id: number, data: Partial<Employee>, roleData: { role: string; email: string; since: string } | null) => {
    setStaff(s => s.map(emp => emp.id === id ? { ...emp, ...data } : emp));
    setRoles(r => {
      const newRoles = { ...r };
      if (roleData) {
        newRoles[id] = roleData;
      } else {
        delete newRoles[id];
      }
      return newRoles;
    });
  };

  const removeStaff = (id: number) => {
    setStaff(s => s.filter(e => e.id !== id));
    setRoles(r => {
      const newRoles = { ...r };
      delete newRoles[id];
      return newRoles;
    });
  };

  const updateAppraisal = (id: string | number, updates: Partial<Appraisal>) => {
    setAppraisals(apps => apps.map(a => String(a.id) === String(id) ? { ...a, ...updates } : a));
  };

  const ts = () => new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

  const loadDemoData = () => {
    const demos = [
      {empId:267,iprfFactor:1.0,criteria:{results:1.0,behaviors:1.0,safety:1.3,competence:1.0,dependability:0.7,adaptability:1.0},managerComment:'Consistent performer. Safety leadership excellent.'},
      {empId:374,iprfFactor:1.3,criteria:{results:1.3,behaviors:1.3,safety:1.0,competence:1.3,dependability:1.3,adaptability:1.0},managerComment:'Outstanding — EP justification: Led major HR restructuring, reduced time-to-hire 35%.',epJustification:'Led full HR onboarding restructuring. Independently managed 3 staff disputes with no escalations. Presented department strategy to Board.'},
      {empId:276,iprfFactor:0.7,criteria:{results:0.7,behaviors:1.0,safety:1.0,competence:0.7,dependability:0.7,adaptability:1.0},managerComment:'Projects behind schedule. Coaching plan in place.'},
      {empId:412,iprfFactor:1.0,criteria:{results:1.0,behaviors:1.0,safety:1.0,competence:1.0,dependability:1.0,adaptability:1.0},managerComment:'Consistent performer. Meets all expectations.'},
      {empId:303,iprfFactor:1.0,criteria:{results:1.0,behaviors:1.3,safety:1.0,competence:1.0,dependability:1.0,adaptability:1.3},managerComment:'Good initiative and adaptability shown this quarter.'},
      {empId:448,iprfFactor:1.0,criteria:{results:1.0,behaviors:1.0,safety:1.0,competence:1.0,dependability:1.0,adaptability:1.0},managerComment:'Pro-rata applies — joined Aug 2026.'},
    ];
    const newApps = [...appraisals];
    let loaded = 0;
    demos.forEach(d => {
      const emp = staff.find(e => e.id === d.empId);
      if (!emp) return;
      if (newApps.find(a => a.empId === d.empId && a.quarter === 'Q3')) return;
      newApps.push({
        id: Date.now() + Math.random(),
        empId: d.empId,
        empName: `${emp.fn} ${emp.ln}`,
        empRole: emp.title,
        empCo: emp.co,
        proRata: emp.pr / 12,
        manager: 'Morris, Jared C.',
        quarter: 'Q3',
        iprfFactor: d.iprfFactor,
        iprfLabel: d.iprfFactor===1.3?'Exceeds Performance (EP)':d.iprfFactor===1.0?'Fully Effective (E)':d.iprfFactor===0.7?'Needs Improvement (NI)':'Less than Satisfactory (LS)',
        criteria: d.criteria,
        managerComment: d.managerComment,
        epJustification: d.epJustification || '',
        hrComment: '',
        status: 'At HR',
        submittedAt: ts(),
        awardPct: cpPct ? cpPct * d.iprfFactor * (emp.pr/12) * 100 : null
      });
      loaded++;
    });
    setAppraisals(newApps);
    if(loaded > 0) {
      addNotification('Demo Data Loaded', `${loaded} sample appraisals loaded for review. Go to Review Appraisals to process them.`, '📋');
      setNavActive('review');
    }
  };

  return (
    <AppContext.Provider value={{
      staff, roles, appraisals, cpPct, scorecardLocked,
      navActive, setNavActive,
      addStaff, updateStaff, removeStaff, updateAppraisal,
      loadDemoData, addNotification, closeNotification, notification
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
