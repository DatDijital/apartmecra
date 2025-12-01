// Script to clean up invalid attendees from all events in Firebase
// This script removes attendees with IDs: '1762645941232_qxutglj9a' and null

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './sekreterlik-app/client/src/config/firebase.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INVALID_ATTENDEE_IDS = ['1762645941232_qxutglj9a', null, 'null', undefined];

async function cleanupInvalidAttendees() {
  try {
    console.log('🔍 Fetching all events from Firebase...');
    const eventsRef = collection(db, 'events');
    const eventsSnapshot = await getDocs(eventsRef);
    
    let totalEvents = 0;
    let updatedEvents = 0;
    let totalRemoved = 0;
    
    const updatePromises = [];
    
    eventsSnapshot.forEach((eventDoc) => {
      totalEvents++;
      const eventData = eventDoc.data();
      const eventId = eventDoc.id;
      
      if (!eventData.attendees || !Array.isArray(eventData.attendees)) {
        console.log(`⏭️  Event ${eventId} has no attendees array, skipping...`);
        return;
      }
      
      const originalAttendees = eventData.attendees;
      const validAttendees = originalAttendees.filter(attendee => {
        const memberId = attendee?.memberId;
        
        // Check if memberId is invalid
        if (INVALID_ATTENDEE_IDS.includes(memberId) || 
            memberId === null || 
            memberId === undefined ||
            String(memberId) === 'null' ||
            String(memberId) === '1762645941232_qxutglj9a') {
          return false;
        }
        
        return true;
      });
      
      if (validAttendees.length !== originalAttendees.length) {
        const removedCount = originalAttendees.length - validAttendees.length;
        totalRemoved += removedCount;
        
        console.log(`🔧 Event ${eventId}: Removing ${removedCount} invalid attendees`);
        console.log(`   Original: ${originalAttendees.length} attendees`);
        console.log(`   Valid: ${validAttendees.length} attendees`);
        
        const eventRef = doc(db, 'events', eventId);
        updatePromises.push(
          updateDoc(eventRef, {
            attendees: validAttendees
          }).then(() => {
            updatedEvents++;
            console.log(`✅ Updated event ${eventId}`);
          }).catch(error => {
            console.error(`❌ Error updating event ${eventId}:`, error);
          })
        );
      }
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    console.log(`\n✅ Cleanup completed!`);
    console.log(`📊 Total events checked: ${totalEvents}`);
    console.log(`🔧 Events updated: ${updatedEvents}`);
    console.log(`🗑️  Total invalid attendees removed: ${totalRemoved}`);
    
  } catch (error) {
    console.error('❌ Error cleaning up invalid attendees:', error);
  }
}

// Run the cleanup
cleanupInvalidAttendees()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

