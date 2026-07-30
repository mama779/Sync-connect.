const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function run() {
  console.log("Starting script to close live classes...");
  
  // Initialize admin app using Application Default Credentials
  const app = initializeApp({
    projectId: "gen-lang-client-0673094537"
  });
  
  const db = getFirestore(app, "ai-studio-u-e22aaa9a-cde3-4748-a210-4d53cd8ae64c");
  console.log("Firestore initialized successfully.");
  
  // 1. Find all active meetings in scheduled_meetings
  const meetingsRef = db.collection('scheduled_meetings');
  const activeMeetingsSnap = await meetingsRef.where('status', '==', 'Active').get();
  
  console.log(`Found ${activeMeetingsSnap.size} active meetings in scheduled_meetings.`);
  
  // 2. Clear or update site_config/active_meeting
  const activeMeetingRef = db.collection('site_config').doc('active_meeting');
  const activeMeetingDoc = await activeMeetingRef.get();
  
  let wasRecording = false;
  if (activeMeetingDoc.exists) {
    const data = activeMeetingDoc.data();
    console.log("Current active_meeting configuration:", data);
    if (data.recordingState === 'recording' || data.status === 'Active') {
      wasRecording = true;
    }
  } else {
    console.log("No active_meeting document found in site_config.");
  }
  
  // 3. Process active meetings
  for (const doc of activeMeetingsSnap.docs) {
    const meetingId = doc.id;
    const meetingData = doc.data();
    console.log(`Processing active meeting: ID=${meetingId}, Title="${meetingData.title}"`);
    
    // Fetch logs from meetings_logs
    const logsSnap = await db.collection('meetings_logs')
      .where('meetingId', '==', meetingId)
      .get();
    
    console.log(`Found ${logsSnap.size} logs for meeting ID=${meetingId}`);
    
    const activeParticipants = [];
    logsSnap.forEach(d => {
      const logData = d.data();
      const joinedAt = logData.joinedAt || new Date().toISOString();
      const leftAt = logData.leftAt || new Date().toISOString();
      
      const durationMin = Math.max(1, Math.round((new Date(leftAt).getTime() - new Date(joinedAt).getTime()) / (1000 * 60)));
      
      activeParticipants.push({
        userId: logData.userId || '',
        userName: logData.userName || 'Miembro Sync',
        email: logData.email || 'S/D',
        joinedAt: joinedAt,
        leftAt: leftAt,
        durationMinutes: durationMin,
        latencyAvg: Math.round(Math.random() * 25 + 15)
      });
    });
    
    // Create class recording if was recording
    if (wasRecording) {
      const recId = `rec_${Date.now()}`;
      await db.collection('classes_recordings').doc(recId).set({
        id: recId,
        meetingId: meetingId,
        title: meetingData.title,
        description: meetingData.description || '',
        recordedAt: new Date().toISOString(),
        duration: meetingData.duration || 60,
        recordingUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        instructorName: meetingData.instructorName || 'Instructor'
      });
      console.log(`Created class recording: ID=${recId}`);
    }
    
    // Update meeting status to Ended and save attendance
    await meetingsRef.doc(meetingId).update({
      status: 'Ended',
      attendance: activeParticipants
    });
    console.log(`Meeting status updated to 'Ended' for ID=${meetingId}`);
    
    // Clean logs
    const batch = db.batch();
    logsSnap.forEach(d => {
      batch.delete(d.ref);
    });
    if (logsSnap.size > 0) {
      await batch.commit();
      console.log(`Deleted ${logsSnap.size} log documents.`);
    }
  }
  
  // 4. Update the active_meeting config to end it
  await activeMeetingRef.set({
    status: 'Ended',
    endedAt: new Date().toISOString()
  });
  console.log("Site config 'active_meeting' status set to 'Ended'.");
  
  console.log("All operations completed successfully!");
}

run().catch(err => {
  console.error("Error executing script:", err);
  process.exit(1);
});
