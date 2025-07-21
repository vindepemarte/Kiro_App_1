#!/bin/bash

# Deploy Firestore indexes using Firebase CLI in Docker
# This script can be run in Coolify or any Docker environment

echo "🔥 Deploying Firestore indexes..."

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo "❌ firebase.json not found. Creating minimal config..."
    cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
EOF
fi

# Use Firebase CLI Docker image
docker run --rm -v $(pwd):/workspace -w /workspace \
  -e FIREBASE_TOKEN="$FIREBASE_TOKEN" \
  andreysenov/firebase-tools:latest \
  firebase deploy --only firestore:indexes --token "$FIREBASE_TOKEN"

echo "✅ Firestore indexes deployment completed!"