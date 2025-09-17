// API Configuration
const config = {
  development: {
    apiUrl: 'http://localhost:3001'
  },
  production: {
    apiUrl: 'https://api-dev.jimboslice.xyz'
  }
};

// React environment detection fix
let environment = 'development';

// Method 1: Use REACT_APP_ environment variable (set at build time)
if (process.env.REACT_APP_ENV === 'production') {
  environment = 'production';
}
// Method 2: Fallback to hostname detection for runtime
else if (window.location.hostname === 'dev.jimboslice.xyz') {
  environment = 'production';
}
// Method 3: Final fallback to NODE_ENV
else if (process.env.NODE_ENV === 'production') {
  environment = 'production';
}

// Debug logging to identify environment detection issue
console.log('Environment Detection Debug:');
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('process.env.REACT_APP_ENV:', process.env.REACT_APP_ENV);
console.log('window.location.hostname:', window.location.hostname);
console.log('Detected environment:', environment);
console.log('API URL being used:', config[environment].apiUrl);

export default config[environment];
