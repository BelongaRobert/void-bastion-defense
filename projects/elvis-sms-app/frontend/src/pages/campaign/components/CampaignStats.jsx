import React from 'react';

const CampaignStats = ({ campaign, darkMode, realtimeStats }) => {
  // Use realtimeStats if available, otherwise fall back to campaign.stats
  const stats = realtimeStats || campaign.stats || {};
  const totalContacts = stats.total || campaign.total_contacts || 0;
  const sentCount = stats.sent || 0;
  const failedCount = stats.failed || 0;
  const pending = stats.pending || 0;
  
  // Calculate progress percentage correctly
  const progress = totalContacts > 0 
    ? Math.round(((sentCount + failedCount) / totalContacts) * 100) 
    : 0;


  const bgColor = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-600';

  const getProgressColor = () => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6 ${bgColor}`}>
      <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Campaign Progress</h3>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className={textMuted}>Progress</span>
          <span className={`font-medium ${textColor}`}>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {/* Stats Grid */}
       <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} text-center`}>
          <div className={`text-2xl font-bold ${textColor}`}>{totalContacts}</div>
          <div className={`text-sm ${textMuted}`}>Total Contacts</div>
        </div>
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} text-center`}>
          <div className={`text-2xl font-bold text-green-600`}>{sentCount}</div>
          <div className={`text-sm ${textMuted}`}>Sent</div>
        </div>
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} text-center`}>
          <div className={`text-2xl font-bold text-red-600`}>{failedCount}</div>
          <div className={`text-sm ${textMuted}`}>Failed</div>
        </div>
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} text-center`}>
          <div className={`text-2xl font-bold ${textColor}`}>{pending}</div>
          <div className={`text-sm ${textMuted}`}>Pending</div>
        </div>
      </div>

    

      {/* Status Info */}
      <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm ${textMuted}`}>Status</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            campaign.status === 'running' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
            campaign.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
            campaign.status === 'stopped' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {campaign.status}
          </span>
        </div>
        {campaign.started_at && (
          <div className={`text-xs ${textMuted}`}>
            Started: {new Date(campaign.started_at).toLocaleString()}
          </div>
        )}
        {campaign.completed_at && (
          <div className={`text-xs ${textMuted}`}>
            Completed: {new Date(campaign.completed_at).toLocaleString()}
          </div>
        )}
      </div>  
    </div>
  );
};

export default CampaignStats;