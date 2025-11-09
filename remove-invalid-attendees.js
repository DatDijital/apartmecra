// Script to remove invalid attendees from events
// Removes attendees with IDs: '1762645941232_qxutglj9a' and null

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INVALID_ATTENDEE_IDS = ['1762645941232_qxutglj9a', null, 'null'];

async function removeInvalidAttendees() {
  try {
    console.log('Fetching all events...');
    const eventsRef = collection(db, 'events');
    const eventsSnapshot = await getDocs(eventsRef);
    
    let totalEvents = 0;
    let updatedEvents = 0;
    
    eventsSnapshot.forEach(async (eventDoc) => {
      totalEvents++;
      const eventData = eventDoc.data();
      const eventId = eventDoc.id;
      
      if (!eventData.attendees || !Array.isArray(eventData.attendees)) {
        console.log(`Event ${eventId} has no attendees array, skipping...`);
        return;
      }
      
      const originalAttendees = eventData.attendees;
      const validAttendees = originalAttendees.filter(attendee => {
        const memberId = attendee.memberId;
        
        // Check if memberId is invalid
        if (INVALID_ATTENDEE_IDS.includes(memberId) || 
            memberId === null || 
            memberId === undefined ||
            String(memberId) === 'null' ||
            String(memberId) === '1762645941232_qxutglj9a') {
          console.log(`Removing invalid attendee from event ${eventId}:`, memberId);
          return false;
        }
        
        return true;
      });
      
      if (validAttendees.length !== originalAttendees.length) {
        console.log(`Event ${eventId}: Removing ${originalAttendees.length - validAttendees.length} invalid attendees`);
        console.log(`  Original: ${originalAttendees.length} attendees`);
        console.log(`  Valid: ${validAttendees.length} attendees`);
        
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
          attendees: validAttendees
        });
        
        updatedEvents++;
        console.log(`✅ Updated event ${eventId}`);
      }
    });
    
    console.log(`\n✅ Process completed!`);
    console.log(`Total events checked: ${totalEvents}`);
    console.log(`Events updated: ${updatedEvents}`);
    
  } catch (error) {
    console.error('Error removing invalid attendees:', error);
  }
}

removeInvalidAttendees();

