import React from 'react';

const CampaignList = ({ campaigns, loading, onSelect, onCreate, darkMode, getStatusColor }) => {
  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100';

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${bgColor}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${textMuted}`}>Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full ${bgColor} p-6`}>
      <div className="max-w-6xl mx-auto">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <svg className={`w-24 h-24 mb-6 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h3 className={`text-xl font-semibold mb-2 ${textColor}`}>No campaigns yet</h3>
            <p className={`mb-6 ${textMuted}`}>Create your first campaign to start sending bulk SMS</p>
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create First Campaign</span>
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className={`text-lg font-semibold ${textColor}`}>Your Campaigns</h2>
                <p className={`text-sm ${textMuted}`}>{campaigns.length} total campaigns</p>
              </div>
              <button
                onClick={onCreate}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Campaign</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  onClick={() => onSelect(campaign)}
                  className={`border rounded-lg p-6 cursor-pointer transition-all ${borderColor} ${hoverBg} hover:shadow-lg`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className={`font-bold text-lg truncate ${textColor}`}>{campaign.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>
                  
                  <p className={`text-sm mb-4 line-clamp-2 ${textMuted}`}>
                    {campaign.message || 'No message set'}
                  </p>
                  
                  <div className={`text-xs ${textMuted} mb-4`}>
                    Created: {new Date(campaign.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                      <div className="text-center">
                        <div className={`font-bold ${textColor}`}>{campaign.total_contacts}</div>
                        <div className={`text-xs ${textMuted}`}>Contacts</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold ${textColor}`}>{campaign.sent_count}</div>
                        <div className={`text-xs ${textMuted}`}>Sent</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold ${textColor}`}>{campaign.failed_count}</div>
                        <div className={`text-xs ${textMuted}`}>Failed</div>
                      </div>
                    </div>
                    
                    <svg className={`w-5 h-5 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CampaignList;