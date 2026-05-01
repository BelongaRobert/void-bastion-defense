// Predictive Analytics Module
// Analyzes trends and predicts future system states

import { execSync } from 'child_process';

// Historical data for trend analysis
const historyStore = {
  diskC: [],
  diskD: [],
  memory: [],
  cpu: [],
  maxHistory: 168 // 7 days of hourly data
};

// Add data point
export function addHistoryPoint(type, value) {
  const now = Date.now();
  historyStore[type].push({ timestamp: now, value });
  
  // Keep only last 168 entries
  if (historyStore[type].length > historyStore.maxHistory) {
    historyStore[type].shift();
  }
}

// Calculate linear regression for prediction
function linearRegression(data) {
  if (data.length < 2) return null;
  
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  // Use index as X (time)
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].value;
    sumXY += i * data[i].value;
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

// Predict when disk will be full
export function predictDiskFull(diskType = 'diskC') {
  const data = historyStore[diskType];
  if (data.length < 10) return null;
  
  const regression = linearRegression(data);
  if (!regression) return null;
  
  const { slope, intercept } = regression;
  
  // If slope is positive (growing), predict when it hits 100%
  if (slope <= 0) {
    return {
      prediction: null,
      trend: 'stable',
      message: 'Disk usage stable'
    };
  }
  
  // Calculate hours until 100%
  const currentValue = data[data.length - 1].value;
  const hoursToFull = (100 - currentValue) / (slope * 100); // slope is percentage per index
  const daysToFull = hoursToFull / 24;
  
  if (daysToFull < 0) {
    return {
      prediction: null,
      trend: 'unknown',
      message: 'Cannot predict'
    };
  }
  
  let message;
  let urgency;
  
  if (daysToFull <= 3) {
    message = `⚠️ Disk ${diskType === 'diskC' ? 'C:' : 'D:'} will be FULL in ${Math.round(daysToFull * 10) / 10} days!`;
    urgency = 'urgent';
  } else if (daysToFull <= 7) {
    message = `🟡 Disk ${diskType === 'diskC' ? 'C:' : 'D:'} full in ~${Math.round(daysToFull)} days`;
    urgency = 'warning';
  } else {
    message = `Disk ${diskType === 'diskC' ? 'C:' : 'D:'} trending up, full in ~${Math.round(daysToFull)} days`;
    urgency = 'info';
  }
  
  return {
    prediction: {
      daysToFull,
      hoursToFull,
      currentValue,
      slope: slope * 100 // percentage per reading
    },
    trend: 'growing',
    message,
    urgency
  };
}

// Predict memory trend
export function predictMemoryTrend() {
  const data = historyStore.memory;
  if (data.length < 10) return null;
  
  const regression = linearRegression(data);
  if (!regression) return null;
  
  const { slope } = regression;
  const currentValue = data[data.length - 1].value;
  
  let trend;
  let message;
  
  if (slope > 0.5) {
    trend = 'increasing';
    message = `🟡 Memory usage increasing (+${Math.round(slope * 100)}% per reading)`;
  } else if (slope < -0.5) {
    trend = 'decreasing';
    message = `🟢 Memory usage decreasing`;
  } else {
    trend = 'stable';
    message = `⚪ Memory usage stable`;
  }
  
  return {
    trend,
    slope: slope * 100,
    currentValue,
    message
  };
}

// Get trend data for graphs
export function getTrendData(type) {
  const data = historyStore[type];
  if (data.length < 2) return null;
  
  const regression = linearRegression(data);
  if (!regression) return null;
  
  // Generate trend line points
  const trendLine = data.map((_, i) => ({
    x: i,
    y: regression.intercept + regression.slope * i
  }));
  
  return {
    current: data[data.length - 1].value,
    trend: regression.slope > 0 ? 'up' : regression.slope < 0 ? 'down' : 'flat',
    slope: regression.slope,
    line: trendLine
  };
}

// Get all predictions
export function getAllPredictions() {
  return {
    diskC: predictDiskFull('diskC'),
    diskD: predictDiskFull('diskD'),
    memory: predictMemoryTrend(),
    lastUpdated: Date.now()
  };
}

// Start analytics collection
export function startAnalyticsCollection(io) {
  // Add data point every 5 minutes
  setInterval(() => {
    // This would be called from the data collection loop
    // We'll integrate it into server.js
  }, 300000);
  
  // Broadcast predictions every hour
  setInterval(() => {
    const predictions = getAllPredictions();
    io.emit('predictions-update', predictions);
  }, 3600000);
  
  console.log('📈 Predictive analytics started');
}

export { historyStore };
