'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Check, X, AlertTriangle, Loader2, Info } from 'lucide-react';
import api from '../../../../lib/api';

export default function SystemConfiguration() {
  const [config, setConfig] = useState({ companyCodes: [], officeLocations: [], jobTitles: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companyCodes');
  
  // States for actions
  const [newItemValue, setNewItemValue] = useState('');
  const [editingItem, setEditingItem] = useState({ oldVal: '', newVal: '' });
  
  // Feedback states
  const [processing, setProcessing] = useState(false);

  // 🚨 NEW: Universal Custom Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'alert', // 'alert', 'error', 'warning', 'confirm'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const closeDialog = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  const showDialog = (type, title, message, onConfirm = closeDialog, onCancel = closeDialog) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      onCancel
    });
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/config/dropdowns');
      setConfig(res.data?.data || { companyCodes: [], officeLocations: [], jobTitles: [] });
    } catch (err) {
      showDialog('error', 'Data Retrieval Failed', "Failed to load system configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newItemValue.trim()) return;
    setProcessing(true);
    try {
      const res = await api.put(`/config/dropdowns/${activeTab}`, {
        action: 'ADD',
        value: newItemValue
      });
      setConfig(res.data.data);
      setNewItemValue('');
      showDialog('alert', 'Success', "Item added successfully.");
    } catch (err) {
      showDialog('error', 'Action Denied', err.response?.data?.message || "Failed to add item.");
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = async () => {
    if (!editingItem.newVal.trim() || editingItem.oldVal === editingItem.newVal) {
      setEditingItem({ oldVal: '', newVal: '' });
      return;
    }
    setProcessing(true);
    try {
      const res = await api.put(`/config/dropdowns/${activeTab}`, {
        action: 'EDIT',
        oldValue: editingItem.oldVal,
        newValue: editingItem.newVal
      });
      setConfig(res.data.data);
      setEditingItem({ oldVal: '', newVal: '' });
      showDialog('alert', 'Update Successful', `Updated successfully. All affected employees have been cascaded to "${editingItem.newVal}".`);
    } catch (err) {
      showDialog('error', 'Action Denied', err.response?.data?.message || "Failed to update item.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (value) => {
    // 🚨 REPLACED: window.confirm with Custom Modal
    showDialog(
      'confirm', 
      'Confirm Deletion', 
      `Are you sure you want to completely delete "${value}"? This action may affect employee records.`, 
      async () => {
        closeDialog();
        setProcessing(true);
        try {
          const res = await api.put(`/config/dropdowns/${activeTab}`, {
            action: 'DELETE',
            value: value
          });
          setConfig(res.data.data);
          showDialog('alert', 'Deletion Successful', `"${value}" deleted successfully.`);
        } catch (err) {
          // Captures and displays the 409 Dependency Error
          showDialog('warning', 'Deletion Blocked', err.response?.data?.message || "Failed to delete item.");
        } finally {
          setProcessing(false);
        }
      }
    );
  };

  // UI Helpers
  const tabs = [
    { id: 'companyCodes', label: 'Company Codes' },
    { id: 'officeLocations', label: 'Office Locations' },
    { id: 'jobTitles', label: 'Job Titles' }
  ];

  const activeData = config[activeTab] || [];

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#0D2B55] w-10 h-10" /></div>;

  return (
    <div className="max-w-[1000px] mx-auto pb-20 font-sans p-6 relative">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#0D2B55] text-white flex items-center justify-center shadow-lg">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">System Configurations</h1>
          <p className="text-sm text-gray-500">Manage global dropdown lists. Changes will cascade to employee profiles.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setEditingItem({oldVal:'', newVal:''}); }}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#0D2B55] text-[#0D2B55] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6">
          
          {/* Add New Item */}
          <div className="flex gap-3 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <input 
              type="text" 
              placeholder={`Add new ${tabs.find(t => t.id === activeTab).label.slice(0, -1)}...`}
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              disabled={processing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#0D2B55] disabled:opacity-50"
            />
            <button 
              onClick={handleAdd}
              disabled={!newItemValue.trim() || processing}
              className="px-5 py-2 bg-[#0D2B55] text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-[#1a3d6e] transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Data List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              Current Values ({activeData.length})
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {activeData.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No items found. Add one above.</div>
              ) : (
                activeData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                    
                    {/* View/Edit Mode Toggle */}
                    {editingItem.oldVal === item ? (
                      <input 
                        autoFocus
                        value={editingItem.newVal}
                        onChange={(e) => setEditingItem({ ...editingItem, newVal: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                        className="flex-1 mr-4 px-3 py-1.5 border-2 border-blue-400 rounded-md text-sm font-semibold outline-none"
                      />
                    ) : (
                      <div className="text-sm font-semibold text-gray-800">{item}</div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {editingItem.oldVal === item ? (
                        <>
                          <button onClick={handleEdit} disabled={processing} className="p-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200"><Check className="w-4 h-4"/></button>
                          <button onClick={() => setEditingItem({oldVal:'', newVal:''})} disabled={processing} className="p-1.5 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"><X className="w-4 h-4"/></button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setEditingItem({ oldVal: item, newVal: item })} 
                            disabled={processing}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item)} 
                            disabled={processing}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>

      {/* 🚨 NEW: Universal Custom Modal for System Alerts */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-[24px]">
              <div className="flex items-center gap-[10px] mb-[12px]">
                {modalConfig.type === 'error' || modalConfig.type === 'warning' || modalConfig.type === 'confirm' ? (
                  <AlertTriangle className={`w-[20px] h-[20px] ${modalConfig.type === 'warning' ? 'text-amber-500' : 'text-red-600'}`} />
                ) : (
                  <Info className="w-[20px] h-[20px] text-blue-600" />
                )}
                <h3 className="text-[18px] font-[800] text-slate-800">{modalConfig.title}</h3>
              </div>
              
              <p className="text-[14px] text-slate-600 mb-[24px] whitespace-pre-wrap leading-relaxed">
                {modalConfig.message}
              </p>

              <div className="flex justify-end gap-[12px]">
                {modalConfig.type === 'confirm' && (
                  <button 
                    type="button"
                    onClick={modalConfig.onCancel}
                    className="px-[16px] py-[10px] text-slate-600 font-[700] text-[13px] hover:bg-slate-100 rounded-[8px] transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="button"
                  onClick={modalConfig.onConfirm}
                  className={`px-[20px] py-[10px] text-white font-[800] text-[13px] rounded-[8px] shadow-sm transition-colors ${
                    modalConfig.type === 'error' || modalConfig.type === 'confirm'
                      ? 'bg-red-600 hover:bg-red-700' 
                      : modalConfig.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {modalConfig.type === 'confirm' ? 'Confirm' : 'Acknowledge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}