/**
 * Example usage of the Gemini AI processing service
 * This file demonstrates how to use the service in the application
 */

import { getGeminiService } from './gemini';

// Example meeting transcript
const sampleTranscript = `
Meeting: Sprint Planning - January 15, 2024

Attendees: John (Product Manager), Sarah (Developer), Mike (Designer)

John: Let's review our sprint goals. We need to complete the user authentication system and start on the dashboard.

Sarah: I can handle the authentication backend. I estimate it will take 3 days to implement Firebase auth integration.

Mike: I'll work on the login UI designs. Should have mockups ready by Wednesday.

John: Great. Sarah, can you also help with the dashboard API once auth is done?

Sarah: Sure, but I'll need the database schema finalized first.

Mike: I have some concerns about the current color scheme. Users might find it hard to read.

John: Let's schedule a design review for Thursday. Mike, can you prepare alternatives?

Mike: Absolutely. I'll have 3 options ready.

Action items:
- Sarah: Implement Firebase authentication (Due: January 18)
- Mike: Create login UI mockups (Due: January 17)  
- Mike: Prepare color scheme alternatives (Due: January 18)
- John: Schedule design review meeting (Due: January 16)
- Sarah: Review database schema requirements (Due: January 16)
`;

/**
 * Example function showing how to process a meeting transcript
 */
export async function processExampleMeeting() {
  try {
    const geminiService = getGeminiService();
    
    console.log('Processing meeting transcript...');
    console.log('Transcript length:', sampleTranscript.length, 'characters');
    
    // Generate the prompt (this is what would be sent to Gemini)
    const prompt = geminiService.constructPrompt(sampleTranscript);
    console.log('\nGenerated prompt preview:');
    console.log(prompt.substring(0, 200) + '...');
    
    // In a real application, this would call the Gemini API
    // const result = await geminiService.processTranscript(sampleTranscript);
    
    console.log('\nNote: To actually process the transcript, you need to:');
    console.log('1. Set NEXT_PUBLIC_GEMINI_API_KEY environment variable');
    console.log('2. Call: await geminiService.processTranscript(transcript)');
    console.log('3. The result will contain summary and actionItems');
    
    return {
      success: true,
      message: 'Example completed successfully'
    };
    
  } catch (error) {
    console.error('Error processing meeting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Example of expected AI response structure
export const exampleAIResponse = {
  summary: `The sprint planning meeting focused on implementing user authentication and beginning dashboard development. Sarah will lead the backend authentication work using Firebase, while Mike handles UI design and explores color scheme improvements. Key dependencies include finalizing the database schema and conducting a design review.`,
  actionItems: [
    {
      description: 'Implement Firebase authentication backend',
      owner: 'Sarah',
      deadline: new Date('2024-01-18'),
      priority: 'high' as const
    },
    {
      description: 'Create login UI mockups',
      owner: 'Mike', 
      deadline: new Date('2024-01-17'),
      priority: 'high' as const
    },
    {
      description: 'Prepare color scheme alternatives',
      owner: 'Mike',
      deadline: new Date('2024-01-18'), 
      priority: 'medium' as const
    },
    {
      description: 'Schedule design review meeting',
      owner: 'John',
      deadline: new Date('2024-01-16'),
      priority: 'medium' as const
    },
    {
      description: 'Review database schema requirements',
      owner: 'Sarah',
      deadline: new Date('2024-01-16'),
      priority: 'high' as const
    }
  ],
  confidence: 0.9
};

// Run example if this file is executed directly
if (require.main === module) {
  processExampleMeeting().then(result => {
    console.log('\nExample result:', result);
  });
}