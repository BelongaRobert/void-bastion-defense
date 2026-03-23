import React, { useState, useRef, useEffect } from 'react';

import axios from 'axios';

import { ArrowLeft } from 'lucide-react';

import ContactUpload from './ContactUpload';

import CampaignStats from './CampaignStats';

import Swal from 'sweetalert2';



const CampaignDetail = ({

  campaign,

  mode,

  onUpdate,

  onDelete,

  onAction,

  onUploadContacts,

  onCancel,

  onEdit,

  darkMode,

  getStatusColor,

  wsRef,

  wsConnected,

  isMobile

}) => {

  const [realtimeStats, setRealtimeStats] = useState(null);

  const [editedCampaign, setEditedCampaign] = useState(campaign);

  const [uploadResult, setUploadResult] = useState(null);

  const [wsMessages, setWsMessages] = useState([]);

  const [contactsPage, setContactsPage] = useState(1);

  const [contactsPageSize] = useState(25);

  const [contactsTotalPages, setContactsTotalPages] = useState(1);

  const [contactsTotal, setContactsTotal] = useState(0);

  const [contactsLoading, setContactsLoading] = useState(false);

  const [contactsRows, setContactsRows] = useState([]);

  const messageInputRef = useRef(null);



  // Available variables from CSV columns

  const availableVariables = (campaign.variables || []).map((variable) => ({

    label: variable.replace(/_/g, ' '),

    value: variable,

    description: `From CSV column: ${variable}`

  }));



  useEffect(() => {

    if (mode === 'edit') {

      setEditedCampaign(campaign);

    }

  }, [mode, campaign]);



  // Listen for WebSocket messages with proper cleanup

  useEffect(() => {

    const handleWsMessage = (event) => {

      try {

        const data = JSON.parse(event.data);

        const isForThisCampaign = (data.campaign_id === campaign.id || data.campaignId === campaign.id);

        if (isForThisCampaign && campaign.status != "completed" && data.stats) {

          setRealtimeStats(data.stats);

        }

        if (data.type === 'campaign_progress' || data.type === 'progress_update') {

          if (isForThisCampaign) {

            setWsMessages(prev => [...prev.slice(-4), data]);

          }

        }

      } catch (err) {

        console.error('Error parsing WebSocket message:', err);

      }

    };



    if (wsRef.current) {

      wsRef.current.addEventListener('message', handleWsMessage);

    }



    return () => {

      if (wsRef.current) {

        wsRef.current.removeEventListener('message', handleWsMessage);

      }

    };

  }, [campaign.id, campaign.status, wsRef]);



  useEffect(() => {

    const fetchContacts = async () => {

      if (!campaign?.id) return;



      setContactsLoading(true);

      try {

        const baseUrl = import.meta.env.VITE_BASE_URL;

        const response = await axios.get(`${baseUrl}/api/campaigns/${campaign.id}/contacts/`, {

          params: {

            page: contactsPage,

            pageSize: contactsPageSize,

          },

        });



        if (response.data?.success) {

          setContactsRows(response.data.results || []);

          setContactsTotalPages(response.data.totalPages || 1);

          setContactsTotal(response.data.total || 0);

        } else {

          setContactsRows([]);

          setContactsTotalPages(1);

          setContactsTotal(0);

        }

      } catch (err) {

        console.error('Error fetching campaign contacts:', err);

        setContactsRows([]);

        setContactsTotalPages(1);

        setContactsTotal(0);

      } finally {

        setContactsLoading(false);

      }

    };



    fetchContacts();

  }, [campaign?.id, contactsPage, contactsPageSize]);



  const handleVariableClick = (variable) => {

    const textarea = messageInputRef.current;

    if (!textarea) return;



    const start = textarea.selectionStart;

    const end = textarea.selectionEnd;

    const text = editedCampaign.template || '';

    const variablePlaceholder = `{{${variable}}}`;

    const newText = text.substring(0, start) + variablePlaceholder + text.substring(end);

    setEditedCampaign({ ...editedCampaign, template: newText });



    setTimeout(() => {

      textarea.focus();

      textarea.setSelectionRange(start + variablePlaceholder.length, start + variablePlaceholder.length);

    }, 0);

  };



  const handleSave = () => {

    onUpdate(campaign.id, editedCampaign);

    onEdit();

  };



  const handleAction = async (action) => {

    const actionText = action.charAt(0).toUpperCase() + action.slice(1);

    const result = await Swal.fire({

      title: `${actionText} Campaign?`,

      text: `Are you sure you want to ${action} this campaign?`,

      icon: 'question',

      showCancelButton: true,

      confirmButtonColor: action === 'stop' ? '#ef4444' : '#3b82f6',

      cancelButtonColor: '#6b7280',

      confirmButtonText: actionText,

      cancelButtonText: 'Cancel'

    });

    

    if (result.isConfirmed) {

      onAction(campaign.id, action);

    }

  };

  const handleUpload = async (file) => {

    const result = await onUploadContacts(campaign.id, file);

    setUploadResult(result);

    setTimeout(() => setUploadResult(null), 5000);

  };



  const subscribeToCampaign = () => {

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {

      wsRef.current.send(JSON.stringify({

        type: 'subscribe_campaign',

        campaignId: campaign.id

      }));

    }

  };



  useEffect(() => {

    // Only subscribe if campaign exists and is not completed

    if (campaign?.id && campaign.status !== 'completed') {

      subscribeToCampaign();

    }

    // Cleanup: unsubscribe when component unmounts or campaign changes

    return () => {

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && campaign?.id) {

        wsRef.current.send(JSON.stringify({

          type: 'unsubscribe_campaign',

          campaignId: campaign.id

        }));

      }

    };

  }, [campaign.id, campaign.status, wsRef]);



  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';

  const textColor = darkMode ? 'text-white' : 'text-gray-900';

  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-600';

  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';

  const inputBg = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300';

  const placeholderColor = darkMode ? 'placeholder-gray-500' : 'placeholder-gray-400';



  const canEdit = campaign.status === 'draft';

  const isEditing = mode === 'edit';



  const renderMessagePreview = () => {

    if (!campaign.template || !campaign.variables?.length) return campaign.template || '';



    let rendered = campaign.template;

    // Create sample data for preview

    const sampleData = {

      name: 'John Doe',

      email: 'john@example.com',

      company: 'Acme Inc',

      city: 'New York',

      country: 'USA'

    };



    campaign.variables.forEach(variable => {

      const placeholder = `{{${variable}}}`;

      if (rendered.includes(placeholder)) {

        rendered = rendered.replace(

          new RegExp(placeholder, 'g'),

          sampleData[variable] || `[${variable}]`

        );

      }

    });



    return rendered;

  };



  // Calculate progress from stats

  const stats = realtimeStats || campaign.stats;

  const totalContacts = stats.total || campaign.total_contacts || 0;

  const processed = (stats.sent || 0) + (stats.failed || 0);

  const progress = totalContacts > 0 ? Math.round((processed / totalContacts) * 100) : 0;

  const pending = Math.max(0, totalContacts - processed);



  return (

    <div className={`h-full ${bgColor} p-6 overflow-auto`}>

      <div className="max-w-6xl mx-auto">

        {/* Header */}

        <div className="mb-6">

          {/* Top Row - Back button + Actions */}

          <div className="flex items-center justify-between mb-4">

            {isMobile && (

              <button

                onClick={onCancel}

                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}

                title="Back to campaigns"

              >

                <ArrowLeft size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />

              </button>

            )}

            

            <div className={`flex items-center gap-2 ${isMobile ? '' : 'ml-auto'}`}>

              {isEditing ? (

                <>

                  <button

                    onClick={handleSave}

                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"

                  >

                    Save

                  </button>

                  <button

                    onClick={onCancel}

                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}

                  >

                    Cancel

                  </button>

                </>

              ) : (

                <>

                  {canEdit && (

                    <button

                      onClick={onEdit}

                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"

                    >

                      Edit

                    </button>

                  )}

                  <button

                    onClick={() => onDelete(campaign.id)}

                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"

                  >

                    Delete

                  </button>

                </>

              )}

            </div>

          </div>

          

          {/* Campaign Title */}

          <div className="mb-3">

            {isEditing ? (

              <input

                type="text"

                value={editedCampaign.name}

                onChange={(e) => setEditedCampaign({ ...editedCampaign, name: e.target.value })}

                className={`text-2xl font-bold px-3 py-2 border rounded-lg w-full ${inputBg} ${textColor}`}

              />

            ) : (

              <h1 className={`text-2xl font-bold ${textColor}`}>{campaign.name}</h1>

            )}

          </div>

          

          {/* Status & Meta Info */}

          <div className="flex flex-wrap items-center gap-3">

            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>

              {campaign.status}

            </span>

            

            <div className={`flex items-center gap-2 ${wsConnected ? 'text-green-500' : 'text-red-500'}`}>

              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>

              <span className="text-xs font-medium">{wsConnected ? 'Live' : 'Offline'}</span>

            </div>

            

            <span className={`text-sm ${textMuted}`}>

              Created {new Date(campaign.created_at).toLocaleDateString()}

            </span>

            

            {campaign.started_at && (

              <span className={`text-sm ${textMuted}`}>

                Started {new Date(campaign.started_at).toLocaleDateString()}

              </span>

            )}

          </div>

        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Right Column - Stats & Actions (First on mobile) */}

          <div className="space-y-8 lg:col-start-3 lg:row-start-1">

            {/* Action Buttons */}

            <div className={`rounded-lg border ${borderColor} p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>

              <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Campaign Actions</h3>

              <div className="space-y-3">

                {/* Start/Run Button */}

                {campaign.status != "completed" && campaign.status != 'running' && <button

                  onClick={() => handleAction('start')}

                  className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"

                >

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                  </svg>

                  <span>{campaign.status === 'stopped' ? 'Resume Campaign' : 'Start Campaign'}</span>

                </button>}

                {/* Pause Button */}

                {campaign.status == 'running' && <button

                  onClick={() => handleAction('stop')}

                  className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"

                >

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />

                  </svg>

                  <span>Stop Campaign</span>

                </button>}

                {/* Status Info */}

                <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>

                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>

                    Status: <span className="capitalize">{campaign.status}</span>

                  </p>

                  {campaign.scheduled_time && (

                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>

                      Scheduled: {new Date(campaign.scheduled_time).toLocaleString()}

                    </p>

                  )}

                  {campaign.completed_at && (

                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>

                      Completed: {new Date(campaign.completed_at).toLocaleString()}

                    </p>

                  )}

                  {/* WebSocket Messages */}

                  {wsMessages.length > 0 && (

                    <div className={`mt-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>

                      <h4 className={`text-sm font-medium mb-2 ${textColor}`}>Recent Updates:</h4>

                      <div className="space-y-2">

                        {wsMessages.map((msg, index) => (

                          <div key={index} className={`text-sm ${textMuted}`}>

                            {msg.type === 'campaign_progress' && (

                              <span>Progress: {msg.processed}/{msg.total} ({progress}%)</span>

                            )}

                            {msg.type === 'campaign_starting' && (

                              <span>Starting campaign...</span>

                            )}

                            {msg.type === 'campaign_pausing' && (

                              <span>Pausing campaign...</span>

                            )}

                          </div>

                        ))}

                      </div>

                    </div>

                  )}

                </div>

              </div>

            </div>

            <CampaignStats campaign={campaign} darkMode={darkMode} realtimeStats={realtimeStats} />

          </div>

          {/* Left Column - Message Editor & Upload */}

          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-8">

            {/* Message Editor */}

            <div className={`rounded-lg border ${borderColor} p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>

              <h2 className={`text-lg font-semibold mb-4 ${textColor}`}>Message Template</h2>



              {/* Variable Chips */}

              {availableVariables.length > 0 && (

                <div className="mb-6">

                  <p className={`text-sm font-medium mb-3 ${textColor}`}>Available Variables:</p>

                  <div className="flex flex-wrap gap-2 mb-4">

                    {availableVariables.map((variable) => (

                      <button

                        key={variable.value}

                        type="button"

                        onClick={() => handleVariableClick(variable.value)}

                        disabled={!isEditing}

                        className={`capitalize px-3 py-2 rounded-lg text-sm flex flex-col items-center transition-colors ${isEditing

                          ? darkMode

                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'

                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'

                          : darkMode

                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'

                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'

                          }`}

                        title={variable.description}

                      >

                        <span className="font-medium">{variable.label}</span>

                        <span className="text-xs opacity-75">{`{{${variable.value}}}`}</span>

                      </button>

                    ))}

                  </div>

                  <p className={`text-xs ${textMuted}`}>

                    Click a variable to insert it at cursor position. These will be replaced with actual data from your CSV.

                  </p>

                </div>

              )}



              {/* Message Textarea */}

              <div className="mb-4">

                <textarea

                  ref={messageInputRef}

                  value={editedCampaign.template || ''}

                  onChange={(e) => setEditedCampaign({ ...editedCampaign, template: e.target.value })}

                  disabled={!isEditing}

                  rows={12}

                  className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputBg} ${placeholderColor} ${!isEditing ? 'opacity-75 cursor-not-allowed' : ''

                    }`}

                  placeholder="Type your message here... Use {{variable}} for personalization"

                />

                <div className={`flex justify-between text-sm mt-2 ${textMuted}`}>

                  <span>{editedCampaign.template?.length || 0} characters</span>

                  <span>{Math.ceil((editedCampaign.template?.length || 0) / 160)} SMS</span>

                </div>

              </div>



              {/* Message Preview */}

              <div>

                <h3 className={`text-sm font-medium mb-2 ${textColor}`}>Preview:</h3>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>

                  <p className={`whitespace-pre-wrap ${textColor}`}>

                    {campaign.template || 'No message content yet'}

                  </p>

                  {campaign.template?.includes('{{') && (

                    <div className={`text-xs mt-4 p-3 rounded border ${borderColor}`}>

                      <p className={`font-medium mb-1 ${textColor}`}>Variables detected:</p>

                      <p className={textMuted}>

                        {(campaign.template.match(/{{(.*?)}}/g) || []).join(', ') || 'None'}

                      </p>

                    </div>

                  )}

                </div>

              </div>

            </div>



            {/* Contact Upload */}

            <ContactUpload

              onUpload={handleUpload}

              result={uploadResult}

              campaignId={campaign.id}

              darkMode={darkMode}

              disabled={!canEdit}

            />



            <div className={`rounded-lg border ${borderColor} p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>

              <div className="flex items-center justify-between mb-4">

                <h2 className={`text-lg font-semibold ${textColor}`}>Contacts</h2>

                <div className={`text-sm ${textMuted}`}>

                  {contactsTotal} total

                </div>

              </div>



              <div className={`overflow-hidden rounded-lg border ${borderColor}`}>

                <div className="overflow-x-auto">

                  <table className="min-w-full text-sm">

                    <thead className={darkMode ? 'bg-gray-900' : 'bg-gray-50'}>

                      <tr>

                        <th className={`px-4 py-3 text-left font-medium whitespace-nowrap ${textMuted}`}>Phone</th>

                        <th className={`px-4 py-3 text-left font-medium whitespace-nowrap ${textMuted}`}>Status</th>

                        <th className={`px-4 py-3 text-left font-medium whitespace-nowrap ${textMuted}`}>Message SID</th>

                        <th className={`px-4 py-3 text-left font-medium whitespace-nowrap ${textMuted}`}>Failure Reason</th>

                        <th className={`px-4 py-3 text-left font-medium whitespace-nowrap ${textMuted}`}>Meta</th>

                        <th className={`px-4 py-3 text-left font-medium whitespace-nowrap ${textMuted}`}>Rendered</th>

                        <th className={`px-4 py-3 text-left font-medium whitespace-nowrap ${textMuted}`}>Replied</th>

                      </tr>

                    </thead>

                    <tbody className={darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>

                      {contactsLoading ? (

                        <tr>

                          <td colSpan={4} className={`px-4 py-6 text-center ${textMuted}`}>

                            Loading...

                          </td>

                        </tr>

                      ) : contactsRows.length === 0 ? (

                        <tr>

                          <td colSpan={4} className={`px-4 py-6 text-center ${textMuted}`}>

                            No contacts found

                          </td>

                        </tr>

                      ) : (

                        contactsRows.map((row) => {

                          const status = row.status;

                          const statusPill =

                            status === 'failed'

                              ? 'bg-red-100 text-red-800'

                              : status === 'delivered' || status === 'sent'

                                ? 'bg-green-100 text-green-800'

                                : status === 'queued'

                                  ? 'bg-gray-200 text-gray-800'

                                  : 'bg-blue-100 text-blue-800';



                          const statusPillDark =

                            status === 'failed'

                              ? 'bg-red-900 text-red-200'

                              : status === 'delivered' || status === 'sent'

                                ? 'bg-green-900 text-green-200'

                                : status === 'queued'

                                  ? 'bg-gray-700 text-gray-200'

                                  : 'bg-blue-900 text-blue-200';



                          return (

                            <tr key={row.id} className={darkMode ? 'hover:bg-gray-900/50' : 'hover:bg-gray-50'}>

                              <td className={`px-4 py-3 ${textColor}`}>{row.phone}</td>

                              <td className="px-4 py-3">

                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${darkMode ? statusPillDark : statusPill}`}>

                                  {status}

                                </span>

                              </td>

                              <td className={`px-4 py-3 ${textMuted}`}>{row.message_sid || '-'}</td>

                              <td className={`px-4 py-3 ${status === 'failed' ? (darkMode ? 'text-red-200' : 'text-red-700') : textMuted}`}>

                                {row.error_message || '-'}

                              </td>

                              <td className="px-4 py-3">

                                <HoverCell

                                  value={JSON.stringify(row.meta, null, 2)}

                                  textColor={textMuted}

                                  darkMode={darkMode}

                                />

                              </td>



                              <td className="px-4 py-3">

                                <HoverCell

                                  value={row.rendered_message}

                                  textColor={textMuted}

                                  darkMode={darkMode}

                                />

                              </td>



                              <td className={`px-4 py-3 ${textMuted}`}>

                                {row.replied_at || '-'}

                              </td>

                            </tr>

                          );

                        })

                      )}

                    </tbody>

                  </table>

                </div>

              </div>



              <div className="flex items-center justify-between mt-4">

                <div className={`text-xs ${textMuted}`}>

                  Page {contactsPage} of {contactsTotalPages}

                </div>

                <div className="flex items-center gap-2">

                  <button

                    onClick={() => setContactsPage((p) => Math.max(1, p - 1))}

                    disabled={contactsPage <= 1 || contactsLoading}

                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-900' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}

                  >

                    Prev

                  </button>

                  <button

                    onClick={() => setContactsPage((p) => Math.min(contactsTotalPages, p + 1))}

                    disabled={contactsPage >= contactsTotalPages || contactsLoading}

                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-900' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}

                  >

                    Next

                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Campaign Info */}

        <div className="mt-8">

          <div className="space-y-8">

            {/* Campaign Info */}

            <div className={`rounded-lg border ${borderColor} p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>

              <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Campaign Information</h3>

              <div className="space-y-4">

                <div>

                  <p className={`text-sm ${textMuted}`}>Total Contacts</p>

                  <p className={`text-2xl font-bold ${textColor}`}>{totalContacts}</p>

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <p className={`text-sm ${textMuted}`}>Sent</p>

                    <p className={`text-xl font-bold text-green-600`}>{stats.sent || 0}</p>

                  </div>

                  <div>

                    <p className={`text-sm ${textMuted}`}>Failed</p>

                    <p className={`text-xl font-bold text-red-600`}>{stats.failed || 0}</p>

                  </div>

                </div>

                {totalContacts > 0 && (

                  <div>

                    <p className={`text-sm ${textMuted}`}>Pending</p>

                    <p className={`text-xl font-bold ${textColor}`}>

                      {pending}

                    </p>

                  </div>

                )}

                {campaign.variables && campaign.variables.length > 0 && (

                  <div>

                    <p className={`text-sm ${textMuted}`}>Variables</p>

                    <p className={`text-sm ${textColor}`}>

                      {campaign.variables.join(', ')}

                    </p>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

};



const HoverCell = ({ value, textColor, darkMode }) => {

  if (!value) return <span className={textColor}>-</span>;



  const tooltipBg = darkMode ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-900 border-gray-200';



  return (

    <div className="relative group max-w-[220px]">

      <div className={`truncate ${textColor}`}>

        {value}

      </div>



      <div

        className={`pointer-events-none absolute z-50 hidden group-hover:block top-full left-0 mt-1 w-80 rounded-md border p-2 text-xs shadow-lg whitespace-pre-wrap break-words ${tooltipBg}`}

      >

        {value}

      </div>

    </div>

  );

};



export default CampaignDetail;

