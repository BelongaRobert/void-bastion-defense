import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

const ContactUpload = ({ onUpload, result, darkMode, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const bgColor = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const dragBorderColor = darkMode ? 'border-blue-400' : 'border-blue-500';

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await processFile(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    if (disabled) return;
    
    const files = e.target.files;
    if (files && files[0]) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file.name.endsWith('.csv')) {
      toast('Please upload a CSV file');
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`rounded-lg border ${borderColor} p-6 ${bgColor}`}>
      <h2 className={`text-lg font-semibold mb-4 ${textColor}`}>Upload Contacts</h2>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? dragBorderColor : borderColor
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv"
          className="hidden"
          disabled={disabled}
        />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className={textColor}>Uploading contacts...</p>
          </div>
        ) : (
          <>
            <svg
              className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            <p className={textColor}>
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <p className={`text-sm mt-2 ${textMuted}`}>CSV files only</p>
            {disabled && (
              <p className={`text-sm mt-2 text-yellow-600`}>
                Upload disabled - campaign is not in draft status
              </p>
            )}
          </>
        )}
      </div>

      {/* Result Message */}
      {result && (
        <div className={`mt-4 p-4 rounded-lg ${
          result.success
            ? darkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'
            : darkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            <svg
              className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${
                result.success ? 'text-green-500' : 'text-red-500'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d={
                result.success
                  ? 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                  : 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
              } clipRule="evenodd" />
            </svg>
            <div>
              <p className={`font-medium ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {result.message}
              </p>
              {result.count && (
                <p className={`text-sm mt-1 ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {result.count} contacts uploaded
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Template */}
      <div className={`mt-6 text-sm ${textMuted}`}>
        <p className="font-medium mb-3">CSV Format:</p>
        <div className={`font-mono text-xs p-4 rounded ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} overflow-x-auto`}>
          <pre className="whitespace-pre">
            name,phone,email,company,city,country<br />
            John Doe,+1234567890,john@example.com,Acme Inc,New York,USA<br />
            Jane Smith,+0987654321,jane@example.com,XYZ Corp,London,UK<br />
            Bob Johnson,+1122334455,bob@example.com,ABC Ltd,Tokyo,Japan
          </pre>
        </div>
        <p className="mt-3">
          Use columns like <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">name</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">phone</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">email</code> in your CSV.
          You can use <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">{`{{name}}`}</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">{`{{phone}}`}</code> in your message.
        </p>
      </div>
    </div>
  );
};

export default ContactUpload;