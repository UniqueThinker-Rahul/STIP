'use client';

import { useState, useEffect, useRef } from 'react';
import { User, CheckCircle, Calculator, X, ChevronDown, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';

export default function AddNewStaff() {
  const router = useRouter();

  const [managerList, setManagerList] = useState([]);
  const [companyCodes, setCompanyCodes] = useState([]);
  const [officeLocations, setOfficeLocations] = useState([]);
  const [jobTitles, setJobTitles] = useState([]); 
  
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successDetail, setSuccessDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fn: '', mn: '', ln: '', title: '', office: '', co: '', mgrId: '', hire: '', empId: '' 
  });

  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchQueries, setSearchQueries] = useState({ mgrId: '', title: '', office: '', co: '' }); // 🚨 FIX: Added 'co' state
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mgrRes, configRes] = await Promise.all([
          api.get('/users/managers'),
          api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })) 
        ]);
        
        setManagerList(mgrRes.data?.data || []);
        
        const configData = configRes.data?.data || {};
        
        // Fallback defaults just in case the backend config is empty
        setCompanyCodes(configData.companyCodes || ['FSM', 'CDU', 'NAR', 'GUM']);
        setOfficeLocations(configData.officeLocations || ['Headquarters', 'Branch A', 'Branch B']);
        setJobTitles(configData.jobTitles || ['Manager', 'Analyst', 'Coordinator', 'Specialist']); 
        
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id.replace('n', '')]: value }));
  };

  const handleSelectOption = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setOpenDropdown(null);
    setSearchQueries(prev => ({ ...prev, [field]: '' }));
  };

  let prStr = '';
  let prColor = '';
  let prDays = 0;
  let prFraction = 0;
  let prMonths = 0;

  if (formData.hire) {
    const hireDate = new Date(formData.hire);
    const currentYear = new Date().getFullYear(); 
    const yearStart = new Date(`${currentYear}-01-01T00:00:00`);
    const yearEnd = new Date(`${currentYear}-12-31T23:59:59`);
    const startDate = hireDate > yearStart ? hireDate : yearStart;
    
    if (startDate <= yearEnd) {
      prDays = (yearEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
      prFraction = Math.min(1, prDays / 365);
      prMonths = prFraction * 12;
    } else {
      prFraction = 0;
      prMonths = 0;
    }

    prStr = `${prFraction.toFixed(3)} (${prMonths.toFixed(2)} / 12 months)`;
    prColor = prFraction >= 1 ? 'text-[#059669]' : prFraction >= 0.5 ? 'text-[#D97706]' : 'text-[#DC2626]';
  }

  const saveNewStaff = async () => {
    const { fn, mn, ln, title, office, co, mgrId, hire, empId } = formData;
    
    if (!fn || !ln || !title || !office || !co || !mgrId || !hire || !empId) {
      alert('Please fill in all required fields, including Office Station and Employee ID.');
      return;
    }

    try {
      setIsSubmitting(true);
      const safeFirst = fn.toLowerCase().replace(/\s+/g, '');
      const safeLast = ln.toLowerCase().replace(/\s+/g, '');
      const generatedEmail = `${safeFirst}.${safeLast}@fsmpc.fm`;
      const fullFirstName = mn.trim() ? `${fn.trim()} ${mn.trim()}` : fn.trim();

      const payload = {
        employeeId: empId.trim(),
        firstName: fullFirstName,
        lastName: ln.trim(),
        jobTitle: title.trim(),
        officeLocation: office,
        companyCode: co,
        dateOfHire: hire, 
        role: "EMPLOYEE",
        reportingTo: mgrId || null,
        email: generatedEmail,
        password: "Password123!",
        isActive: true,
        prorateValue: prMonths
      };

      await api.post('/users', payload);

      setSuccessDetail(`${fullFirstName} ${ln} (${title}) added to the system with ID ${empId}. Pro-Rata: ${(prMonths / 12).toFixed(3)}.`);
      setSuccessModalOpen(true);
      clearForm();
      
    } catch (error) {
      const backendMessage = error.response?.data?.message || "An error occurred while creating the employee.";
      alert(`Server Error: ${backendMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    setFormData({ fn: '', mn: '', ln: '', title: '', office: '', co: '', mgrId: '', hire: '', empId: '' });
  };

  // 🚨 FIX: Deep String Safety
  const renderSearchableDropdown = (field, options, placeholder, displayKey, valueKey = null) => {
    const isOpen = openDropdown === field;
    const query = searchQueries[field] || ''; // Fallback to empty string

    const filteredOptions = options.filter(opt => {
      // Safely extract string, fallback to empty string if undefined
      const rawText = typeof opt === 'string' ? opt : (displayKey ? displayKey(opt) : '');
      const text = String(rawText || ''); 
      return text.toLowerCase().includes(query.toLowerCase());
    });

    const selectedText = formData[field] 
      ? (typeof options[0] === 'string' 
          ? formData[field] 
          : displayKey(options.find(o => (valueKey ? o[valueKey] : o._id) === formData[field])) || placeholder)
      : placeholder;

    return (
      <div className="relative w-full" ref={isOpen ? dropdownRef : null}>
        <div 
          onClick={() => setOpenDropdown(isOpen ? null : field)}
          className={`w-full px-[12px] py-[9px] border-[1.5px] rounded-[8px] text-[13px] bg-white transition-colors cursor-pointer flex justify-between items-center ${isOpen ? 'border-[#0D2B55] ring-2 ring-[#0D2B55]/10' : 'border-[#E2DDD4]'}`}
        >
          <span className={formData[field] ? "text-[#0f1923]" : "text-gray-400 truncate"}>{selectedText}</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <div className="absolute z-[50] mt-1 w-full bg-white border border-[#E2DDD4] rounded-[8px] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-gray-100 bg-slate-50 sticky top-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search..."
                  value={searchQueries[field] || ''}
                  onChange={(e) => setSearchQueries(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md outline-none focus:border-[#0D2B55]"
                />
              </div>
            </div>
            
            <div className="max-h-[200px] overflow-y-auto overflow-x-hidden">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-xs text-center text-gray-500">No results found</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const val = typeof opt === 'string' ? opt : (valueKey ? opt[valueKey] : opt._id);
                  const display = typeof opt === 'string' ? opt : displayKey(opt);
                  const isSelected = formData[field] === val;
                  
                  return (
                    <div
                      key={val || idx}
                      onClick={() => handleSelectOption(field, val)}
                      className={`px-3 py-2 text-[12px] cursor-pointer hover:bg-[#0D2B55] hover:text-white transition-colors truncate ${isSelected ? 'bg-blue-50 font-bold text-[#0D2B55]' : 'text-[#0f1923]'}`}
                    >
                      {display}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-[60px] font-sans">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-[22px] gap-4">
        <div>
          <h1 className="text-[22px] font-[800] text-[#0D2B55]">+ Add New Staff</h1>
          <p className="text-[13px] text-[#6b7280] mt-[3px]">Register a new STIP-eligible employee</p>
        </div>
        <div className="flex gap-[10px] flex-wrap">
          <button 
            onClick={() => router.push('/dashboard/hr/staff')}
            className="px-[18px] py-[9px] rounded-[8px] text-[13px] font-[700] cursor-pointer border-[1.5px] border-[#E2DDD4] bg-white text-[#0f1923] inline-flex items-center gap-[6px] hover:bg-slate-50 transition-colors shadow-sm"
          >
            &larr; Back to Staff
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px]">
        
        {/* Main Form Card */}
        <div className="lg:col-span-2 bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden self-start shadow-sm">
          <div className="px-[18px] py-[14px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center justify-between gap-3">
            <div className="flex items-center gap-[10px]">
              <div className="w-[32px] h-[32px] rounded-[8px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <User className="w-[16px] h-[16px]" />
              </div>
              <div>
                <div className="text-[13px] font-[800] text-[#0D2B55]">Employee Details</div>
                <div className="text-[11px] text-[#6b7280] mt-[1px]">All fields marked * are required</div>
              </div>
            </div>
          </div>
          
          <div className="p-[20px]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px] mb-[14px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55]">First Name <span className="text-[#DC2626]">*</span></label>
                <input
                  id="nfn" type="text" placeholder="e.g. Francis"
                  className="px-[12px] py-[9px] border-[1.5px] border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                  value={formData.fn} onChange={handleInputChange}
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55] flex items-center justify-between">
                  Middle Name <span className="text-[9px] text-[#6b7280] font-normal uppercase">Optional</span>
                </label>
                <input
                  id="nmn" type="text" placeholder="e.g. James"
                  className="px-[12px] py-[9px] border-[1.5px] border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                  value={formData.mn} onChange={handleInputChange}
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55]">Last Name <span className="text-[#DC2626]">*</span></label>
                <input
                  id="nln" type="text" placeholder="e.g. Sharma"
                  className="px-[12px] py-[9px] border-[1.5px] border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                  value={formData.ln} onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px] mb-[14px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55]">Job Title <span className="text-[#DC2626]">*</span></label>
                {renderSearchableDropdown('title', jobTitles, 'Search Title...', null)}
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55]">Office Station <span className="text-[#DC2626]">*</span></label>
                {renderSearchableDropdown('office', officeLocations, 'Search Office...', null)}
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55]">Company Code <span className="text-[#DC2626]">*</span></label>
                {renderSearchableDropdown('co', companyCodes, 'Select Company...', null)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] mb-[14px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55]">Reporting Manager <span className="text-[#DC2626]">*</span></label>
                {renderSearchableDropdown('mgrId', managerList, 'Search for Manager...', (m) => {
                  if (!m) return '';
                  const fName = m.personalDetails?.firstName || m.firstName || '';
                  const lName = m.personalDetails?.lastName || m.lastName || '';
                  const isSecondary = !['MANAGER', 'HR_ADMIN', 'CEO'].includes(m.security?.role);
                  return `${fName} ${lName}${isSecondary ? ` (${m.security?.role})` : ''}`.trim();
                })}
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55]">Last Hire Date <span className="text-[#DC2626]">*</span></label>
                <input
                  id="nhire" type="date"
                  value={formData.hire} onChange={handleInputChange}
                  className="px-[12px] py-[9px] border-[1.5px] border-[#E2DDD4] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] mb-[14px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55] flex items-center">
                  Employee ID <span className="text-[#DC2626] ml-[4px]">*</span>
                  <span className="text-[9px] font-[800] bg-[#E2DDD4] text-[#6b7280] px-[6px] py-[2px] rounded-[4px] ml-[8px] uppercase">Manual Input</span>
                </label>
                <input
                  id="nempId" type="text" placeholder="e.g. FSM-1045"
                  value={formData.empId} onChange={handleInputChange}
                  className="px-[12px] py-[9px] border-[1.5px] border-[#E2DDD4] bg-white text-[#0f1923] rounded-[8px] text-[13px] outline-none focus:border-[#0D2B55] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[11px] font-[800] text-[#0D2B55] flex items-center">
                  Pro-Rata Value <span className="text-[9px] font-[800] bg-[#E2DDD4] text-[#6b7280] px-[6px] py-[2px] rounded-[4px] ml-[8px] uppercase">Auto-calculated</span>
                </label>
                <input
                  readOnly placeholder="Calculated from hire date" value={prStr}
                  className={`px-[12px] py-[9px] border-[1.5px] border-dashed border-[#E2DDD4] bg-[#FAF8F4] rounded-[8px] text-[13px] outline-none cursor-default font-[600] ${prColor || 'text-[#6b7280]'}`}
                />
              </div>
            </div>

            {formData.hire && (
              <div className="bg-[#D1FAE5] rounded-[8px] px-[12px] py-[10px] text-[12px] text-[#065F46] mb-[16px] border border-[#A7F3D0]">
                Pro-Rata = {prDays.toFixed(0)} days &divide; 365 = <strong className="font-[800]">{prFraction.toFixed(3)}</strong> ({prMonths.toFixed(2)} months)
              </div>
            )}

            <div className="flex gap-[10px] mt-[8px] flex-wrap">
              <button 
                onClick={saveNewStaff} disabled={isSubmitting}
                className="px-[18px] py-[10px] bg-[#0D2B55] hover:bg-[#1a3d6e] text-white rounded-[8px] text-[13px] font-[800] inline-flex items-center gap-[8px] transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle className="w-[16px] h-[16px]" /> 
                {isSubmitting ? 'Saving...' : 'Save New Staff Member'}
              </button>
              <button 
                onClick={clearForm} disabled={isSubmitting}
                className="px-[18px] py-[10px] bg-white border-[1.5px] border-[#E2DDD4] hover:border-[#0D2B55] text-[#0f1923] rounded-[8px] text-[13px] font-[700] inline-flex items-center gap-[8px] transition-colors"
              >
                <X className="w-[16px] h-[16px]" /> Clear Form
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info Cards */}
        <div className="flex flex-col gap-[16px]">
          <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm">
            <div className="px-[18px] py-[14px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[32px] h-[32px] rounded-[8px] bg-[#FFFBEB] text-[#D97706] shrink-0 flex items-center justify-center">
                <Calculator className="w-[16px] h-[16px]" />
              </div>
              <div className="text-[13px] font-[800] text-[#0D2B55]">Pro-Rata Formula</div>
            </div>
            <div className="p-[16px]">
              <div className="bg-[#0D2B55] rounded-[8px] p-[12px] font-mono text-[11px] text-[#e8c96a] leading-relaxed mb-[10px] shadow-inner">
                Start = MAX(HireDate, 1 Jan CurrentYear)<br />
                Days = 31 Dec CurrentYear &minus; Start<br />
                Pro-Rata = Days &divide; 365
              </div>
              <div className="text-[11px] text-[#6b7280] leading-[1.6]">
                If hired before the current year, Pro-Rata = 1.000 (full year). Mid-year joiners get a proportional fraction.
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2DDD4] rounded-[14px] overflow-hidden shadow-sm">
            <div className="px-[18px] py-[14px] border-b border-[#E2DDD4] bg-[#FAF8F4] flex items-center gap-[10px]">
              <div className="w-[32px] h-[32px] rounded-[8px] bg-[#D1FAE5] text-[#059669] shrink-0 flex items-center justify-center">
                <CheckCircle className="w-[16px] h-[16px]" />
              </div>
              <div className="text-[13px] font-[800] text-[#0D2B55]">What happens after saving?</div>
            </div>
            <div className="p-[16px]">
              <div className="flex flex-col gap-[10px]">
                <div className="flex gap-[10px] items-start text-[12px] text-[#0f1923]">
                  <span className="text-[#059669] font-[800] shrink-0">1.</span> Employee added to Staff Directory instantly.
                </div>
                <div className="flex gap-[10px] items-start text-[12px] text-[#0f1923]">
                  <span className="text-[#059669] font-[800] shrink-0">2.</span> Reporting manager can immediately initiate Q3 appraisal.
                </div>
                <div className="flex gap-[10px] items-start text-[12px] text-[#0f1923]">
                  <span className="text-[#059669] font-[800] shrink-0">3.</span> A temporary password (Password123!) is generated for the employee portal access.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successModalOpen && (
        <div className="fixed inset-0 bg-[#0D2B55]/65 z-[100] flex items-center justify-center p-[20px] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-[440px] shadow-2xl overflow-hidden flex flex-col slide-in-from-bottom-4">
            <div className="bg-[#0D2B55] px-[22px] py-[16px] flex justify-between items-center shrink-0 text-white">
              <div className="text-[15px] font-[800]">Done</div>
              <button onClick={() => setSuccessModalOpen(false)} className="bg-white/10 w-[30px] h-[30px] rounded-[8px] flex items-center justify-center hover:bg-white/20 transition-colors">
                <X className="w-[20px] h-[20px]" />
              </button>
            </div>
            <div className="p-[28px] text-center">
              <div className="flex justify-center mb-[16px]">
                <div className="w-[64px] h-[64px] bg-[#D1FAE5] rounded-full flex items-center justify-center text-[#059669] shadow-sm">
                  <CheckCircle className="w-[32px] h-[32px]" />
                </div>
              </div>
              <div className="text-[16px] font-[800] text-[#0D2B55] mb-[8px]">New Staff Member Added</div>
              <div className="text-[13px] text-[#6b7280] leading-[1.6] mb-[24px] px-[10px]">{successDetail}</div>
              <button
                onClick={() => { setSuccessModalOpen(false); router.push('/dashboard/hr/staff'); }}
                className="w-full bg-[#0D2B55] hover:bg-[#1a3d6e] text-white py-[12px] rounded-[10px] text-[13px] font-[800] transition-colors shadow-sm"
              >
                Return to Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}