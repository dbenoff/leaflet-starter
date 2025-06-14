import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './app.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different location types
const parkIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const landmarkIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function App() {
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'custom'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default center (New York City)
  const defaultCenter = [40.7589, -73.9851];

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (latlng) => {
    setSelectedPosition(latlng);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPosition || !formData.name.trim()) {
      alert('Please provide a name for the location');
      return;
    }

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          lat: selectedPosition.lat,
          lng: selectedPosition.lng,
          type: formData.type
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add location');
      }

      await fetchLocations();
      setShowForm(false);
      setSelectedPosition(null);
      setFormData({ name: '', description: '', type: 'custom' });
    } catch (err) {
      alert('Error adding location: ' + err.message);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) {
      return;
    }

    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      await fetchLocations();
    } catch (err) {
      alert('Error deleting location: ' + err.message);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'park':
        return parkIcon;
      case 'landmark':
        return landmarkIcon;
      default:
        return customIcon;
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setSelectedPosition(null);
    setFormData({ name: '', description: '', type: 'custom' });
  };

  if (loading) {
    return <div className="loading">Loading map data...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Interactive Location Map</h1>
        <p>Click on the map to add new locations</p>
      </header>

      {error && (
        <div className="error-banner">
          Error: {error}
          <button onClick={fetchLocations}>Retry</button>
        </div>
      )}

      <div className="map-container">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: '500px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onMapClick={handleMapClick} />
          
          {locations.map((location) => (
            <Marker
              key={location.id}
              position={[location.lat, location.lng]}
              icon={getIcon(location.type)}
            >
              <Popup>
                <div className="popup-content">
                  <h3>{location.name}</h3>
                  {location.description && <p>{location.description}</p>}
                  <div className="popup-meta">
                    <span className="location-type">{location.type}</span>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteLocation(location.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {selectedPosition && (
            <Marker position={[selectedPosition.lat, selectedPosition.lng]}>
              <Popup>
                <div>New location at:<br />
                  Lat: {selectedPosition.lat.toFixed(4)}<br />
                  Lng: {selectedPosition.lng.toFixed(4)}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="location-form">
            <h3>Add New Location</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name:</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="type">Type:</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="custom">Custom</option>
                  <option value="park">Park</option>
                  <option value="landmark">Landmark</option>
                </select>
              </div>

              <div className="position-info">
                Position: {selectedPosition?.lat.toFixed(4)}, {selectedPosition?.lng.toFixed(4)}
              </div>
              
              <div className="form-buttons">
                <button type="submit">Add Location</button>
                <button type="button" onClick={cancelForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="locations-list">
        <h3>Locations ({locations.length})</h3>
        <div className="locations-grid">
          {locations.map((location) => (
            <div key={location.id} className="location-card">
              <h4>{location.name}</h4>
              <p>{location.description}</p>
              <div className="location-meta">
                <span className={`type-badge ${location.type}`}>{location.type}</span>
                <span className="coordinates">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;