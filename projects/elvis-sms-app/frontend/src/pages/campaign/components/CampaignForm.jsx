import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

const CampaignForm = ({ onSubmit, onCancel, darkMode, initialData = {} }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    template: initialData.template || '',
  });
  const [csvFile, setCsvFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);       // original headers from file
  const [csvData, setCsvData] = useState([]);             // original row data
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  // Field mapping: maps standardized key → original CSV header name
  const [fieldMapping, setFieldMapping] = useState({
    phone: null,
    first_name: null,
    last_name: null
  });
  const [showMapping, setShowMapping] = useState(false);
  const [draggedField, setDraggedField] = useState(null);

  const fileInputRef = useRef(null);

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const inputBg = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300';
  const placeholderColor = darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400';

  // ─── Derived: what the CSV looks like AFTER mapping ───────────────────────
  // Returns array of { displayHeader, originalHeader, dataIndex }
  const getMappedColumns = (mapping = fieldMapping) => {
    const cols = [];

    // 1. Standardized mapped columns first
    if (mapping.phone) {
      cols.push({
        displayHeader: 'phone',
        originalHeader: mapping.phone,
        dataIndex: csvHeaders.indexOf(mapping.phone)
      });
    }
    if (mapping.first_name) {
      cols.push({
        displayHeader: 'first_name',
        originalHeader: mapping.first_name,
        dataIndex: csvHeaders.indexOf(mapping.first_name)
      });
    }
    if (mapping.last_name) {
      cols.push({
        displayHeader: 'last_name',
        originalHeader: mapping.last_name,
        dataIndex: csvHeaders.indexOf(mapping.last_name)
      });
    }

    // 2. Remaining unmapped columns keep their original names
    csvHeaders.forEach((h, i) => {
      const isMapped = h === mapping.phone || h === mapping.first_name || h === mapping.last_name;
      if (!isMapped) {
        cols.push({ displayHeader: h, originalHeader: h, dataIndex: i });
      }
    });

    return cols;
  };

  // Headers shown in the preview table and as template variables
  const mappedColumns = getMappedColumns();
  const previewHeaders = mappedColumns.map(c => c.displayHeader);

  // Preview rows reordered to match mapped columns
  const previewRows = csvData.slice(0, 3).map(row =>
    mappedColumns.map(c => row[c.dataIndex] || '')
  );

  // ─── File upload ───────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setErrors(prev => ({ ...prev, csv: 'Please upload a CSV file' }));
      return;
    }

    setCsvFile(file);
    setErrors(prev => ({ ...prev, csv: '' }));

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(r => r.trim() !== '');
      const headers = rows[0]?.split(',').map(h => h.trim().replace(/^"|"$/g, '')) || [];
      const dataRows = rows.slice(1).map(row => {
        const cells = [];
        let inQuotes = false;
        let cur = '';
        for (const ch of row) {
          if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === ',' && !inQuotes) { cells.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
        cells.push(cur.trim());
        return cells.map(c => c.replace(/^"|"$/g, ''));
      });

      setCsvHeaders(headers);
      setCsvData(dataRows);

      // Auto-detect mapping
      const mapping = { phone: null, first_name: null, last_name: null };
      headers.forEach(header => {
        const key = header.toLowerCase().replace(/[_\s]/g, '');
        if (['phone', 'phonenumber', 'mobile', 'contact'].includes(key)) mapping.phone = header;
        else if (['firstname', 'fname', 'first_name'].includes(key)) mapping.first_name = header;
        else if (['lastname', 'lname', 'last_name'].includes(key)) mapping.last_name = header;
      });

      setFieldMapping(mapping);
      setShowMapping(!mapping.phone);

      if (!formData.template.trim()) {
        setFormData(prev => ({
          ...prev,
          template: mapping.first_name
            ? `Hello {{first_name}}, this is a test message.`
            : `Hello, this is a test message.`
        }));
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFileChange({ target: { files: [file] } });
    } else {
      toast.error('Only CSV files are allowed');
    }
  };

  // ─── Drag-to-map handlers ──────────────────────────────────────────────────
  const handleFieldDragStart = (e, csvField) => {
    setDraggedField(csvField);
    e.dataTransfer.setData('text/plain', csvField);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMappingDrop = (e, targetKey) => {
    e.preventDefault();
    const dropped = e.dataTransfer.getData('text/plain');
    if (dropped) {
      setFieldMapping(prev => ({ ...prev, [targetKey]: dropped }));
      setDraggedField(null);
    }
  };

  const clearMapping = (key) => setFieldMapping(prev => ({ ...prev, [key]: null }));

  const getAvailableFields = () => {
    const used = Object.values(fieldMapping).filter(Boolean);
    return csvHeaders.filter(h => !used.includes(h));
  };

  // ─── Build the mapped CSV file ─────────────────────────────────────────────
  const buildMappedCSVFile = () => {
    const cols = getMappedColumns();
    const headers = cols.map(c => c.displayHeader).join(',');
    const rows = csvData.map(row =>
      cols.map(c => {
        const val = String(row[c.dataIndex] || '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    );
    const content = [headers, ...rows].join('\n');

    console.log('=== MAPPED CSV FIRST LINE ===', headers);
    console.log('=== MAPPED CSV SECOND LINE ===', rows[0]);

    const blob = new Blob([content], { type: 'text/csv' });
    return new File([blob], csvFile.name, { type: 'text/csv' });
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Campaign name is required';
    if (!formData.template.trim()) newErrors.template = 'Message template is required';
    if (!csvFile) newErrors.csv = 'CSV file is required';
    if (!fieldMapping.phone) newErrors.mapping = 'Please map the Phone field';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Object.values(newErrors).forEach(msg => toast.error(msg));
      return;
    }

    setIsUploading(true);
    const mappedFile = buildMappedCSVFile();

    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('template', formData.template);
    payload.append('file', mappedFile);        // ← mapped file, not original

    try {
      await onSubmit(payload);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Template helpers ──────────────────────────────────────────────────────
  const insertVariable = (variable) => {
    const textarea = document.querySelector('textarea[name="template"]');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = formData.template.substring(0, start) + variable + formData.template.substring(end);
    setFormData(prev => ({ ...prev, template: next }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const renderMessagePreview = () => {
    if (!formData.template || !previewRows.length) return formData.template;
    let rendered = formData.template;
    previewHeaders.forEach((header, i) => {
      const re = new RegExp(`\\{\\{${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      rendered = rendered.replace(re, previewRows[0][i] || '');
    });
    return rendered;
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className={`h-full ${bgColor} p-6 overflow-auto`}>
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Campaign Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textColor}`}>Campaign Name *</label>
            <input
              type="text" name="name" value={formData.name} onChange={handleChange}
              placeholder="Enter campaign name"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg} ${placeholderColor} ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* CSV Upload */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textColor}`}>Upload Contacts CSV *</label>

            <div
              onClick={() => fileInputRef.current.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4
                ${darkMode ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-800' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
                ${errors.csv ? 'border-red-500' : ''}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
              {csvFile ? (
                <div>
                  <svg className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-green-500' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className={textColor}><span className="font-medium">{csvFile.name}</span></p>
                  <p className={`text-sm mt-2 ${textMuted}`}>{csvData.length} rows · {csvHeaders.length} columns</p>
                </div>
              ) : (
                <div>
                  <svg className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className={textColor}><span className="font-medium">Click to upload CSV</span> or drag and drop</p>
                  <p className={`text-sm mt-2 ${textMuted}`}>CSV files only</p>
                </div>
              )}
            </div>
            {errors.csv && <p className="mt-1 text-sm text-red-500">{errors.csv}</p>}

            {/* ── Field Mapping Panel ── */}
            {csvFile && csvHeaders.length > 0 && showMapping && (
              <div className={`mt-4 p-6 rounded-lg border-2 ${darkMode ? 'bg-gray-800 border-yellow-600' : 'bg-yellow-50 border-yellow-400'}`}>
                <div className="flex items-start mb-4">
                  <svg className={`w-6 h-6 mr-2 ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className={`text-sm font-medium mb-1 ${textColor}`}>Field Mapping Required</h4>
                    <p className={`text-sm ${textMuted}`}>Drag CSV columns onto the target fields below</p>
                  </div>
                </div>

                {errors.mapping && <p className="mb-4 text-sm text-red-500">{errors.mapping}</p>}

                {/* Drop zones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { key: 'phone', label: 'Phone Number', required: true },
                    { key: 'first_name', label: 'First Name', required: false },
                    { key: 'last_name', label: 'Last Name', required: false },
                  ].map(({ key, label, required }) => (
                    <div key={key}>
                      <label className={`block text-xs font-medium mb-2 ${textColor}`}>
                        {label} {required ? <span className="text-red-400">*</span> : <span className={textMuted}>(Optional)</span>}
                      </label>
                      <div
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={e => handleMappingDrop(e, key)}
                        className={`min-h-[60px] p-3 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors
                          ${fieldMapping[key]
                            ? darkMode ? 'bg-green-900/30 border-green-600' : 'bg-green-50 border-green-500'
                            : darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}
                      >
                        {fieldMapping[key] ? (
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                              {fieldMapping[key]}
                            </span>
                            <button type="button" onClick={() => clearMapping(key)}
                              className={`ml-2 ${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className={`text-sm ${textMuted}`}>Drop here</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Available columns to drag */}
                <div>
                  <p className={`text-xs font-medium mb-2 ${textColor}`}>Available CSV Columns — drag to map:</p>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableFields().map((header, i) => (
                      <div
                        key={i} draggable
                        onDragStart={e => handleFieldDragStart(e, header)}
                        className={`px-3 py-2 rounded-lg text-sm cursor-move select-none transition-all
                          ${darkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-700 hover:bg-blue-800/50' : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'}`}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                          <span>{header}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Mapping summary (collapsed) ── */}
            {csvFile && csvHeaders.length > 0 && !showMapping && fieldMapping.phone && (
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-medium ${textColor}`}>Field Mapping</h4>
                  <button type="button" onClick={() => setShowMapping(true)}
                    className={`text-xs px-3 py-1 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                    Edit
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div><span className={textMuted}>phone ←</span> <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{fieldMapping.phone}</span></div>
                  {fieldMapping.first_name && <div><span className={textMuted}>first_name ←</span> <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{fieldMapping.first_name}</span></div>}
                  {fieldMapping.last_name && <div><span className={textMuted}>last_name ←</span> <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{fieldMapping.last_name}</span></div>}
                </div>
              </div>
            )}

            {/* ── CSV Preview (shows MAPPED headers) ── */}
            {csvFile && csvHeaders.length > 0 && previewHeaders.length > 0 && (
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-medium ${textColor}`}>Preview — as sent to backend</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-700'}`}>
                    Mapped headers
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        {previewHeaders.map((header, i) => (
                          <th key={i} className={`px-3 py-2 text-left font-semibold border-b ${borderColor}
                            ${['phone','first_name','last_name'].includes(header)
                              ? darkMode ? 'text-green-400' : 'text-green-700'
                              : textMuted}`}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className={`px-3 py-2 ${textColor} border-b ${borderColor}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Message Template */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={`block text-sm font-medium ${textColor}`}>Message Template *</label>
              <span className={`text-sm ${textMuted}`}>{formData.template.length} characters</span>
            </div>

            {csvHeaders.length > 0 && (
              <div className="mb-4">
                <p className={`text-sm font-medium mb-2 ${textColor}`}>Available Variables:</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {previewHeaders.map((header, i) => (
                    <button key={i} type="button" onClick={() => insertVariable(`{{${header}}}`)}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors
                        ${['phone','first_name','last_name'].includes(header)
                          ? darkMode ? 'bg-green-900/40 text-green-300 border border-green-700 hover:bg-green-800/50' : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                          : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                      <span>{header}</span>
                      <span className="text-xs opacity-60">{`{{${header}}}`}</span>
                    </button>
                  ))}
                </div>
                <p className={`text-xs ${textMuted}`}>Green = standardized mapped fields · Grey = original columns</p>
              </div>
            )}

            <textarea
              name="template" value={formData.template} onChange={handleChange} rows={8}
              placeholder="Enter your message. Use {{first_name}}, {{phone}}, etc."
              className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg} ${placeholderColor} ${errors.template ? 'border-red-500' : ''}`}
            />
            {errors.template && <p className="mt-1 text-sm text-red-500">{errors.template}</p>}

            {formData.template && previewRows.length > 0 && (
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h4 className={`text-sm font-medium mb-2 ${textColor}`}>Preview (row 1):</h4>
                <p className={`whitespace-pre-wrap ${textColor}`}>{renderMessagePreview()}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={`flex justify-end space-x-4 pt-6 border-t ${borderColor}`}>
            <button type="button" onClick={onCancel} disabled={isUploading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors
                ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              Cancel
            </button>
            <button type="submit" disabled={isUploading}
              className={`px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isUploading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CampaignForm;