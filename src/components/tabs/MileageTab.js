import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { dataService } from '../../utils/dataService';

/**
 * Mileage Tracking Tab Component
 * Tracks trips using geolocation and calculates mileage reimbursement
 */
const MileageTab = ({ appData, updateAppData }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [currentDistance, setCurrentDistance] = useState(0);

  // IRS Standard Mileage Rate (2024-2025)
  const MILEAGE_RATE = 0.67; // dollars per mile

  // Check for active trip on mount
  useEffect(() => {
    if (appData.active?.tripId) {
      const activeTrip = (appData.mileageTrips || []).find(t => t.id === appData.active.tripId);
      if (activeTrip && !activeTrip.endTime) {
        setIsTracking(true);
        setCurrentTrip(activeTrip);
        setSelectedClient(activeTrip.clientId);
        setSelectedJobId(activeTrip.jobId || '');
        setPurpose(activeTrip.purpose || '');
        setNotes(activeTrip.notes || '');
        // Restart location tracking
        startLocationTracking(activeTrip);
      }
    }
  }, [appData.active, appData.mileageTrips]);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Start location tracking
  const startLocationTracking = (trip) => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now()
        };

        setCurrentTrip(prevTrip => {
          if (!prevTrip) return prevTrip;

          const updatedPoints = [...(prevTrip.points || []), newPoint];
          
          // Calculate cumulative distance
          let totalDistance = 0;
          for (let i = 1; i < updatedPoints.length; i++) {
            const prev = updatedPoints[i - 1];
            const curr = updatedPoints[i];
            totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
          }

          setCurrentDistance(totalDistance);

          const updatedTrip = {
            ...prevTrip,
            points: updatedPoints,
            distance: totalDistance
          };

          // Update in appData
          const updatedTrips = (appData.mileageTrips || []).map(t => 
            t.id === updatedTrip.id ? updatedTrip : t
          );
          updateAppData({ mileageTrips: updatedTrips });

          return updatedTrip;
        });

        setLocationError(null);
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError(error.message);
      },
      options
    );

    setWatchId(id);
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  // Start tracking a trip
  const startTrip = () => {
    if (!selectedClient) {
      alert('Please select a client before starting a trip.');
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Cannot track mileage.');
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const startPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now()
        };

        const newTrip = {
          id: dataService.generateId(),
          clientId: selectedClient,
          jobId: selectedJobId || null,
          purpose: purpose.trim(),
          notes: notes.trim(),
          startTime: Date.now(),
          endTime: null,
          points: [startPoint],
          distance: 0,
          reimbursementRate: MILEAGE_RATE
        };

        const updatedTrips = [...(appData.mileageTrips || []), newTrip];

        updateAppData({
          mileageTrips: updatedTrips,
          active: { ...appData.active, tripId: newTrip.id }
        });

        setCurrentTrip(newTrip);
        setIsTracking(true);
        setCurrentDistance(0);
        startLocationTracking(newTrip);
      },
      (error) => {
        alert(`Unable to get your location: ${error.message}`);
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Stop tracking a trip
  const stopTrip = () => {
    if (!currentTrip) return;

    stopLocationTracking();

    const completedTrip = {
      ...currentTrip,
      endTime: Date.now(),
      distance: currentDistance,
      notes: notes.trim()
    };

    const updatedTrips = (appData.mileageTrips || []).map(t =>
      t.id === completedTrip.id ? completedTrip : t
    );

    const { tripId, ...remainingActive } = appData.active || {};
    const newActive = Object.keys(remainingActive).length > 0 ? remainingActive : null;

    updateAppData({
      mileageTrips: updatedTrips,
      active: newActive
    });

    setIsTracking(false);
    setCurrentTrip(null);
    setCurrentDistance(0);
    setNotes('');
    setPurpose('');
    setSelectedJobId('');
  };

  // Delete a trip
  const deleteTrip = (tripId) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return;

    const updatedTrips = (appData.mileageTrips || []).filter(t => t.id !== tripId);
    updateAppData({ mileageTrips: updatedTrips });
  };

  // Get client options for select
  const clientOptions = appData.clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  // Get job options for selected client
  const jobOptions = selectedClient
    ? (appData.jobs || [])
        .filter(j => !j.closed)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Get completed trips sorted by date
  const completedTrips = (appData.mileageTrips || [])
    .filter(t => t.endTime)
    .sort((a, b) => b.startTime - a.startTime);

  // Calculate total mileage and reimbursement
  const totalMileage = completedTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  const totalReimbursement = completedTrips.reduce(
    (sum, trip) => sum + (trip.distance || 0) * (trip.reimbursementRate || MILEAGE_RATE),
    0
  );

  // Update notes for active trip
  const updateNotes = (newNotes) => {
    setNotes(newNotes);
    
    if (isTracking && currentTrip) {
      const updatedTrips = (appData.mileageTrips || []).map(t =>
        t.id === currentTrip.id ? { ...t, notes: newNotes } : t
      );
      updateAppData({ mileageTrips: updatedTrips });
    }
  };

  return (
    <div className="tab-content">
      {/* Trip Tracker */}
      <Card>
        <div className="timer-section">
          <div className={`timer-display ${isTracking ? 'timer-active' : ''}`}>
            {dataService.formatMileage(currentDistance)}
          </div>
          
          {isTracking && (
            <div className="timer-start-time">
              Trip started at {dataService.formatTime(currentTrip?.startTime)}
              {locationError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  ⚠️ {locationError}
                </div>
              )}
            </div>
          )}
          
          <div className="timer-controls">
            {!isTracking ? (
              <Button 
                onClick={startTrip}
                className="btn-start"
                size="large"
              >
                🚗 START TRIP
              </Button>
            ) : (
              <Button 
                onClick={stopTrip}
                className="btn-stop"
                size="large"
              >
                ⏹️ END TRIP
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Trip Details */}
      <Card>
        <h3 className="card-title">Trip Details</h3>
        
        <div className="form-group">
          <div className="input-group">
            <label className="input-label">Client</label>
            <select
              className="select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={isTracking}
            >
              <option value="">Select a client</option>
              {clientOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Job (Optional)</label>
            <select
              className="select"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              disabled={isTracking || !selectedClient}
            >
              <option value="">-- Select Job --</option>
              {jobOptions.map(job => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Purpose</label>
            <input
              type="text"
              className="input"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Drive to client site"
              disabled={isTracking}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea
              className="input"
              rows="2"
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Current Reimbursement Rate
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
            ${MILEAGE_RATE.toFixed(2)} per mile
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
            IRS Standard Mileage Rate (2024-2025)
          </div>
        </div>
      </Card>

      {/* Trip Statistics */}
      {completedTrips.length > 0 && (
        <Card>
          <h3 className="card-title">Trip Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value stat-value-primary">
                {completedTrips.length}
              </div>
              <div className="stat-label">Total Trips</div>
            </div>
            <div className="stat-item">
              <div className="stat-value stat-value-secondary">
                {dataService.formatMileage(totalMileage)}
              </div>
              <div className="stat-label">Total Miles</div>
            </div>
            <div className="stat-item">
              <div className="stat-value stat-value-success">
                {dataService.formatCurrency(totalReimbursement)}
              </div>
              <div className="stat-label">Reimbursement</div>
            </div>
          </div>
        </Card>
      )}

      {/* Trip History */}
      <Card>
        <h3 className="card-title">Trip History</h3>
        
        {completedTrips.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">No trips recorded yet</p>
          </div>
        ) : (
          <div className="activity-list">
            {completedTrips.map(trip => {
              const client = appData.clients.find(c => c.id === trip.clientId);
              const job = trip.jobId ? appData.jobs.find(j => j.id === trip.jobId) : null;
              const reimbursement = (trip.distance || 0) * (trip.reimbursementRate || MILEAGE_RATE);
              
              return (
                <div key={trip.id} className="activity-item activity-item-success">
                  <div className="activity-main">
                    🚗 {client?.name || 'Unknown Client'}
                    {job && ` - ${job.name}`}
                    {trip.purpose && ` (${trip.purpose})`}
                  </div>
                  <div className="activity-meta">
                    {dataService.formatDate(trip.startTime)} • 
                    {' '}{dataService.formatMileage(trip.distance)} • 
                    {' '}{dataService.formatCurrency(reimbursement)}
                  </div>
                  {trip.notes && (
                    <div className="activity-notes">
                      {trip.notes}
                    </div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => deleteTrip(trip.id)}
                    >
                      🗑️ Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Help Info */}
      <Card>
        <h3 className="card-title">📍 How It Works</h3>
        <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '8px' }}>
            This feature uses your device's GPS to automatically track distance as you drive:
          </p>
          <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
            <li>Select a client and tap "START TRIP"</li>
            <li>Allow location access when prompted</li>
            <li>Drive to your destination</li>
            <li>Tap "END TRIP" when you arrive</li>
          </ul>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
            💡 Tip: Keep the app open during your trip for best accuracy. The mileage rate is 
            automatically set to the IRS standard rate.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default MileageTab;
