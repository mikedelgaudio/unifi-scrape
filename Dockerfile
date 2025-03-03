# Stage 1: Build dependencies
FROM node:18 AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Compile TypeScript into JavaScript (output to dist/)
RUN npm run build

# Stage 2: Production image
FROM node:18-slim
WORKDIR /app

# Create a non-root user
RUN useradd --create-home appuser

# Ensure correct permissions for app files for appuser
RUN chown -R appuser:appuser /app

USER appuser

# Set environment variable for production mode
ENV NODE_ENV=production

# Copy only necessary files from build stage
COPY --from=build /app /app

# Run the application with Node.js (using the compiled JS)
CMD ["node", "dist/index.js"]