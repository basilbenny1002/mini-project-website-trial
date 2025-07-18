#!/bin/bash

# Create project directory structure
mkdir -p flood-rehabilitation-project
cd flood-rehabilitation-project

# Create directories
mkdir -p public database

# Install dependencies
npm init -y
npm install express cors bcrypt jsonwebtoken
npm install --save-dev nodemon

# Create database directory
mkdir -p database

echo "Setup complete! To run the project:"
echo "1. Copy your HTML files to the 'public' directory"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
