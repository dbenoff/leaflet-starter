import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// In-memory storage for demo purposes
let locations = [
  {
    id: 1,
    name: "Central Park",
    description: "Beautiful park in Manhattan",
    lat: 40.7829,
    lng: -73.9654,
    type: "park"
  },
  {
    id: 2,
    name: "Times Square",
    description: "Famous commercial intersection",
    lat: 40.7580,
    lng: -73.9855,
    type: "landmark"
  },
  {
    id: 3,
    name: "Brooklyn Bridge",
    description: "Historic suspension bridge",
    lat: 40.7061,
    lng: -73.9969,
    type: "landmark"
  }
];

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/locations', (req, res) => {
  res.json(locations);
});

app.post('/api/locations', (req, res) => {
  const { name, description, lat, lng, type } = req.body;
  
  if (!name || !lat || !lng) {
    return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
  }

  const newLocation = {
    id: Math.max(...locations.map(l => l.id), 0) + 1,
    name,
    description: description || '',
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    type: type || 'custom'
  };

  locations.push(newLocation);
  res.status(201).json(newLocation);
});

app.delete('/api/locations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = locations.findIndex(l => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Location not found' });
  }

  locations.splice(index, 1);
  res.status(204).send();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});