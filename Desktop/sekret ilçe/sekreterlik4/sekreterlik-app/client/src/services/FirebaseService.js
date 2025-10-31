import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { encryptObject, decryptObject, SENSITIVE_FIELDS } from '../utils/crypto';

/**
 * Firebase Firestore Service
 * Tüm veriler şifrelenmiş olarak kaydedilir ve okunur
 */
class FirebaseService {
  /**
   * Veriyi Firestore'a şifrelenmiş olarak kaydeder
   * @param {string} collectionName - Koleksiyon adı
   * @param {string} docId - Doküman ID (opsiyonel, yoksa otomatik oluşturulur)
   * @param {object} data - Kaydedilecek veri
   * @param {boolean} encrypt - Şifreleme yapılsın mı (default: true)
   * @returns {Promise<string>} Doküman ID
   */
  static async create(collectionName, docId, data, encrypt = true) {
    try {
      const docRef = doc(db, collectionName, docId || Date.now().toString());
      
      // Şifreleme yapılıyorsa hassas alanları şifrele
      const dataToSave = encrypt 
        ? encryptObject(data, SENSITIVE_FIELDS)
        : data;
      
      // Timestamp ekle
      const finalData = {
        ...dataToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(docRef, finalData);
      return docRef.id;
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Dokümanı günceller
   * @param {string} collectionName - Koleksiyon adı
   * @param {string} docId - Doküman ID
   * @param {object} data - Güncellenecek veri
   * @param {boolean} encrypt - Şifreleme yapılsın mı
   * @returns {Promise<void>}
   */
  static async update(collectionName, docId, data, encrypt = true) {
    try {
      const docRef = doc(db, collectionName, docId);
      
      // Şifreleme yapılıyorsa hassas alanları şifrele
      const dataToUpdate = encrypt 
        ? encryptObject(data, SENSITIVE_FIELDS)
        : data;
      
      const finalData = {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, finalData);
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Dokümanı okur ve çözer
   * @param {string} collectionName - Koleksiyon adı
   * @param {string} docId - Doküman ID
   * @param {boolean} decrypt - Çözme yapılsın mı
   * @returns {Promise<object|null>} Doküman verisi
   */
  static async getById(collectionName, docId, decrypt = true) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      let data = { 
        id: docSnap.id, 
        ...docSnap.data() 
      };
      
      // Timestamp'leri dönüştür
      if (data.createdAt?.toDate) {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      if (data.updatedAt?.toDate) {
        data.updatedAt = data.updatedAt.toDate().toISOString();
      }
      
      // Çözme yapılıyorsa hassas alanları çöz
      return decrypt 
        ? decryptObject(data, SENSITIVE_FIELDS)
        : data;
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Koleksiyondaki tüm dokümanları okur ve çözer
   * @param {string} collectionName - Koleksiyon adı
   * @param {object} options - Query seçenekleri (where, orderBy, limit)
   * @param {boolean} decrypt - Çözme yapılsın mı
   * @returns {Promise<Array>} Doküman listesi
   */
  static async getAll(collectionName, options = {}, decrypt = true) {
    try {
      const collectionRef = collection(db, collectionName);
      let q = collectionRef;
      
      // Where clauses
      if (options.where) {
        options.where.forEach(w => {
          q = query(q, where(w.field, w.operator, w.value));
        });
      }
      
      // Order by
      if (options.orderBy) {
        q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
      }
      
      // Limit
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(q);
      const docs = [];
      
      querySnapshot.forEach((docSnap) => {
        let data = { 
          id: docSnap.id, 
          ...docSnap.data() 
        };
        
        // Timestamp'leri dönüştür
        if (data.createdAt?.toDate) {
          data.createdAt = data.createdAt.toDate().toISOString();
        }
        if (data.updatedAt?.toDate) {
          data.updatedAt = data.updatedAt.toDate().toISOString();
        }
        
        // Çözme yapılıyorsa hassas alanları çöz
        docs.push(decrypt 
          ? decryptObject(data, SENSITIVE_FIELDS)
          : data
        );
      });
      
      return docs;
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Dokümanı siler
   * @param {string} collectionName - Koleksiyon adı
   * @param {string} docId - Doküman ID
   * @returns {Promise<void>}
   */
  static async delete(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Belirli bir alana göre doküman bulur
   * @param {string} collectionName - Koleksiyon adı
   * @param {string} field - Alan adı
   * @param {any} value - Değer
   * @param {boolean} decrypt - Çözme yapılsın mı
   * @returns {Promise<Array>} Doküman listesi
   */
  static async findByField(collectionName, field, value, decrypt = true) {
    return this.getAll(
      collectionName, 
      { 
        where: [{ field, operator: '==', value }] 
      }, 
      decrypt
    );
  }
}

export default FirebaseService;

