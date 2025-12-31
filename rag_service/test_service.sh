#!/bin/bash

echo "Testing Health Endpoint..."
curl -X GET http://127.0.0.1:8000/health
echo -e "\n\n"

echo "Testing Search Endpoint..."
curl -X POST http://127.0.0.1:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "candidates": ["quedar-me sense", "vivenda"],
    "k": 3,
    "threshold": 0.52
  }'
echo -e "\n"
