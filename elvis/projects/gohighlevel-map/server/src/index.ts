import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const GHL_API_URL = 'https://rest.gohighlevel.com/v1';
const GHL_API_KEY = process.env.GHL_API_KEY || '';

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fetch contacts directly from GHL (no local storage)
app.get('/api/contacts', async (req, res) => {
  try {
    if (!GHL_API_KEY) {
      return res.status(400).json({ error: 'GHL_API_KEY not configured. Add it to .env file' });
    }

    // Fetch contacts from GHL
    const response = await axios.get(`${GHL_API_URL}/contacts`, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 100,
        ...req.query
      }
    });

    const contacts = response.data.contacts || [];
    
    // Filter only contacts with addresses
    const contactsWithAddresses = contacts.filter((contact: any) => {
      const hasAddress = contact.address && (
        contact.address.line1 || 
        contact.address.city || 
        contact.address.postalCode
      );
      const hasCustomAddress = contact.customFields?.some((field: any) => 
        field.fieldKey?.toLowerCase().includes('address') && field.value
      );
      return hasAddress || hasCustomAddress;
    });

    // Format for frontend
    const formattedContacts = contactsWithAddresses.map((contact: any) => ({
      id: contact.id,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || {},
      customFields: contact.customFields || [],
      tags: contact.tags || [],
      // Mock coordinates for now - geocode later
      lat: 40.7128 + (Math.random() - 0.5) * 0.5,
      lng: -74.0060 + (Math.random() - 0.5) * 0.5
    }));

    res.json({
      contacts: formattedContacts,
      total: contacts.length,
      withAddresses: formattedContacts.length
    });

  } catch (error: any) {
    console.error('GHL API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch from GoHighLevel',
      details: error.response?.data?.message || error.message
    });
  }
});

// Search contacts via GHL
app.get('/api/contacts/search', async (req, res) => {
  const { q } = req.query;
  
  try {
    if (!GHL_API_KEY) {
      return res.status(400).json({ error: 'GHL_API_KEY not configured' });
    }

    // GHL doesn't have direct search, so we fetch and filter
    const response = await axios.get(`${GHL_API_URL}/contacts`, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: { limit: 100 }
    });

    const contacts = response.data.contacts || [];
    const searchLower = (q as string).toLowerCase();
    
    const filtered = contacts.filter((c: any) => {
      const searchable = `
        ${c.firstName || ''} 
        ${c.lastName || ''} 
        ${c.email || ''} 
        ${c.phone || ''} 
        ${c.address?.city || ''} 
        ${c.address?.postalCode || ''}
      `.toLowerCase();
      return searchable.includes(searchLower);
    });

    res.json({ contacts: filtered });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Geocode address (using OpenCage - free tier)
app.post('/api/geocode', async (req, res) => {
  const { address } = req.body;
  
  try {
    // For now, return mock coordinates
    // Replace with real geocoding API later
    res.json({
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1,
      formatted: address
    });
  } catch (error) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Single contact details
app.get('/api/contacts/:id', async (req, res) => {
  try {
    if (!GHL_API_KEY) {
      return res.status(400).json({ error: 'GHL_API_KEY not configured' });
    }

    const response = await axios.get(`${GHL_API_URL}/contacts/${req.params.id}`, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 GoHighLevel Map API ready`);
});
