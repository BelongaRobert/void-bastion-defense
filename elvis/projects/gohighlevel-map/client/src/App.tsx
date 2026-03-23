import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  tags: string[];
  lat: number;
  lng: number;
}

// Mock data for demo
const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    address: { line1: '123 Main St', city: 'New York', state: 'NY', postalCode: '10001' },
    tags: ['Customer', 'Premium'],
    lat: 40.7128,
    lng: -74.0060
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Smith',
    email: 'sarah.smith@example.com',
    phone: '(555) 987-6543',
    address: { line1: '456 Oak Ave', city: 'Brooklyn', state: 'NY', postalCode: '11201' },
    tags: ['Lead', 'New'],
    lat: 40.6782,
    lng: -73.9442
  },
  {
    id: '3',
    firstName: 'Michael',
    lastName: 'Johnson',
    email: 'michael.j@example.com',
    phone: '(555) 456-7890',
    address: { line1: '789 Pine Rd', city: 'Queens', state: 'NY', postalCode: '11101' },
    tags: ['Customer'],
    lat: 40.7282,
    lng: -73.7949
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@example.com',
    phone: '(555) 234-5678',
    address: { line1: '321 Elm St', city: 'Jersey City', state: 'NJ', postalCode: '07302' },
    tags: ['VIP', 'Referral'],
    lat: 40.7178,
    lng: -74.0431
  },
  {
    id: '5',
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.w@example.com',
    phone: '(555) 876-5432',
    address: { line1: '654 Maple Dr', city: 'Hoboken', state: 'NJ', postalCode: '07030' },
    tags: ['Customer'],
    lat: 40.7440,
    lng: -74.0324
  }
];

const pinIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function App() {
  const [contacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactCard, setShowContactCard] = useState(false);

  const formatAddress = (address: Contact['address']) => {
    const parts = [address.line1, address.city, address.state].filter(Boolean);
    return parts.join(', ');
  };

  const getMapCenter = () => {
    if (contacts.length === 0) return [40.7128, -74.0060];
    const avgLat = contacts.reduce((sum, c) => sum + c.lat, 0) / contacts.length;
    const avgLng = contacts.reduce((sum, c) => sum + c.lng, 0) / contacts.length;
    return [avgLat, avgLng];
  };

  const openContactCard = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactCard(true);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">📍</span>
          <h1>GHL Map</h1>
        </div>
        
        <div className="view-toggle">
          <button 
            className={view === 'list' ? 'active' : ''} 
            onClick={() => setView('list')}
          >
            📋 List
          </button>
          <button 
            className={view === 'map' ? 'active' : ''} 
            onClick={() => setView('map')}
          >
            🗺️ Map
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {view === 'list' ? (
          <div className="list-view">
            <div className="stats-bar">
              <span>{contacts.length} clients with addresses</span>
            </div>
            
            <div className="contact-grid">
              {contacts.map((contact) => (
                <div key={contact.id} className="contact-card">
                  <div className="card-header">
                    <h3>{contact.firstName} {contact.lastName}</h3>
                    <div className="tags">
                      {contact.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="card-body">
                    <p className="address">📍 {formatAddress(contact.address)}</p>
                    <p className="contact-info">
                      {contact.email && <span>📧 {contact.email}</span>}
                      {contact.phone && <span>📱 {contact.phone}</span>}
                    </p>
                  </div>
                  
                  <div className="card-actions">
                    <button 
                      className="btn-view"
                      onClick={() => openContactCard(contact)}
                    >
                      View Details
                    </button>
                    <button 
                      className="btn-map"
                      onClick={() => {
                        setSelectedContact(contact);
                        setView('map');
                      }}
                    >
                      Show on Map
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="map-view">
            <div className="map-card">
              <div className="map-header">
                <h2>Client Locations</h2>
                <button className="btn-close-map" onClick={() => setView('list')}>
                  ✕ Close
                </button>
              </div>
              
              <div className="map-container">
                <MapContainer
                  center={getMapCenter() as [number, number]}
                  zoom={11}
                  className="map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {contacts.map((contact) => (
                    <Marker
                      key={contact.id}
                      position={[contact.lat, contact.lng]}
                      icon={pinIcon}
                      eventHandlers={{
                        click: () => openContactCard(contact),
                      }}
                    >
                      <Popup>
                        <div className="popup-content">
                          <h3>{contact.firstName} {contact.lastName}</h3>
                          <p>{formatAddress(contact.address)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              
              <div className="map-footer">
                <span>💡 Click pins to view client details</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Contact Detail Card (Modal) */}
      {showContactCard && selectedContact && (
        <div className="modal-overlay" onClick={() => setShowContactCard(false)}>
          <div className="contact-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h2>{selectedContact.firstName} {selectedContact.lastName}</h2>
              <button className="btn-close" onClick={() => setShowContactCard(false)}>
                ✕
              </button>
            </div>
            
            <div className="card-body">
              <div className="detail-section">
                <h4>📍 Address</h4>
                <p>{selectedContact.address.line1}</p>
                <p>{selectedContact.address.city}, {selectedContact.address.state} {selectedContact.address.postalCode}</p>
              </div>
              
              <div className="detail-section">
                <h4>📧 Contact</h4>
                <p>{selectedContact.email || 'No email'}</p>
                <p>{selectedContact.phone || 'No phone'}</p>
              </div>
              
              {selectedContact.tags.length > 0 && (
                <div className="detail-section">
                  <h4>🏷️ Tags</h4>
                  <div className="tags">
                    {selectedContact.tags.map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="card-footer">
              <button 
                className="btn-ghl"
                onClick={() => setView('map')}
              >
                🗺️ View on Map
              </button>
              <a 
                href={`https://app.gohighlevel.com/v2/panel/contacts/detail/${selectedContact.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghl secondary"
              >
                Open in GHL →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;