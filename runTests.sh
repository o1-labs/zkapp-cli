#!/bin/bash

# Run tests in root directory
npm run test

# Run tests in templates/project-ts directory
cd ./templates/project-ts/
[ ! -d "./node_modules" ] && npm install
npm run test
