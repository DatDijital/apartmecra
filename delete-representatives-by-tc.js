// Script to delete representatives by encrypted TC numbers
// Run this in browser console on the RepresentativesPage

const encryptedTc1 = 'U2FsdGVkX1/6YcL4saOEDBjQNmbPe3YVi6ZTmGH31dY=';
const encryptedTc2 = 'U2FsdGVkX1+d/GcVS8sMBJvJPxn2dv8izhL1LzkX1xc=';

// Import decryptData from crypto module
// This script should be run in browser console after importing decryptData
// Or we can use the ApiService directly

async function deleteRepresentativesByEncryptedTc() {
  try {
    // Get decryptData function
    const { decryptData } = await import('./sekreterlik-app/client/src/utils/crypto.js');
    const ApiService = (await import('./sekreterlik-app/client/src/utils/ApiService.js')).default;
    
    // Decrypt TC numbers
    const decryptedTc1 = decryptData(encryptedTc1);
    const decryptedTc2 = decryptData(encryptedTc2);
    
    console.log('Decrypted TC 1:', decryptedTc1);
    console.log('Decrypted TC 2:', decryptedTc2);
    
    // Get all representatives
    const [neighborhoodReps, villageReps] = await Promise.all([
      ApiService.getNeighborhoodRepresentatives(),
      ApiService.getVillageRepresentatives()
    ]);
    
    // Find and delete neighborhood representatives
    const neighborhoodRepToDelete = neighborhoodReps.find(rep => {
      const repTc = typeof rep.tc === 'string' ? decryptData(rep.tc) : rep.tc;
      return String(repTc) === String(decryptedTc1) || String(repTc) === String(decryptedTc2);
    });
    
    // Find and delete village representatives
    const villageRepToDelete = villageReps.find(rep => {
      const repTc = typeof rep.tc === 'string' ? decryptData(rep.tc) : rep.tc;
      return String(repTc) === String(decryptedTc1) || String(repTc) === String(decryptedTc2);
    });
    
    if (neighborhoodRepToDelete) {
      console.log('Deleting neighborhood representative:', neighborhoodRepToDelete);
      await ApiService.deleteNeighborhoodRepresentative(neighborhoodRepToDelete.id);
      console.log('✅ Neighborhood representative deleted');
    }
    
    if (villageRepToDelete) {
      console.log('Deleting village representative:', villageRepToDelete);
      await ApiService.deleteVillageRepresentative(villageRepToDelete.id);
      console.log('✅ Village representative deleted');
    }
    
    if (!neighborhoodRepToDelete && !villageRepToDelete) {
      console.log('❌ No representatives found with these TC numbers');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteRepresentativesByEncryptedTc();

