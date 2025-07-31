# Deployment Guide

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/ArunPrasadhIO/salesforce-test-data-utility.git
cd salesforce-test-data-utility
npm run setup
```

### 2. Configure Salesforce Credentials
```bash
# Copy environment template
cp config/env.example .env

# Edit .env with your Salesforce credentials
nano .env
```

### 3. Start Application
```bash
npm start
```

The application will be available at `http://localhost:3000`

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```env
# Salesforce Configuration
SF_USERNAME=your-salesforce-username@example.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-security-token
SF_LOGIN_URL=https://login.salesforce.com

# Application Configuration
PORT=3000
HOST=localhost
NODE_ENV=production
```

### Salesforce Sandbox Configuration

For sandbox environments:
```env
SF_LOGIN_URL=https://test.salesforce.com
```

### Get Your Security Token

1. Log into Salesforce
2. Go to **Setup** → **My Personal Information** → **Reset My Security Token**
3. Click **Reset Security Token**
4. Check your email for the new token

---

## Production Deployment

### Environment Requirements

- **Node.js**: v14.0.0 or higher
- **NPM**: v6.0.0 or higher
- **Memory**: Minimum 512MB RAM
- **Storage**: 1GB for CSV file generation

### Docker Deployment

```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t salesforce-utility .
docker run -p 3000:3000 --env-file .env salesforce-utility
```

### Cloud Deployment

#### Heroku Deployment

```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set SF_USERNAME=your-username
heroku config:set SF_PASSWORD=your-password
heroku config:set SF_SECURITY_TOKEN=your-token

# Deploy
git push heroku main
```

#### AWS EC2 Deployment

1. **Launch EC2 Instance** (t3.micro or larger)
2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and Setup**:
   ```bash
   git clone https://github.com/ArunPrasadhIO/salesforce-test-data-utility.git
   cd salesforce-test-data-utility
   npm install
   ```

4. **Configure Environment**:
   ```bash
   cp config/env.example .env
   # Edit .env with your credentials
   ```

5. **Use PM2 for Process Management**:
   ```bash
   npm install -g pm2
   pm2 start src/app.js --name "salesforce-utility"
   pm2 startup
   pm2 save
   ```

6. **Setup Nginx (Optional)**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Security Considerations

### Environment Security

- **Never commit `.env` files** to version control
- **Use strong passwords** for Salesforce accounts  
- **Enable IP restrictions** in Salesforce if possible
- **Rotate security tokens** regularly

### Production Hardening

```javascript
// src/app.js - Add security middleware
const helmet = require('helmet');
app.use(helmet());

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Monitoring and Logging

### Application Monitoring

```javascript
// Add to src/app.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Health Check Endpoint

```javascript
// Add to src/app.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Performance Monitoring

Monitor these metrics:
- **Response time** for API endpoints
- **Memory usage** during CSV generation
- **Salesforce API call rates**
- **Success/failure rates** for bulk uploads

---

## Backup and Recovery

### Data Backup

```bash
# Backup generated CSV files
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Backup configuration
cp .env config/env.backup
```

### Database Recovery

Since this application doesn't use a persistent database, recovery focuses on:
- **Salesforce object tracking** (data/created_objects.txt)
- **Generated CSV files** (data/*.csv)
- **Configuration files** (.env, config/*)

---

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: INVALID_LOGIN: Invalid username, password, security token
```
**Solution**: Verify credentials and security token

#### 2. API Rate Limits
```
Error: REQUEST_LIMIT_EXCEEDED
```
**Solution**: Increase delays in performance configuration

#### 3. Memory Issues
```
Error: JavaScript heap out of memory
```
**Solution**: Increase Node.js memory limit:
```bash
node --max-old-space-size=4096 src/app.js
```

#### 4. Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
**Solution**: Change port in .env or kill process:
```bash
lsof -ti:3000 | xargs kill -9
```

### Debug Mode

Enable debugging:
```bash
DEBUG=true npm start
```

### Log Analysis

```bash
# Monitor application logs
tail -f logs/combined.log

# Search for errors
grep "ERROR" logs/combined.log

# Monitor system resources
htop
```

---

## Scaling Considerations

### Horizontal Scaling

For high-volume operations:
- **Load Balancer**: Distribute requests across multiple instances
- **Queue System**: Use Redis or AWS SQS for bulk operations
- **Microservices**: Split object creation and data upload services

### Performance Optimization

```javascript
// Cluster mode for multiple CPU cores
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  require('./src/app.js');
}
```

### Database Integration

For enterprise deployments, consider adding:
- **PostgreSQL**: Store operation history and metrics
- **Redis**: Cache Salesforce metadata and session data
- **InfluxDB**: Time-series data for performance monitoring

---

## Maintenance

### Regular Tasks

- **Weekly**: Review logs for errors and performance issues
- **Monthly**: Update dependencies (`npm audit` and `npm update`)
- **Quarterly**: Rotate Salesforce security tokens
- **Annually**: Review and update security configurations

### Update Process

```bash
# Backup current deployment
tar -czf backup-$(date +%Y%m%d).tar.gz .

# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Restart application
pm2 restart salesforce-utility
``` 