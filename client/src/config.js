// API Configuration
const config = {
  development: {
    apiUrl: 'http://localhost:3001'
  },
  production: {
    apiUrl: 'https://api-dev.jimboslice.xyz'
  }
};

const environment = process.env.NODE_ENV || 'development';
export default config[environment];
