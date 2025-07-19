// Simple manual test for file processor functionality
// This can be run in the browser console to verify the logic

const { FileProcessor, FileProcessingError } = require('./file-processor');

// Test file validation
console.log('Testing file validation...');

// Test 1: Valid .txt file
const validTxtFile = new File(['Hello world'], 'test.txt', { type: 'text/plain' });
const result1 = FileProcessor.validateFile(validTxtFile);
console.log('Valid .txt file:', result1.isValid ? 'PASS' : 'FAIL', result1);

// Test 2: Valid .md file  
const validMdFile = new File(['# Title\nContent'], 'test.md', { type: 'text/markdown' });
const result2 = FileProcessor.validateFile(validMdFile);
console.log('Valid .md file:', result2.isValid ? 'PASS' : 'FAIL', result2);

// Test 3: Invalid file type
const invalidFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
const result3 = FileProcessor.validateFile(invalidFile);
console.log('Invalid file type:', !result3.isValid ? 'PASS' : 'FAIL', result3);

// Test title extraction
console.log('\nTesting title extraction...');

// Test 4: Markdown header
const title1 = FileProcessor.extractTitle('# Meeting Notes\nContent', 'file.md');
console.log('Markdown header:', title1 === 'Meeting Notes' ? 'PASS' : 'FAIL', title1);

// Test 5: First line as title
const title2 = FileProcessor.extractTitle('Weekly Meeting\nContent here', 'file.txt');
console.log('First line title:', title2 === 'Weekly Meeting' ? 'PASS' : 'FAIL', title2);

// Test 6: Filename fallback
const title3 = FileProcessor.extractTitle('This is a very long first line that should not be used as a title because it exceeds reasonable length', 'meeting-notes.txt');
console.log('Filename fallback:', title3 === 'meeting-notes' ? 'PASS' : 'FAIL', title3);

// Test content sanitization
console.log('\nTesting content sanitization...');

// Test 7: Line ending normalization
const sanitized1 = FileProcessor.sanitizeContent('Line 1\r\nLine 2\rLine 3');
console.log('Line endings:', sanitized1 === 'Line 1\nLine 2\nLine 3' ? 'PASS' : 'FAIL', sanitized1);

// Test 8: Whitespace trimming
const sanitized2 = FileProcessor.sanitizeContent('  \n  Content  \n  ');
console.log('Whitespace trim:', sanitized2 === 'Content' ? 'PASS' : 'FAIL', sanitized2);

console.log('\nAll tests completed!');