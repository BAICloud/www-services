FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including leaflet)
RUN npm install

# Verify leaflet is installed
RUN npm list leaflet || npm install leaflet

# Copy source code (node_modules excluded via .dockerignore)
COPY . .

# Expose port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
