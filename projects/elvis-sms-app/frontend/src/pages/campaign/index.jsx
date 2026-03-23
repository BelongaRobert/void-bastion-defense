import React, { useState, useEffect, useRef } from 'react';

import CampaignForm from './components/CampaignForm';

import CampaignDetail from './components/CampaignDetail';

import axios from 'axios';

import { BASE_URL } from '../chat';

import toast from 'react-hot-toast';

import { ArrowLeft, Search, Plus, Users } from 'lucide-react';

import Swal from 'sweetalert2';

const Campaign = ({ darkMode, onBackToChat }) => {

  const [campaigns, setCampaigns] = useState([]);

  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'detail', 'edit'

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [campaignListError, setCampaignListError] = useState('');

  const wsRef = useRef(null);
  const wsReconnectTimeoutRef = useRef(null);
  const selectedCampaignIdRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);


  // Colors for dark mode

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';

  const textColor = darkMode ? 'text-white' : 'text-gray-900';

  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-600';

  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';



  // Mobile detection

  useEffect(() => {

    const checkMobile = () => {

      setIsMobile(window.innerWidth < 768);

    };



    checkMobile();

    window.addEventListener('resize', checkMobile);

    

    return () => window.removeEventListener('resize', checkMobile);

  }, []);


  useEffect(() => {
    fetchCampaigns();
    setupWebSocket();


    return () => {

      if (wsRef.current) {

        wsRef.current.close();

      }

    };

  }, []);


  // Handle view mode changes with proper cleanup
  useEffect(() => {
    if (!wsConnected) return;

    // Unsubscribe from previous campaign
    const previousCampaignId = selectedCampaignIdRef.current;
    if (previousCampaignId && previousCampaignId !== 'global') {
      unsubscribeFromCampaign(previousCampaignId);
    }

    // Subscribe to new campaign
    if (viewMode === 'list') {
      subscribeToCampaign('global');
      selectedCampaignIdRef.current = 'global';
    } else if (selectedCampaign?.id) {
      subscribeToCampaign(selectedCampaign.id);
      selectedCampaignIdRef.current = selectedCampaign.id;
    }

  }, [viewMode, selectedCampaign?.id, wsConnected]);


  const subscribeToCampaign = (campaignId) => {

    if (!campaignId) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {

      wsRef.current.send(JSON.stringify({

        type: 'subscribe_campaign',

        campaignId: campaignId,

      }));

    }

  };


  const unsubscribeFromCampaign = (campaignId) => {

    if (!campaignId) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {

      wsRef.current.send(JSON.stringify({

        type: 'unsubscribe_campaign',

        campaignId: campaignId,

      }));

    }

  };


  const setupWebSocket = () => {
    if (wsReconnectTimeoutRef.current) {

      clearTimeout(wsReconnectTimeoutRef.current);

      wsReconnectTimeoutRef.current = null;

    }

    if (wsRef.current) {

      try {

        wsRef.current.close();

      } catch {

        // ignore

      }

    }

    const wsUrl = BASE_URL.startsWith('https://') 

      ? BASE_URL.replace('https://', 'wss://') + '/ws/campaign'

      : BASE_URL.replace('http://', 'ws://') + '/ws/campaign';


    if (wsRef.current) {

      try {

        wsRef.current.close();

      } catch (e) {}

    }

    const ws = new WebSocket(wsUrl);

    wsRef.current = ws;


    ws.onopen = () => {

      console.log('Campaign WebSocket connected');

      setWsConnected(true);

      // Only subscribe once on connection - subsequent subscriptions handled by useEffect
      if (viewMode === 'list') {

        subscribeToCampaign('global');

        selectedCampaignIdRef.current = 'global';

      } else if (selectedCampaignIdRef.current) {

        subscribeToCampaign(selectedCampaignIdRef.current);

      }

    };


    ws.onmessage = (event) => {

      try {

        const data = JSON.parse(event.data);

        handleWebSocketMessage(data);

      } catch (err) {

        console.error('Error parsing WebSocket message:', err);

      }

    };


    ws.onclose = () => {

      console.log('Campaign WebSocket disconnected');

      setWsConnected(false);
      // Try to reconnect after 5 seconds

      if (wsReconnectTimeoutRef.current) {

        clearTimeout(wsReconnectTimeoutRef.current);

      }

      wsReconnectTimeoutRef.current = setTimeout(setupWebSocket, 5000);

    };

  };


  const handleWebSocketMessage = (data) => {

    console.log('WebSocket message:', data);

    

    switch (data.type) {

      case 'subscribed':

        console.log(`Subscribed to campaign ${data.campaignId}`);

        setSelectedCampaign(prev => ({

            ...prev,

            stats: data.stats,

            status: data.status,

          }));

        break;

        

      case 'initial_stats':

        if (selectedCampaign && selectedCampaign.id === data.campaignId) {

          setSelectedCampaign(prev => ({

            ...prev,

            stats: data.stats

          }));

        }

        break;



      case 'CAMPAIGN_CREATED':

        setCampaigns(prev => [data.campaign, ...prev]);

        if (viewMode === 'list') {

          setSelectedCampaign(data.campaign);

          setViewMode('detail');

        }

        break;



      case 'CAMPAIGN_UPDATED':

        setCampaigns(prev => prev.map(campaign =>

          campaign.id === data.campaign.id ? { ...campaign, ...data.campaign } : campaign

        ));

        if (selectedCampaign && selectedCampaign.id === data.campaign.id) {

          setSelectedCampaign(prev => ({ ...prev, ...data.campaign }));

        }

        break;

        

      case 'CAMPAIGN_DELETED':

        // Remove campaign from list

        setCampaigns(prev => prev.filter(c => c.id !== data.campaign_id));

        

        // Clear selected campaign if it was deleted

        if (selectedCampaign && selectedCampaign.id === data.campaign_id) {

          setSelectedCampaign(null);

          setViewMode('list');

        }

        break;

        

      case 'campaign_starting':

      case 'CAMPAIGN_STARTED':

        updateCampaignStatus(data.campaign_id || data.campaignId, 'running');

        break;

        

      case 'campaign_pausing':

      case 'CAMPAIGN_PAUSED':

        updateCampaignStatus(data.campaign_id || data.campaignId, 'paused');

        break;

        

      case 'campaign_resuming':

      case 'CAMPAIGN_RESUMED':

        updateCampaignStatus(data.campaign_id || data.campaignId, 'running');

        break;

        

      case 'campaign_stopped':

      case 'CAMPAIGN_STOPPED':

        updateCampaignStatus(data.campaign_id || data.campaignId, 'stopped');

        break;

        

      case 'campaign_completed':

      case 'CAMPAIGN_COMPLETED':

        updateCampaignStatus(data.campaign_id || data.campaignId, 'completed');

        break;

        

      case 'CONTACTS_UPLOADED':

        updateCampaignStats(data.campaign_id || data.campaignId, data);

        break;

        

      case 'campaign_progress':

      case 'progress_update':

        updateCampaignProgress(data.campaign_id || data.campaignId, data);

        break;

        

      case 'MESSAGE_STATUS_UPDATE':

        // Individual message status update

        // Could update specific contact if needed

        break;

        

      default:

        console.log('Unhandled WebSocket message:', data);

    }

  };


  const updateCampaignProgress = (campaignId, data) => {

    setCampaigns(prev => prev.map(campaign => 

      campaign.id === campaignId 

        ? { 

            ...campaign,

            processed: data.processed,

            total: data.total,

            progress: data.progress || (data.processed / data.total * 100)

          }

        : campaign

    ));



    setSelectedCampaign((prev) => {

      if (!prev || prev.id !== campaignId) return prev;

      return {

        ...prev,

        processed: data.processed,

        total: data.total,

        progress: data.progress || (data.processed / data.total * 100)

      };

    });

  };


  const updateCampaignStats = (campaignId, data) => {

    setCampaigns(prev => prev.map(campaign => 

      campaign.id === campaignId 

        ? { 

            ...campaign,

            stats: data.stats || campaign.stats,

            total_contacts: data.count || campaign.total_contacts

          }

        : campaign

    ));



    setSelectedCampaign((prev) => {

      if (!prev || prev.id !== campaignId) return prev;

      return {

        ...prev,

        stats: data.stats || prev.stats,

        total_contacts: data.count || prev.total_contacts

      };

    });

  };


  const updateCampaignStatus = (campaignId, status) => {

    setCampaigns(prev => prev.map(campaign => 

      campaign.id === campaignId ? { ...campaign, status } : campaign

    ));



    setSelectedCampaign((prev) => {

      if (!prev || prev.id !== campaignId) return prev;

      return { ...prev, status };

    });

  };


  const fetchCampaigns = async () => {

    setLoading(true);

    setCampaignListError('');

    try {

      const response = await axios.get(`${BASE_URL}/api/campaigns/`);

      setCampaigns(response.data);

    } catch (error) {

      console.error('Error fetching campaigns:', error);

      toast.error('Failed to load campaigns: ' + (error.response?.data?.message || error.message));

      setCampaignListError(error.response?.data?.message || error.message || 'Failed to load campaigns');

    } finally {

      setLoading(false);

    }

  };


  const handleCreateCampaign = async (formData) => {
    setCreateLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/campaigns/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data) {
        toast.success('Campaign created successfully!');
        setViewMode('list');
        await fetchCampaigns();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign: ' + (error.response?.data?.message || error.message));
      throw error;
    } finally {
      setCreateLoading(false);
    }
  };


  const handleUpdateCampaign = async (campaignId, updates) => {
    setUpdateLoading(true);
    try {
      const response = await axios.put(`${BASE_URL}/api/campaigns/${campaignId}/`, updates);
      if (response.data) {
        toast.success('Campaign updated successfully!');
        await fetchCampaigns();
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign: ' + (error.response?.data?.message || error.message));
      throw error;
    } finally {
      setUpdateLoading(false);
    }
  };


  const handleDeleteCampaign = async (campaignId) => {
    const result = await Swal.fire({
      title: 'Delete Campaign?',
      text: 'This action cannot be undone and will permanently delete the campaign and all its data.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) {
      return;
    }

    setDeleteLoading(campaignId);
    try {
      await axios.delete(`${BASE_URL}/api/campaigns/${campaignId}/`);
      toast.success('Campaign deleted successfully!');
      setViewMode('list');
      setSelectedCampaign(null);
      await fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign: ' + (error.response?.data?.message || error.message));
    } finally {
      setDeleteLoading(null);
    }
  };


  const handleCampaignAction = async (campaignId, action) => {
    setActionLoading(action);
    try {
      const response = await axios.post(`${BASE_URL}/api/campaigns/${campaignId}/action/`, { action });
      
      if (response.data.status === 'success') {
        toast.success(`Campaign ${action}ed successfully!`);
        await fetchCampaigns();
      } else {
        throw new Error(response.data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Failed to perform action: ' + (error.response?.data?.error || error.message));
      throw error;
    } finally {
      setActionLoading(null);
    }

    if (action === "stop") {
      setViewMode('list');
    }
  };


  const handleUploadContacts = async (campaignId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploadLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/campaigns/${campaignId}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(response.data.message || 'Contacts uploaded successfully');
      return {
        success: true,
        message: response.data.message || 'Contacts uploaded successfully',
        count: response.data.count
      };
    } catch (error) {
      console.error('Error uploading contacts:', error);
      toast.error(error.response?.data?.error || 'Upload failed');
      return {
        success: false,
        message: error.response?.data?.error || 'Upload failed'
      };
    } finally {
      setUploadLoading(false);
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800';
      case 'running':
        return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800';
      case 'paused':
        return darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800';
      case 'stopped':
        return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      case 'scheduled':
        return darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800';
      default:
        return darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800';
    }
  };


  const getStatusIcon = (status) => {
    return null;
  };


  const filteredCampaigns = campaigns.filter((campaign) => {

    const q = (searchQuery || '').trim().toLowerCase();

    if (!q) return true;

    return (

      (campaign.name || '').toLowerCase().includes(q) ||

      (campaign.message || campaign.template || '').toLowerCase().includes(q) ||

      (campaign.status || '').toLowerCase().includes(q)

    );

  });


  const renderContent = () => {

    switch (viewMode) {

      case 'create':

        return (

          <div className="flex-1 overflow-y-auto">

            <CampaignForm

              onSubmit={handleCreateCampaign}

              onCancel={() => setViewMode('list')}

              darkMode={darkMode}

              isLoading={createLoading}

            />

          </div>

        );

      case 'detail':

      case 'edit':

        return selectedCampaign ? (

          <div className="flex-1 overflow-y-auto">

            <CampaignDetail

              campaign={selectedCampaign}

              mode={viewMode}

              onUpdate={handleUpdateCampaign}

              onDelete={handleDeleteCampaign}

              onAction={handleCampaignAction}

              onUploadContacts={handleUploadContacts}

              onCancel={() => {

                if (viewMode === 'edit') {

                  setViewMode('detail');

                } else {

                  if (selectedCampaign?.id) {

                    unsubscribeFromCampaign(selectedCampaign.id);

                  }

                  setViewMode('list');

                }

              }}

              onEdit={() => setViewMode(viewMode === 'edit' ? 'detail' : 'edit')}

              darkMode={darkMode}

              getStatusColor={getStatusColor}

              wsRef={wsRef}

              wsConnected={wsConnected}

              isMobile={isMobile}

              actionLoading={actionLoading}

              updateLoading={updateLoading}

              deleteLoading={deleteLoading}

              uploadLoading={uploadLoading}

            />

          </div>

        ) : (

          <div className={`flex-1 flex items-center justify-center `}>

            <div className="text-center">

              <div className={`w-24 h-24 mx-auto mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>

                <Users size={40} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />

              </div>

              <h3 className={`text-xl font-semibold ${textColor} mb-2`}>Select a Campaign</h3>

              <p className={textMuted}>Choose a campaign to view details or create a new one</p>

            </div>

          </div>

        );

      default:

        return (

          <div className={`flex-1 flex items-center justify-center ${bgColor}`}>

            <div className="text-center">

              <div className={`w-24 h-24 mx-auto mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full flex items-center justify-center`}>

                <Users size={40} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />

              </div>

              <h3 className={`text-xl font-semibold ${textColor} mb-2`}>Select a Campaign</h3>

              <p className={`mb-4 ${textMuted}`}>Choose a campaign to view details or create a new one</p>

              <button

                onClick={() => {

                  setSelectedCampaign(null);

                  setViewMode('create');

                }}

                className="px-6 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium inline-flex items-center gap-2"

              >

                <Plus size={18} />

                Create Campaign

              </button>

            </div>

          </div>

        );

    }

  };


  return (

    <div className={`flex h-screen ${bgColor} transition-colors duration-200 ${isMobile ? 'flex-col' : ''}`}>

      {/* Campaigns Sidebar */}

      <div className={`${isMobile ? (viewMode === 'list' ? 'flex' : 'hidden') : 'flex'} ${isMobile ? 'w-full h-full' : 'w-80'} ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${borderColor} flex-col`}>

        <div className={`p-4 border-b ${borderColor}`}>

          <div className="flex items-center gap-3 mb-4">

            <button

              onClick={() => onBackToChat?.()}

              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}

              title="Back to Chat"

            >

              <ArrowLeft size={20} className={darkMode ? 'text-gray-200' : 'text-gray-700'} />

            </button>

            <h1 className={`text-2xl font-semibold ${textColor}`}>Campaigns</h1>

          </div>



          <div className="relative">

            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

            <input

              type="text"

              placeholder="Search campaigns"

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}

            />

          </div>

        </div>



        <div className={`px-4 py-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border-b ${borderColor}`}>

          <p className={`text-xs ${textMuted} mb-1`}>Total Campaigns</p>

          <div className="flex items-center justify-between">

            <p className={`text-2xl font-semibold ${textColor}`}>{campaigns.length}</p>

            <div className={`flex items-center space-x-2 ${wsConnected ? 'text-green-500' : 'text-red-500'}`}>

              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>

              <span className="text-xs">{wsConnected ? 'Live' : 'Offline'}</span>

            </div>

          </div>

        </div>



        <div className="flex-1 overflow-y-auto">

          {loading ? (

            <div className="flex items-center justify-center h-32">

              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>

            </div>

          ) : campaignListError ? (

            <div className="p-4">

              <div className={`rounded-lg border p-4 ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>

                <p className={`text-sm font-medium ${darkMode ? 'text-red-200' : 'text-red-800'}`}>Failed to load campaigns</p>

                <p className={`text-xs mt-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{campaignListError}</p>

                <button

                  onClick={() => fetchCampaigns()}

                  className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-red-700 text-white hover:bg-red-600' : 'bg-red-600 text-white hover:bg-red-500'} transition-colors`}

                >

                  Retry

                </button>

              </div>

            </div>

          ) : filteredCampaigns.length > 0 ? (

            filteredCampaigns.map((campaign) => (

              <div

                key={campaign.id}

                onClick={() => {
                  setSelectedCampaign(campaign);

                  setViewMode('detail');

                  subscribeToCampaign(campaign.id);

                }}

                className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} cursor-pointer transition-colors ${

                  selectedCampaign?.id === campaign.id ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')

                }`}

              >

                <div className="flex items-start justify-between mb-2">

                  <p className={`font-semibold text-sm flex-1 ${textColor}`}>{campaign.name}</p>

                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${getStatusColor(campaign.status)}`}>

                    {getStatusIcon(campaign.status)}

                    {campaign.status}

                  </span>

                </div>

                <p className={`text-xs ${textMuted} mb-1`}>

                  {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : ''}

                </p>

                <div className={`flex items-center gap-3 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>

                  <span>Sent: {campaign.stats?.sent ?? 0}</span>

                  <span>Failed: {campaign.stats?.failed ?? 0}</span>

                </div>

              </div>

            ))

          ) : (

            <div className="flex flex-col items-center justify-center h-64">

              <Users size={40} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />

              <p className={`mt-3 ${textMuted}`}>No campaigns found</p>

            </div>

          )}

        </div>



        <div className={`p-4 border-t ${borderColor}`}>

          <button

            onClick={() => {

              setSelectedCampaign(null);

              setViewMode('create');

            }}

            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"

          >

            <Plus size={18} />

            Create Campaign

          </button>

        </div>

      </div>



      {/* Campaign Main Content */}

      <div className={`${isMobile ? (viewMode === 'list' ? 'hidden' : 'flex') : 'flex'} flex-1 flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} ${isMobile ? 'w-full h-full' : ''}`}>

        {renderContent()}

      </div>

    </div>

  );

};



export default Campaign;