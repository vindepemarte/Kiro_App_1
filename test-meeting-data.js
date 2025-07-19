// Quick test to validate meeting data processing
const testMeeting1 = `# Weekly Team Meeting - January 17, 2025

## Attendees
- John Smith (Project Manager)
- Sarah Johnson (Developer)

## Action Items Discussed
- John will finalize the project timeline by January 25th
- Sarah needs to complete the API integration by next Friday
- Review budget allocation - due by end of month
- Schedule client presentation for February 1st

## Next Steps
Follow up on all action items next week.`;

const testMeeting2 = `Project Phoenix - Bi-Weekly Review Meeting - 2025-07-24

Attendees:
* Sarah Chen (SC) - Head of Product
* Mark Johnson (MJ) - Engineering Lead
* Emily White (EW) - Marketing Manager
* Tom Davies (TD) - QA Lead
* Liam Green (LG) - Sales Director

[10:00 AM] Sarah Chen: Good morning, team. Welcome to our bi-weekly Project Phoenix review. Today, we'll cover sprint 3 progress, discuss the upcoming marketing campaign, and address any blockers. Let's start with engineering updates, Mark.

[10:05 AM] Mark Johnson: Thanks, Sarah. Sprint 3 is on track. We've completed 80% of the planned features, including the user authentication module and the basic dashboard UI. The main challenge has been integrating the new payment gateway, which is proving trickier than anticipated. We're currently looking at two alternative providers, Stripe and Adyen. I'd like to get a decision on which one to proceed with by end of day tomorrow, July 25th, so we don't delay further.

[10:15 AM] Sarah Chen: Okay, Mark. Liam, from a sales perspective, do you have a preference between Stripe and Adyen, considering our target markets and potential transaction volumes? We need something reliable and scalable.

[10:18 AM] Liam Green: Both are solid, Sarah. Stripe is generally easier for quick integration, but Adyen has better global coverage, especially in some of our emerging markets. I'll quickly check with our finance team regarding transaction fees and international settlement capabilities for both. I'll get back to you and Mark with a recommendation by 3 PM today.

[10:25 AM] Sarah Chen: Perfect, Liam. Please make that a high priority. Mark, once we have that decision, ensure your team prioritizes the chosen integration. Now, moving on to QA, Tom, how's testing going for the completed features?

[10:30 AM] Tom Davies: Testing is progressing well. We've identified a few minor bugs in the dashboard UI, mostly related to responsiveness on smaller screens. Nothing critical, but they need to be addressed before the next release. I'll compile a detailed bug report and share it with Mark's team by EOD Friday, July 26th.

[10:35 AM] Mark Johnson: Understood, Tom. We'll allocate resources to fix those next week.

[10:38 AM] Sarah Chen: Great. Emily, marketing campaign updates?

[10:40 AM] Emily White: Yes. We've finalized the core messaging for the pre-launch campaign. The next step is to create the landing page content and social media assets. We're planning to run a small A/B test on two different headlines. I'll need the finalized feature list from product by August 1st to ensure our messaging is accurate. Also, we're looking into influencer partnerships. Liam, could you provide some contacts for potential industry influencers by August 5th?

[10:48 AM] Liam Green: Influencer contacts, got it. I have a few in mind from previous campaigns. I'll send those over to Emily by August 5th.

[10:50 AM] Sarah Chen: Emily, I'll make sure you get that feature list by August 1st. Please ensure the landing page design aligns with our brand guidelines, David. David, can you review the initial mockups for the landing page that Emily's team will produce?

[10:55 AM] David: Yes, I can definitely review the landing page mockups for brand alignment and UX consistency. Emily, please send them my way as soon as they're ready. I'll aim to provide feedback within 2 business days of receiving them.

[11:00 AM] Sarah Chen: Excellent. One last thing, we need to start planning for our Q4 budget review. I'll send out a separate calendar invite for that next week. Mark, please prepare a high-level estimate for the remaining development work for Project Phoenix by August 15th. Emily, I'll need a preliminary marketing budget forecast for Q4 by the same date.

[11:05 AM] Mark Johnson: Will do, Sarah. High-level estimate for remaining dev work by August 15th.

[11:07 AM] Emily White: And I'll get the Q4 marketing budget forecast to you by August 15th.

[11:10 AM] Sarah Chen: Perfect. Any other urgent business or blockers before we wrap up?

[11:12 AM] Tom Davies: Just a quick question on the mobile app. Is there any update on starting development for the iOS and Android versions? Our team is getting ready for that.

[11:15 AM] Sarah Chen: Good question, Tom. We're still prioritizing the web platform for the initial launch. Mobile app development will likely begin in Q4. I'll provide a more concrete timeline in our next product roadmap update.

[11:18 AM] Liam Green: Just a thought, for the payment gateway decision, should we also consider potential regional legal requirements for data processing? Some countries have specific rules.

[11:20 AM] Sarah Chen: That's a very valid point, Liam. Mark, when you're making your final recommendation on the payment gateway, please ensure legal compliance, especially regarding data processing and GDPR, is a key consideration. Maybe loop in our legal counsel, Maria, for a quick review before finalization.

[11:22 AM] Mark Johnson: Good call. I'll add that to my checklist for the payment gateway decision. I'll reach out to Maria.

[11:25 AM] Sarah Chen: Alright, team. Great progress today. Let's stick to these action items. Our next bi-weekly review will be on August 7th. Thanks, everyone!`;

console.log('Test Meeting 1 Length:', testMeeting1.length);
console.log('Test Meeting 2 Length:', testMeeting2.length);
console.log('Both meetings are under 10MB limit:', testMeeting1.length < 10485760 && testMeeting2.length < 10485760);

// Test title extraction
function extractTitle(content, fileName) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length > 0) {
    const firstLine = lines[0];
    
    if (firstLine.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '').trim();
    }
    
    if (firstLine.length <= 100) {
      return firstLine;
    }
  }
  
  return fileName.replace(/\.[^/.]+$/, '');
}

console.log('Meeting 1 Title:', extractTitle(testMeeting1, 'meeting1.txt'));
console.log('Meeting 2 Title:', extractTitle(testMeeting2, 'meeting2.txt'));